/* Attendance maths. For each tracked subject, the percentage
   attended and the question students actually ask:

     • below target: how many classes in a row must I attend?
     • at or above:  how many can I safely miss?

   Storage holds counts only — { id, subjectId, total, attended }. */

import { store, profile } from "./storage.js";
import { refresh } from "./engine.js";
import { uid, clamp, plural, todayISO } from "./util.js";
import { todayName } from "./timetable.js";
import { formatRange } from "./time.js";

export function attendanceTarget() {
  return Number(profile.get().targetAttendance) || 75;
}

export function countsFor(subjectId) {
  return store.get("attendance").find((r) => r.subjectId === subjectId) ||
    { total: 0, attended: 0 };
}

/* The one way counts are written, so the invariants live in one place:
     held >= 0,  0 <= attended <= held */
export function setCounts(subjectId, held, attended) {
  const h = Math.max(0, Math.round(Number(held) || 0));
  const a = clamp(Math.round(Number(attended) || 0), 0, h);

  store.update("attendance", (list) => {
    let row = list.find((r) => r.subjectId === subjectId);
    if (!row) {
      row = { id: uid("att"), subjectId, total: 0, attended: 0 };
      list.push(row);
    }
    row.total = h;
    row.attended = a;
    return list;
  });

  refresh();
  return { total: h, attended: a };
}

/* + / − on one count. Dropping held below attended pulls attended down
   with it — nobody attends a class that wasn't held. */
export function stepCount(subjectId, which, delta) {
  const row = countsFor(subjectId);
  let held = Math.max(0, Number(row.total) || 0);
  let attended = clamp(Number(row.attended) || 0, 0, held);

  if (which === "held") {
    held = Math.max(0, held + delta);
    attended = Math.min(attended, held);
  } else {
    attended = clamp(attended + delta, 0, held);
  }

  setCounts(subjectId, held, attended);
}

const classes = (n) => plural(n, "class", "es");

/* The maths for one subject. */
export function analyse(row) {
  const total = Math.max(0, Number(row.total) || 0);
  const attended = clamp(Number(row.attended) || 0, 0, total);
  const goal = attendanceTarget();

  const res = {
    total,
    attended,
    target: goal,
    recorded: total > 0,
    /* Guarding the divide keeps NaN and Infinity off the screen. */
    pct: total ? (attended / total) * 100 : 0,
    status: "none",
    message: "",
  };

  if (!total) {
    res.message = "No classes recorded yet.";
    return res;
  }

  if (res.pct >= goal) {
    res.status = "safe";
    if (goal >= 100) {
      res.canMiss = 0;
      res.message = "Perfect attendance required — don't miss any.";
    } else {
      // attended / (total + x) ≥ goal/100  →  x ≤ attended×100/goal − total
      res.canMiss = Math.max(0, Math.floor((attended * 100) / goal - total));
      res.message = res.canMiss === 0
        ? "Right on target — don't miss the next class."
        : "You can miss " + res.canMiss + " more " + classes(res.canMiss) +
          " and stay above " + goal + "%.";
    }
  } else {
    res.status = "danger";
    if (goal >= 100) {
      res.message = "Can't reach 100% once a class is missed.";
    } else {
      // (attended + n) / (total + n) ≥ goal/100
      res.need = Math.max(0, Math.ceil((goal * total - 100 * attended) / (100 - goal)));
      res.message = "Attend " + res.need + " " + classes(res.need) +
                    " in a row to reach " + goal + "%.";
    }
  }
  return res;
}

/* ---- Asking after each class (dashboard + notifications) ----
   Today's classes that have finished, for subjects that record
   attendance, and that haven't been answered yet today. The answer is
   remembered on the timetable entry (lastMarked), so every device stops
   asking once one has answered.

   Colleges count attendance per hour: a 2-hour lab is 2 classes held
   (and 2 attended). classHours() turns a slot's length into that count,
   rounded to the nearest hour and never less than 1. */

const nowHHMM = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
const minutes = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

export function classHours(entry) {
  const start = minutes(entry && entry.startTime), end = minutes(entry && entry.endTime);
  if (start === null || end === null || end <= start) return 1;
  return Math.max(1, Math.round((end - start) / 60));
}

export function classesToMark(now = new Date()) {
  const today = todayISO();
  const time = nowHHMM(now);
  return store.get("timetable")
    .filter((c) => c.day === todayName() && c.endTime && c.endTime <= time && c.lastMarked !== today)
    .map((c) => ({ c, s: store.subjects.byId(c.subjectId) }))
    .filter(({ s }) => s && s.trackAttendance)
    .sort((a, b) => (a.c.startTime < b.c.startTime ? -1 : 1))
    .map(({ c, s }) => ({
      id: c.id, subject: s.name, color: s.color, room: c.room || "", hours: classHours(c),
      time: formatRange(c.startTime, c.endTime), subjectId: s.id,
    }));
}

/* outcome: "attended" (held + h, attended + h), "missed" (held + h) or
   "cancelled" (not held: no change), where h = classHours(). `date` is
   the day being answered (a notification can be tapped later); a class
   already answered for that day is left alone, so a second tap — or a
   second device — never counts it twice. Returns the subject's new counts
   and h, or null when there was nothing to do. */
export function markClass(classId, outcome, date = todayISO()) {
  const entry = store.get("timetable").find((c) => c.id === classId);
  if (!entry || !["attended", "missed", "cancelled"].includes(outcome)) return null;
  if (entry.lastMarked && entry.lastMarked >= date) return null;
  const hours = classHours(entry);
  const row = countsFor(entry.subjectId);
  let total = Number(row.total) || 0;
  let attended = Number(row.attended) || 0;
  if (outcome === "attended") { total += hours; attended += hours; }
  else if (outcome === "missed") total += hours;
  store.update("timetable", (list) => list.map((c) => (c.id === classId ? { ...c, lastMarked: date } : c)));
  const r = outcome === "cancelled" ? { total, attended } : setCounts(entry.subjectId, total, attended);
  return { ...r, hours, pct: r.total ? (r.attended / r.total) * 100 : 0 };
}
