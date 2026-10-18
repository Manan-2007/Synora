/* =========================================================
   Focus timer (Pomodoro).

   Focus → short break, four times, then a long break. The
   running timer belongs to this device (localStorage) and is
   kept as an end time, so it survives reloads, page changes and
   a sleeping laptop. Each finished focus session is saved to
   the account (the `focus` collection → focus_sessions):

     { id, subjectId, taskId, minutes, endedAt }
   ========================================================= */

import { store, session } from "./storage.js";
import { toast } from "./toast.js";
import { notify } from "./reminders.js";
import { todayISO, toISODate } from "./util.js";

const KEY = "synora-focus-timer";
export const ROUNDS = 4;
export const LENGTHS = [15, 25, 45, 60];

export const MODES = {
  focus: { label: "Focus" },
  short: { label: "Short break", minutes: 5 },
  long:  { label: "Long break",  minutes: 15 },
};

const DEFAULT = { mode: "focus", length: 25, running: false, endsAt: null, remaining: null, round: 0, subjectId: "", taskId: "" };

const listeners = new Set();
let cached = null;
let cachedFor = null;

/* A timer left by whoever used this browser before belongs to them:
   anyone else signing in starts from a fresh one. */
function load() {
  let s;
  try { s = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { s = { ...DEFAULT }; }
  return s.owner && s.owner !== session.username() ? { ...DEFAULT } : s;
}

export function timer() {
  if (!cached || cachedFor !== session.username()) {
    cached = load();
    cachedFor = session.username();
  }
  return cached;
}

function save(next) {
  next = { ...next, owner: session.username() };
  cached = next;
  cachedFor = next.owner;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
  listeners.forEach((fn) => fn());
}

export function subscribeTimer(fn) {
  listeners.add(fn);
  /* Another tab started, paused or finished the timer. */
  const onStorage = (e) => { if (e.key === KEY) { cached = null; fn(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

export const durationOf = (s, mode = s.mode) => (mode === "focus" ? s.length : MODES[mode].minutes) * 60000;

/* Milliseconds left on the clock. */
export function remainingMs(s = timer(), now = Date.now()) {
  if (s.running && s.endsAt) return Math.max(0, s.endsAt - now);
  return s.remaining != null ? s.remaining : durationOf(s);
}

/* Started and not yet finished or reset (running or paused part-way). */
export const inProgress = (s = timer()) => s.running || (s.remaining != null && s.remaining < durationOf(s));

export function startTimer() {
  const s = timer();
  if (s.running) return;
  save({ ...s, running: true, endsAt: Date.now() + remainingMs(s), remaining: null });
}

export function pauseTimer() {
  const s = timer();
  if (!s.running) return;
  save({ ...s, running: false, remaining: remainingMs(s), endsAt: null });
}

export function resetTimer() {
  save({ ...timer(), running: false, endsAt: null, remaining: null });
}

/* Changing mode, length or what you're working on: only between sessions
   for mode and length; subject and task can change at any time. */
export function setMode(mode) {
  if (!MODES[mode]) return;
  save({ ...timer(), mode, running: false, endsAt: null, remaining: null });
}
export function setLength(length) {
  if (!LENGTHS.includes(length)) return;
  const s = timer();
  save({ ...s, length, remaining: s.mode === "focus" ? null : s.remaining });
}
export function setFocusTarget(patch) {
  save({ ...timer(), ...patch });
}

function nextMode(s, round) {
  if (s.mode !== "focus") return "focus";
  return round % ROUNDS === 0 ? "long" : "short";
}

function logSession(s, minutes, endedAt) {
  if (minutes < 1) return null;
  const id = "fcs-" + endedAt;           // the same end time from two tabs → one record
  const entry = { id, subjectId: s.subjectId || "", taskId: s.taskId || "", minutes, endedAt: new Date(endedAt).toISOString() };
  let added = false;
  store.update("focus", (list) => {
    if (list.some((f) => f.id === id)) return list;
    added = true;
    return [...list, entry];
  });
  return added ? entry : null;
}

/* The clock reached zero. Finished focus time is saved; the next phase
   waits for Start (nothing runs on by itself). Safe to call from several
   tabs: only the first one to see the finished timer acts on it. */
export function completeIfDue(now = Date.now()) {
  cached = null;
  const s = timer();
  if (!s.running || !s.endsAt || s.endsAt > now) return;
  const round = s.mode === "focus" ? s.round + 1 : s.round;
  const mode = nextMode(s, round);
  save({ ...s, mode, round: mode === "focus" && s.mode === "long" ? 0 : round, running: false, endsAt: null, remaining: null });

  if (s.mode === "focus") {
    const minutes = Math.round(durationOf(s) / 60000);
    logSession(s, minutes, s.endsAt);
    const what = store.subjects.nameOf(s.subjectId);
    const rest = MODES[mode].minutes + "-minute break";
    toast.success("Focus session done", minutes + " minutes" + (what ? " of " + what : "") + ". Time for a " + rest + ".");
    notify("Focus session done", minutes + " minutes" + (what ? " of " + what : "") + ". Take a " + rest + ".", "focus");
  } else {
    toast.info("Break's over", "Ready for the next focus session?");
    notify("Break's over", "Ready for the next focus session?", "focus");
  }
}

/* "Finish early" during focus saves the minutes done so far; during a
   break it skips the rest of it. */
export function finishEarly() {
  const s = timer();
  const done = durationOf(s) - remainingMs(s);
  const round = s.mode === "focus" ? s.round + 1 : s.round;
  const mode = nextMode(s, round);
  save({ ...s, mode, round: mode === "focus" && s.mode === "long" ? 0 : round, running: false, endsAt: null, remaining: null });
  if (s.mode !== "focus") return null;
  return logSession(s, Math.floor(done / 60000), Date.now());
}

/* ---- Stats ---- */

export function allSessions() {
  return store.get("focus");
}

const dayOf = (f) => toISODate(new Date(f.endedAt));

function weekStart(d = new Date()) {
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
}

export function focusStats() {
  const list = allSessions();
  const today = todayISO();
  const monday = weekStart();
  const week = list.filter((f) => dayOf(f) >= monday);
  const todays = list.filter((f) => dayOf(f) === today);
  const sum = (l) => l.reduce((a, f) => a + (Number(f.minutes) || 0), 0);

  /* Minutes per day, Monday → Sunday of this week. */
  const start = new Date(monday + "T00:00:00");
  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    return { iso, minutes: sum(week.filter((f) => dayOf(f) === iso)) };
  });

  /* This week by subject, most first. */
  const bySubject = {};
  for (const f of week) bySubject[f.subjectId || ""] = (bySubject[f.subjectId || ""] || 0) + (Number(f.minutes) || 0);
  const subjects = Object.entries(bySubject)
    .map(([id, minutes]) => ({ id, minutes, name: store.subjects.nameOf(id) || "No subject", color: store.subjects.byId(id)?.color || "stone" }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    todayMinutes: sum(todays), todaySessions: todays.length,
    weekMinutes: sum(week), weekSessions: week.length,
    totalMinutes: sum(list), days, subjects,
    recent: list.slice().sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1)).slice(0, 6),
  };
}

export const clock = (ms) => {
  const total = Math.ceil(ms / 1000);
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
};

export const hoursMinutes = (min) => (min < 60 ? min + " min" : Math.floor(min / 60) + " h" + (min % 60 ? " " + (min % 60) + " min" : ""));
