/* =========================================================
   Reading a timetable photo or PDF with an AI model.

   Two providers, picked by which key the server has:
     GEMINI_API_KEY     Google Gemini (free tier from Google AI Studio)
                        model: GEMINI_MODEL, default gemini-flash-latest
     ANTHROPIC_API_KEY  Anthropic Claude
                        model: SCAN_MODEL, default claude-sonnet-5-5
   Gemini wins when both are set. Either way the model gets the
   picture and a prompt, and answers with JSON text; this returns
   that text (the caller parses and checks it).
   ========================================================= */

export const scanProvider = () =>
  process.env.GEMINI_API_KEY ? "gemini" : process.env.ANTHROPIC_API_KEY ? "anthropic" : null;

/* reason: "key" (rejected key), "quota" (rate or free-tier limit),
   "model" (model not available), or "failed". */
export class ScanError extends Error {
  constructor(message, reason = "failed") { super(message); this.reason = reason; }
}

function reasonFor(status, text) {
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) return "quota";
  if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(text)) return "key";
  if (status === 404 || /not found|is not supported/i.test(text)) return "model";
  return "failed";
}

/* The chosen model first; if Google says it isn't available or has no
   free allowance on this key, the Flash-Lite model next. */
async function gemini(mime, base64, prompt) {
  const models = [...new Set([process.env.GEMINI_MODEL || "gemini-flash-latest", "gemini-flash-lite-latest"])];
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  let last;
  for (const model of models) {
    const r = await fetch(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(50000),
    });
    if (r.ok) {
      const body = await r.json();
      const parts = (body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts) || [];
      return parts.map((p) => p.text || "").join("");
    }
    const text = (await r.text()).slice(0, 400);
    last = new ScanError(`Gemini ${model} ${r.status}: ${text}`, reasonFor(r.status, text));
    if (last.reason === "key") break;          // another model won't help
  }
  throw last;
}

async function anthropic(mime, base64, prompt) {
  const media = { type: "base64", media_type: mime, data: base64 };
  const part = mime === "application/pdf" ? { type: "document", source: media } : { type: "image", source: media };
  const r = await fetch((process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.SCAN_MODEL || "claude-sonnet-5-5",
      max_tokens: 6000,
      messages: [{ role: "user", content: [part, { type: "text", text: prompt }] }],
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!r.ok) {
    const text = (await r.text()).slice(0, 400);
    throw new ScanError("Anthropic " + r.status + ": " + text, reasonFor(r.status, text));
  }
  const body = await r.json();
  return (body.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
}

/* The model's answer as text. Throws ScanError (or a network error). */
export function readTimetable(mime, bytes, prompt) {
  const base64 = bytes.toString("base64");
  return scanProvider() === "gemini" ? gemini(mime, base64, prompt) : anthropic(mime, base64, prompt);
}
