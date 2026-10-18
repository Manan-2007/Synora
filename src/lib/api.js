/* =========================================================
   Synora — client for the local MySQL API (server/).

   The API only exists when it is running on this computer
   (npm run server); the deployed site has none. Every caller
   checks available() first and carries on with localStorage
   alone when it says no.
   ========================================================= */

import { session } from "./storage.js";

/* The database session: { username, token }. Kept apart from the synora-*
   keys on purpose: it is written straight to localStorage, so saving it
   never triggers a sync. It records WHOSE session it is, so one account's
   token can never be used for another account's data. */
const TOKEN_KEY = "synora-api-token";

const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

function readSession() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (raw === null) return null;
    const value = JSON.parse(raw);
    if (value && typeof value.token === "string" && typeof value.username === "string") return value;
  } catch {
    // Not JSON: a bare token from an earlier version, which did not say whose it was.
  }
  localStorage.removeItem(TOKEN_KEY);   // unknown owner: drop it, the account re-links itself
  return null;
}

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
     A dev server without the API answers with index.html — HTML, not
     JSON — which also reads as "no API".
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

  /* { username, token } of the stored database session, whoever it belongs to. */
  session() {
    try { return readSession(); } catch { return null; }
  },
  /* The token, but only when it belongs to the account signed in here. */
  token() {
    const s = api.session();
    return s && same(s.username, session.username()) ? s.token : null;
  },
  setToken(token, username) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ username, token }));
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  signup: (account) => request("POST", "/signup", account),
  login: (username, key, legacyKey) => request("POST", "/login", { username, key, legacyKey }),
  logout: (token) => request("POST", "/logout", undefined, token),
  /* `changes`: per collection, { upsert: [items], delete: [ids] } (profile and
     meta: the whole object). `username` lets the server refuse a save
     addressed to another account. */
  save: (username, changes, token) => request("PUT", "/data", { username, changes }, token),
  load: (token) => request("GET", "/data", undefined, token),
  contact: (message) => request("POST", "/contact", message),
  changePassword: (currentKey, legacyKey, newKey, token) =>
    request("POST", "/password", { currentKey, legacyKey, newKey }, token),
  deleteAccount: (key, legacyKey, token) => request("POST", "/account/delete", { key, legacyKey }, token),
  forgotPassword: (who) => request("POST", "/password/forgot", { who }),
  resetPassword: (token, username, newKey) => request("POST", "/password/reset", { token, username, newKey }),

  /* Last-chance save while the page is closing: keepalive lets the request
     finish after the tab is gone. */
  saveOnExit(username, changes, token) {
    fetch("/api/data", {
      method: "PUT",
      keepalive: true,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ username, changes }),
    }).catch(() => {});
  },
};
