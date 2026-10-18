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

export class ScanError extends Error {}

async function gemini(mime, base64, prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  const r = await fetch(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!r.ok) throw new ScanError("Gemini " + r.status + ": " + (await r.text()).slice(0, 300));
  const body = await r.json();
  const parts = (body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts) || [];
  return parts.map((p) => p.text || "").join("");
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
  if (!r.ok) throw new ScanError("Anthropic " + r.status + ": " + (await r.text()).slice(0, 300));
  const body = await r.json();
  return (body.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
}

/* The model's answer as text. Throws ScanError (or a network error). */
export function readTimetable(mime, bytes, prompt) {
  const base64 = bytes.toString("base64");
  return scanProvider() === "gemini" ? gemini(mime, base64, prompt) : anthropic(mime, base64, prompt);
}
