/* =========================================================
   Synora — keeps MySQL in step with localStorage.

   localStorage stays the app's working copy: every screen reads
   and writes it exactly as before. This module watches those
   writes (storage.onWrite) and, while signed in to the API,
   sends each changed collection to MySQL:

     write → mark the collection dirty → wait 400ms for the burst
     to settle → PUT /api/data with every dirty collection at once

   Only one request is in flight at a time. A failed save keeps the
   collections dirty and tries again a few seconds later.

   A change that cannot reach MySQL (the API was not running, or a
   save failed) marks the account "unsynced" in this browser. The
   next sign-in through the API then uploads this browser's copy
   instead of loading the database's older one over it.
   ========================================================= */

import { onWrite, readJSON, writeJSON, session, userKey, KEYS } from "./storage.js";
import { api } from "./api.js";
import { demo } from "./demo.js";

/* The per-user collections that have a table in MySQL. The onboarding
   draft is left out: it is a scratch copy that onboarding throws away. */
export const SYNCED = [
  "profile", "meta", "subjects", "tasks", "notes", "timetable",
  "attendance", "cgpa", "achievements", "notifications",
];

const DEBOUNCE_MS = 400;
const RETRY_MS = 5000;

const dirty = new Set();       // full localStorage keys waiting to be saved
let timer = null;
let inflight = null;
let paused = 0;

/* Written straight to localStorage (not through storage.js), so setting
   the flag is not itself a change to sync. */
const unsyncedKey = (username) => "synora-unsynced:" + username;

export function hasUnsynced(username) {
  return localStorage.getItem(unsyncedKey(username)) !== null;
}

function markUnsynced(username) {
  if (username) localStorage.setItem(unsyncedKey(username), new Date().toISOString());
}

const usernameOf = (key) => key.split(":")[1];

function schedule(delay = DEBOUNCE_MS) {
  clearTimeout(timer);
  timer = setTimeout(flush, delay);
}

/* key "synora:<username>:<collection>" → collection name, or null. */
function collectionOf(key) {
  const prefix = "synora:" + session.username() + ":";
  if (!key.startsWith(prefix)) return null;
  const name = key.slice(prefix.length);
  return SYNCED.includes(name) ? name : null;
}

/* Send everything dirty now. Resolves to true once MySQL has it all. */
export async function flush() {
  clearTimeout(timer);
  while (inflight) await inflight;
  const token = api.token();
  if (!dirty.size) return true;
  if (!token) return false;

  const keys = [...dirty];
  dirty.clear();
  const collections = {};
  for (const key of keys) collections[key.slice(key.lastIndexOf(":") + 1)] = readJSON(key, null);

  inflight = api.save(collections, token)
    .then((res) => {
      if (res.ok) return true;
      if (res.status === 401) {                            // session gone: carry on locally
        api.clearToken();
        keys.forEach((k) => markUnsynced(usernameOf(k)));
        return false;
      }
      throw new Error("save failed: " + res.status);
    })
    .catch((err) => {
      console.warn("Synora: could not save to the database, will retry", err);
      keys.forEach((k) => { dirty.add(k); markUnsynced(usernameOf(k)); });
      schedule(RETRY_MS);
      return false;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/* Upload every collection of the signed-in user: the first sync of an
   account that so far only lived in this browser, or one with unsynced
   changes. */
export async function pushAll() {
  const username = session.username();
  if (!username) return;
  SYNCED.forEach((name) => dirty.add(userKey(name, username)));
  if (await flush()) localStorage.removeItem(unsyncedKey(username));
}

/* Write what MySQL sent back into localStorage without echoing it
   straight back to the server. */
export function applyServerData(username, data) {
  paused += 1;
  try {
    SYNCED.forEach((name) => {
      if (data && name in data) writeJSON(userKey(name, username), data[name]);
    });
  } finally {
    paused -= 1;
  }
}

/* Run fn with syncing switched off (used while signing in). */
export function withoutSync(fn) {
  paused += 1;
  try { return fn(); } finally { paused -= 1; }
}

/* Signing out: save what is pending, then end the API session. */
async function endSession() {
  const token = api.token();
  if (!token) return;
  await flush();
  api.clearToken();
  api.logout(token).catch(() => {});
}

onWrite((key) => {
  if (paused) return;
  if (key === KEYS.session) {
    if (!session.username()) endSession();
    return;
  }
  if (!collectionOf(key) || session.username() === demo.username) return;
  if (!api.token()) {
    markUnsynced(session.username());
    return;
  }
  dirty.add(key);
  schedule();
});

/* Closing or reloading the tab inside the debounce window would lose the
   last change, so send it on the way out. */
window.addEventListener("pagehide", () => {
  const token = api.token();
  if (!dirty.size || !token) return;
  const collections = {};
  dirty.forEach((key) => { collections[key.slice(key.lastIndexOf(":") + 1)] = readJSON(key, null); });
  dirty.clear();
  api.saveOnExit(collections, token);
});
