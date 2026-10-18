/* =========================================================
   Synora — keeps MySQL in step with localStorage.

   localStorage stays the app's working copy: every screen reads
   and writes it exactly as before. This module keeps it and the
   database in step, for the signed-in account.

   SAVING — by change, never by replacing a whole list
     For each account linked to the database this browser keeps a
     "base": the collections as they were when this browser and
     the database last agreed. A save sends only the difference
     between the working copy and the base (items added or edited,
     ids deleted). Items another device added are not in the base,
     so they are never deleted by a device that hasn't seen them.

       write → wait 400ms for the burst to settle → PUT /api/data
       with the changes → on success the base moves forward

   LOADING
     refresh() re-reads the account from the database (on load,
     when the tab comes back into view, every couple of minutes)
     and replaces the working copy — but only when nothing local
     is waiting to be saved, so an unsaved edit is never lost.

   OTHER TABS share localStorage: storage.js re-renders on their
   writes, and whichever tab made a change saves it.

   Failed saves are retried with growing gaps (5s … 60s); a save
   the server refuses as invalid is not retried in a loop.
   ========================================================= */

import { onWrite, readJSON, writeJSON, session, userKey, KEYS } from "./storage.js";
import { api } from "./api.js";
import { demo } from "./demo.js";

/* The per-user collections that have a table in MySQL. The onboarding
   draft is left out: it is a scratch copy that onboarding throws away. */
export const SYNCED = [
  "profile", "meta", "subjects", "tasks", "notes", "timetable",
  "attendance", "cgpa", "achievements", "notifications", "semesters", "focus",
];
const WHOLE = new Set(["profile", "meta"]);   // one row each, saved whole

const DEBOUNCE_MS = 400;
const RETRY_MIN_MS = 5000;
const RETRY_MAX_MS = 60000;
const REFRESH_GAP_MS = 10000;

let timer = null;
let inflight = null;
let paused = 0;
let retryMs = RETRY_MIN_MS;
let localWrites = 0;          // bumps on every synced write, to spot edits made during a refresh
let lastRefresh = 0;
let currentUser = session.username();

/* ---- Status, for the indicator in the top bar ----
     "saved"    the database has everything
     "saving"   a change is on its way
     "offline"  a save failed; changes are kept here and retried
     "error"    the database refused a save; it stays on this device
     "local"    not connected to a database (none set up, or not linked
                yet): everything is kept on this device */
let status = api.token() ? "saved" : "local";
const statusListeners = new Set();

function setStatus(next) {
  if (next === status) return;
  status = next;
  statusListeners.forEach((fn) => fn());
}

export function syncStatus() {
  return status;
}

export function onSyncStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/* ---- The base (written straight to localStorage: not a change to sync) ---- */

const baseKey = (username, name) => "synora-base:" + username.toLowerCase() + ":" + name;
const linkedKey = (username) => "synora-base:" + username.toLowerCase();

/* True once this browser has synced the account with the database. */
export function isLinked(username) {
  return !!username && localStorage.getItem(linkedKey(username)) !== null;
}

function readBase(username, name) {
  try { return JSON.parse(localStorage.getItem(baseKey(username, name))); } catch { return null; }
}

function writeBase(username, name, value) {
  localStorage.setItem(baseKey(username, name), JSON.stringify(value));
  localStorage.setItem(linkedKey(username), new Date().toISOString());
}

/* Earlier versions marked accounts with changes the database never got. */
const legacyUnsyncedKey = (username) => "synora-unsynced:" + username;
export function hasLegacyUnsynced(username) {
  return localStorage.getItem(legacyUnsyncedKey(username)) !== null;
}

/* ---- Changes: working copy vs base ---- */

/* A list collection as { id → item }. cgpa keeps its rows in .subjects and
   achievements is { unlocked: { id: date } }, so both are unpacked. */
function itemsOf(name, value) {
  let list;
  if (name === "cgpa") list = value && Array.isArray(value.subjects) ? value.subjects : [];
  else if (name === "achievements") {
    list = Object.entries((value && value.unlocked) || {}).map(([id, unlockedAt]) => ({ id, unlockedAt }));
  } else list = Array.isArray(value) ? value : [];
  const map = new Map();
  list.forEach((item, i) => { if (item && item.id) map.set(item.id, { ...item, _pos: i }); });
  return map;
}

/* Everything that differs from the base, plus a snapshot of the working
   copy to become the new base once the save succeeds. With `all`, the base
   is treated as empty: the whole account is uploaded. */
function diff(username, all = false) {
  const changes = {};
  const snapshot = {};
  for (const name of SYNCED) {
    const current = readJSON(userKey(name, username), null);
    if (current === null) continue;
    const base = all ? null : readBase(username, name);
    if (WHOLE.has(name)) {
      if (JSON.stringify(current) !== JSON.stringify(base)) {
        changes[name] = current;
        snapshot[name] = current;
      }
      continue;
    }
    const now = itemsOf(name, current);
    const before = itemsOf(name, base);
    const upsert = [];
    for (const [id, item] of now) {
      const old = before.get(id);
      if (!old || JSON.stringify({ ...old, _pos: 0 }) !== JSON.stringify({ ...item, _pos: 0 })) upsert.push(item);
    }
    const del = [...before.keys()].filter((id) => !now.has(id));
    if (upsert.length || del.length) {
      changes[name] = { upsert, delete: del };
      snapshot[name] = current;
    }
  }
  return { changes, snapshot, empty: Object.keys(changes).length === 0 };
}

/* True when this browser has changes for the account the database lacks. */
export function hasPending(username) {
  return isLinked(username) && !diff(username).empty;
}

/* ---- Saving ---- */

function schedule(delay = DEBOUNCE_MS) {
  clearTimeout(timer);
  if (status !== "offline") setStatus("saving");
  timer = setTimeout(() => { flush(); }, delay);
}

/* Save what changed for the account that owns the database session.
   Resolves to true when the database has everything. */
export async function flush({ all = false } = {}) {
  clearTimeout(timer);
  while (inflight) await inflight;
  const owner = api.session();
  if (!owner) { setStatus("local"); return false; }
  if (!all && !isLinked(owner.username)) { setStatus("local"); return false; }   // linking finishes the job

  const { changes, snapshot, empty } = diff(owner.username, all);
  if (empty) {
    if (all) writeBase(owner.username, "profile", readJSON(userKey("profile", owner.username), null));
    setStatus("saved");
    return true;
  }
  setStatus("saving");

  inflight = api.save(owner.username, changes, owner.token)
    .then((res) => {
      if (res.ok) {
        for (const [name, value] of Object.entries(snapshot)) writeBase(owner.username, name, value);
        localStorage.removeItem(legacyUnsyncedKey(owner.username));
        retryMs = RETRY_MIN_MS;
        setStatus("saved");
        return true;
      }
      if (res.status === 401 || res.status === 409) {     // session gone or not this account's
        api.clearToken();                                  // the changes stay pending; the link restarts
        setStatus("local");
        return false;
      }
      if (res.status >= 400 && res.status < 500) {         // refused as invalid: retrying won't help
        console.warn("Synora: the database refused a save (" + res.status + ")");
        setStatus("error");
        return false;
      }
      throw new Error("save failed: " + res.status);
    })
    .catch((err) => {
      console.warn("Synora: could not save to the database, will retry", err);
      setStatus("offline");
      schedule(retryMs);
      retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
      return false;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/* ---- Loading ---- */

/* Replace the working copy with the database's, without echoing it back,
   and make it the new base. */
export function applyServerData(username, data) {
  paused += 1;
  try {
    SYNCED.forEach((name) => {
      if (data && name in data) {
        writeJSON(userKey(name, username), data[name]);
        writeBase(username, name, data[name]);
      }
    });
  } finally {
    paused -= 1;
  }
  setStatus("saved");
  /* The shared demo starts each day from fresh sample data. */
  if (same(session.username(), username) && demo.isCurrent() && demo.needsSeed()) demo.seed();
}

/* Re-read the signed-in account from the database. Pending changes are
   saved first; if anything is still pending, or an edit happens while the
   request is out, the working copy is left alone (the next refresh
   catches up). */
export async function refresh({ force = false, gap = REFRESH_GAP_MS } = {}) {
  const username = session.username();
  const owner = api.session();
  if (!username || !owner || !same(owner.username, username)) return false;
  if (!force && Date.now() - lastRefresh < gap) return false;
  lastRefresh = Date.now();

  if (isLinked(username) && !(await flush())) return false;
  const writesBefore = localWrites;
  let res;
  try {
    res = await api.load(owner.token);
  } catch {
    return false;
  }
  if (res.status === 401) { api.clearToken(); return false; }
  if (!res.ok || !res.body) return false;
  if (localWrites !== writesBefore || !same(session.username(), username)) return false;
  if (isLinked(username) && !diff(username).empty) return false;
  applyServerData(username, res.body.data);
  return true;
}

/* A fresh database session for `username`: bring the two copies into step.
     • linked before: save this browser's changes, then load the database's
     • never linked, but an earlier version left unsaved changes: upload
       everything, then load
     • otherwise: the database's copy wins */
export async function adoptSession(username, token, data) {
  api.setToken(token, username);
  if (isLinked(username)) {
    await flush();
    await refresh({ force: true });
  } else if (hasLegacyUnsynced(username)) {
    await flush({ all: true });
    await refresh({ force: true });
  } else {
    applyServerData(username, data);
  }
}

/* Upload the whole account: its first save to a brand-new database account. */
export async function uploadAll() {
  return flush({ all: true });
}

/* Run fn with syncing switched off (used while signing in). */
export function withoutSync(fn) {
  paused += 1;
  try { return fn(); } finally { paused -= 1; }
}

/* ---- Signing out ---- */

/* Save what is pending, end the database session, and — for an account the
   database holds — take its key and workspace off this browser, so the next
   person at a shared computer can't use them. Changes that could not be
   saved are kept (only the key goes) and upload at the next sign-in. A
   purely local account, never linked, keeps everything as before. */
async function endSession(username) {
  const owner = api.session();
  if (owner && same(owner.username, username)) {
    await flush();
    api.clearToken();
    api.logout(owner.token).catch(() => {});
  }
  if (!isLinked(username)) return;

  const users = readJSON(KEYS.users, []);
  const kept = users.filter((u) => !same(u.username, username));
  const pending = hasPending(username);
  if (pending) {
    users.forEach((u) => { if (same(u.username, username)) delete u.passHash; });
    localStorage.setItem(KEYS.users, JSON.stringify(users));
    return;
  }
  localStorage.setItem(KEYS.users, JSON.stringify(kept));
  const prefixes = ["synora:" + username + ":", "synora-base:" + username.toLowerCase(), legacyUnsyncedKey(username)];
  Object.keys(localStorage)
    .filter((k) => prefixes.some((p) => k === p || k.startsWith(p)))
    .forEach((k) => localStorage.removeItem(k));
}

/* ---- Watching writes ---- */

onWrite((key) => {
  if (key === KEYS.session) {
    const next = session.username();
    if (!next && currentUser) endSession(currentUser);
    currentUser = next;
    if (!api.token()) setStatus("local");
    return;
  }
  if (paused) return;
  const username = session.username();
  if (!username || !key.startsWith("synora:" + username + ":")) return;
  if (!SYNCED.includes(key.slice(key.lastIndexOf(":") + 1))) return;
  localWrites += 1;
  if (api.token()) schedule();
  else setStatus("local");
});

/* Closing or reloading the tab inside the debounce window would lose the
   last change, so send it on the way out. */
window.addEventListener("pagehide", () => {
  const owner = api.session();
  if (!owner || !isLinked(owner.username)) return;
  const { changes, empty } = diff(owner.username);
  if (!empty) api.saveOnExit(owner.username, changes, owner.token);
});
