/* =========================================================
   Synora — Storage & data layer

   The single place that talks to localStorage. Every other
   module goes through here, so the data shape stays consistent
   and each signed-in user gets their own private workspace.

   Global keys (shared by the whole browser):
     synora-users     array of accounts
     synora-session   { username }        (the person signed in)
     synora-theme     "light" | "dark"    (owned by theme.js)

   Per-user keys are namespaced so two accounts on the same
   browser never see each other's data:
     synora:<username>:subjects  ← the academic source of truth
     synora:<username>:tasks | notes | timetable | attendance |
                       cgpa | achievements | notifications |
                       profile | meta | onboarding (draft)

   localStorage stays the single source of truth. React
   components subscribe to it through useStore(): every write
   bumps a version number and re-renders the subscribers.
   ========================================================= */

import { uid, initials, fullName } from "./util.js";

export const KEYS = {
  users: "synora-users",
  session: "synora-session",
  theme: "synora-theme",
};

/* Default value for each per-user collection. get() returns a copy of
   these when nothing is stored yet, so callers always get the right shape. */
const DEFAULTS = {
  /* [{ id, name, credits, trackAttendance }]. trackAttendance decides ONE
     thing: whether the subject shows up in Attendance. Empty for every new
     account — only the demo account ships with subjects. */
  subjects: [],
  tasks: [],
  notes: [],
  timetable: [],
  /* [{ id, subjectId, total, attended }] — names come from "subjects". */
  attendance: [],
  /* { subjects: [{ id, subjectId, grade }] } — the grade alone carries the
     result (O … B pass, E1 / E2 / E3 fail). */
  cgpa: { subjects: [] },
  achievements: { unlocked: {} },   // achievementId -> ISO date string
  notifications: [],
  profile: {
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    /* { type: "illustration", id: "avatar-03" } | { type: "initials", id: "sage" } | null */
    avatar: null,
    program: "",
    semester: "",
    targetAttendance: 75,
    appearance: "light",
    onboarded: false,
  },
  meta: {
    streak: 0,               // consecutive days with a completed task
    lastCompletionDate: null,
    demo: false,             // true only for the arsh2309 sample account
  },
};

/* ---- Change subscription (for useSyncExternalStore) ---- */

const listeners = new Set();
let version = 0;
let notifyQueued = false;

/* The version moves on every write so a snapshot is never stale; the
   listeners are told once per tick, so a burst of writes (a refresh()
   pass can make dozens) re-renders once. */
function emitChange() {
  version += 1;
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    listeners.forEach((fn) => fn());
  });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getVersion() {
  return version;
}

/* One optional listener told the key of every write — sync.js uses it to
   mirror changes into the MySQL database. */
let writeHook = null;

export function onWrite(fn) {
  writeHook = fn;
}

/* ---- Low-level helpers: safe read / write of raw keys ---- */

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Synora: could not parse", key, err);
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    emitChange();
    if (writeHook) writeHook(key);
    return true;
  } catch (err) {
    console.error("Synora: could not save", key, err);
    return false;
  }
}

export function removeKey(key) {
  localStorage.removeItem(key);
  emitChange();
  if (writeHook) writeHook(key);
}

/* ---- Session — who is signed in ---- */

function getUsers() {
  return readJSON(KEYS.users, []);
}

export const session = {
  get: () => readJSON(KEYS.session, null),

  username() {
    const s = session.get();
    return s && s.username ? s.username : null;
  },

  user() {
    const username = session.username();
    if (!username) return null;
    return getUsers().find((u) => u.username === username) || null;
  },

  isAuthed: () => session.username() !== null,

  start(username) {
    writeJSON(KEYS.session, { username });
  },

  /* Clears the session pointer only — the account and its data stay
     in the browser for next time. */
  signOut() {
    removeKey(KEYS.session);
  },
};

/* ---- Per-user collections ---- */

export function userKey(collection, username) {
  return "synora:" + (username || session.username()) + ":" + collection;
}

function defaultFor(collection) {
  return JSON.parse(JSON.stringify(DEFAULTS[collection]));
}

function get(collection) {
  if (!(collection in DEFAULTS)) console.warn("Synora: unknown collection", collection);
  if (!session.username()) return defaultFor(collection);
  const value = readJSON(userKey(collection), defaultFor(collection));

  /* Object-shaped collections (profile, meta, cgpa) gain any keys added
     to DEFAULTS after the record was first written. */
  const fallback = defaultFor(collection);
  if (fallback && typeof fallback === "object" && !Array.isArray(fallback) &&
      value && typeof value === "object" && !Array.isArray(value)) {
    Object.keys(fallback).forEach((k) => {
      if (!(k in value)) value[k] = fallback[k];
    });
  }
  return value;
}

function set(collection, value) {
  if (!session.username()) return false;
  return writeJSON(userKey(collection), value);
}

/* Read, transform, write in one step. */
function update(collection, fn) {
  const current = get(collection);
  let next = fn(current);
  if (next === undefined) next = current;
  set(collection, next);
  return next;
}

/* ---- Subjects — the academic source of truth ----
   Attendance, CGPA and the timetable reference a subject by id. */

function normaliseSubject(s) {
  return {
    id: s.id,
    name: String(s.name || "").trim(),
    credits: Number(s.credits) || 0,
    /* Records written before the flag existed read as tracked. */
    trackAttendance: s.trackAttendance !== false,
  };
}

const subjects = {
  all: () => get("subjects").map((s) => ({
    id: s.id,
    name: s.name,
    credits: Number(s.credits) || 0,
    trackAttendance: s.trackAttendance !== false,
  })),

  /* The ONLY question trackAttendance answers — CGPA and the timetable
     use all() and ignore the flag. */
  tracked: () => subjects.all().filter((s) => s.trackAttendance),

  byId: (id) => subjects.all().find((s) => s.id === id) || null,

  nameOf(id) {
    const s = subjects.byId(id);
    return s ? s.name : "";
  },

  add(name, credits, trackAttendance) {
    const record = normaliseSubject({ id: uid("sub"), name, credits, trackAttendance });
    update("subjects", (list) => { list.push(record); return list; });
    return record;
  },

  /* Editing keeps the id, so every attendance row, grade and timetable
     entry that points at the subject follows the change. */
  save(subject) {
    const record = normaliseSubject(subject);
    update("subjects", (list) => {
      const idx = list.findIndex((s) => s.id === record.id);
      if (idx >= 0) list[idx] = record; else list.push(record);
      return list;
    });
    return record;
  },

  /* Removing a subject also removes what depends on it. */
  remove(id) {
    update("subjects", (list) => list.filter((s) => s.id !== id));
    update("attendance", (list) => list.filter((a) => a.subjectId !== id));
    update("timetable", (list) => list.filter((c) => c.subjectId !== id));
    update("cgpa", (c) => {
      c.subjects = (c.subjects || []).filter((s) => s.subjectId !== id);
      return c;
    });
  },

  /* Replace the whole list (used by onboarding and the demo seed). */
  setAll(list) {
    set("subjects", (list || []).map((s) => normaliseSubject({ ...s, id: s.id || uid("sub") })));
  },
};

export const store = { get, set, update, subjects };

/* ---- Profile — one normalised view of "who is signed in" ----
   The account (synora-users) and the profile (per-user) both hold name
   fields; reading through here means no screen has to know which won. */

/* An older build stored the avatar as a bare illustration id string. */
function normaliseAvatar(value) {
  if (!value) return null;
  if (typeof value === "string") return { type: "illustration", id: value };
  if (value.type === "initials" || value.type === "illustration") {
    return { type: value.type, id: String(value.id || "") };
  }
  return null;
}

export const profile = {
  get() {
    const p = get("profile");
    const account = session.user() || {};

    let first = p.firstName || account.firstName || "";
    let last = p.lastName || account.lastName || "";

    // Older accounts stored a single "fullName" — split it once.
    if (!first && !last) {
      const whole = (p.fullName || account.fullName || "").trim();
      if (whole) {
        const parts = whole.split(/\s+/);
        first = parts[0];
        last = parts.length > 1 ? parts[parts.length - 1] : "";
      }
    }

    return {
      firstName: first,
      lastName: last,
      fullName: fullName(first, last),
      initials: initials(first, last),
      username: p.username || account.username || session.username() || "",
      email: p.email || account.email || "",
      avatar: normaliseAvatar(p.avatar),
      program: p.program || "",
      semester: p.semester || "",
      targetAttendance: Number(p.targetAttendance) || 75,
      appearance: p.appearance || "light",
      onboarded: !!p.onboarded,
    };
  },

  /* Merge a patch into the stored profile. */
  save(patch) {
    return update("profile", (p) => ({ ...p, ...patch }));
  },
};
