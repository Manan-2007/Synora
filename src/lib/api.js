/* =========================================================
   Synora — client for the local MySQL API (server/).

   The API only exists when it is running on this computer
   (npm run server); the deployed site has none. Every caller
   checks available() first and carries on with localStorage
   alone when it says no.
   ========================================================= */

/* Kept apart from the synora-* keys on purpose: it is written straight
   to localStorage, so saving it never triggers a sync. */
const TOKEN_KEY = "synora-api-token";

async function request(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch("/api" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const isJSON = (res.headers.get("content-type") || "").includes("application/json");
  return { ok: res.ok, status: res.status, body: isJSON ? await res.json() : null };
}

export const api = {
  /* True when the API answers and can reach MySQL. Checked fresh each
     time, so starting the server later is picked up on the next sign-in.
     On Vercel /api/health is rewritten to index.html — HTML, not JSON —
     which also reads as "no API".
     The wait is generous on purpose: an idle serverless API plus a fresh
     database connection can take a few seconds to answer the first time.
     Without a database the answer comes back at once either way. */
  async available() {
    try {
      const res = await fetch("/api/health", { signal: AbortSignal.timeout(10000) });
      const isJSON = (res.headers.get("content-type") || "").includes("application/json");
      return res.ok && isJSON && (await res.json()).ok === true;
    } catch {
      return false;
    }
  },

  token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  signup: (account) => request("POST", "/signup", account),
  login: (username, password) => request("POST", "/login", { username, password }),
  logout: (token) => request("POST", "/logout", undefined, token),
  save: (collections, token) => request("PUT", "/data", { collections }, token),

  /* Last-chance save while the page is closing: keepalive lets the request
     finish after the tab is gone. */
  saveOnExit(collections, token) {
    fetch("/api/data", {
      method: "PUT",
      keepalive: true,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ collections }),
    }).catch(() => {});
  },
};
