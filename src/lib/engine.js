/* =========================================================
   Synora — Cross-cutting engines
   The completion streak, the notifications engine, the
   achievements engine and the shared derived data (task
   stats, today's classes, CGPA, attendance).

   refresh() is the "something changed" hook: the app shell
   runs it on every page, and any action that changes tasks,
   notes, the timetable or attendance runs it afterwards.
   ========================================================= */

import { store, profile } from "./storage.js";
import { uid, todayISO, toISODate, daysUntil, relativeDay, clamp } from "./util.js";
import { gradePoint, isFailGrade, GRADE_MAX } from "./grades.js";
import { toast } from "./toast.js";

/* ---- Streak — consecutive days with at least one completion ---- */

export const streak = {
  recordCompletion() {
    store.update("meta", (m) => {
      const today = todayISO();
      if (m.lastCompletionDate === today) return m;   // already counted today
      const yesterday = toISODate(new Date(Date.now() - 86400000));
      m.streak = m.lastCompletionDate === yesterday ? (m.streak || 0) + 1 : 1;
      m.lastCompletionDate = today;
      return m;
    });
  },

  current() {
    const m = store.get("meta");
    // A streak is only "live" if it includes today or yesterday.
    if (!m.lastCompletionDate) return 0;
    const days = Math.abs(daysUntil(m.lastCompletionDate));
    return days <= 1 ? (m.streak || 0) : 0;
  },
};

/* ---- Shared derived data ---- */

export const derive = {
  taskStats() {
    const stats = { total: 0, completed: 0, pending: 0, overdue: 0, dueToday: 0, upcoming: 0 };
    store.get("tasks").forEach((t) => {
      stats.total++;
      if (t.status === "completed") { stats.completed++; return; }
      stats.pending++;
      const days = t.deadline ? daysUntil(t.deadline) : null;
      if (days === null) return;
      if (days < 0) stats.overdue++;
      else if (days === 0) stats.dueToday++;
      else stats.upcoming++;
    });
    return stats;
  },

  upcomingDeadlines(limit) {
    return store.get("tasks")
      .filter((t) => t.status !== "completed" && t.deadline)
      .sort((a, b) => (a.deadline < b.deadline ? -1 : 1))
      .slice(0, limit || 5);
  },

  /* Today's classes, with each entry's subject name resolved from the
     central list. Entries store a subjectId, never a name. */
  todaysClasses() {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = dayNames[new Date().getDay()];
    return store.get("timetable")
      .filter((c) => c.day === today)
      .map((c) => {
        const subject = store.subjects.byId(c.subjectId);
        return {
          id: c.id,
          subjectId: c.subjectId,
          subject: subject ? subject.name : "",
          color: subject ? subject.color : null,
          start: c.startTime || "",
          end: c.endTime || "",
          room: c.room || "",
          teacher: c.teacher || "",
        };
      })
      .filter((c) => c.subject)
      .sort((a, b) => (a.start < b.start ? -1 : 1));
  },

  /* CGPA = Σ(credits × grade point) / Σ(credits), or null if nothing is
     gradeable yet. Every graded subject counts, tracked for attendance
     or not. Credits come from the subject, the grade from the CGPA record. */
  cgpa() {
    let totalCredits = 0, totalPoints = 0, counted = 0, failed = 0;

    (store.get("cgpa").subjects || []).forEach((row) => {
      const subject = store.subjects.byId(row.subjectId);
      if (!subject) return;
      const credits = Number(subject.credits);
      const point = gradePoint(row.grade);
      if (credits > 0 && point !== undefined) {
        totalCredits += credits;
        totalPoints += credits * point;
        counted++;
        if (isFailGrade(row.grade)) failed++;
      }
    });

    if (!totalCredits) return null;
    return {
      value: totalPoints / totalCredits,
      totalCredits,
      totalPoints,
      count: counted,
      failed,
      max: GRADE_MAX,
    };
  },

  /* Overall attendance plus a per-subject breakdown:
       attendance % = attended / held × 100

     Driven by the SUBJECT list (trackAttendance = true), not by the stored
     rows — a subject whose tracking is off is simply not represented, so
     nothing downstream has to remember to exclude it. */
  attendance() {
    const target = Number(profile.get().targetAttendance) || 75;
    const counts = {};
    store.get("attendance").forEach((a) => { counts[a.subjectId] = a; });

    let totalHeld = 0, totalAttended = 0;

    const rows = store.subjects.tracked().map((s) => {
      const a = counts[s.id] || {};
      const total = Math.max(0, Number(a.total) || 0);
      const attended = clamp(Number(a.attended) || 0, 0, total);
      totalHeld += total;
      totalAttended += attended;
      return {
        id: a.id || null,
        subjectId: s.id,
        subject: s.name,
        color: s.color,
        total,
        attended,
        /* held = 0 is "nothing recorded", not 0% and never NaN. */
        pct: total ? (attended / total) * 100 : 0,
        recorded: total > 0,
      };
    });

    return {
      overall: totalHeld ? (totalAttended / totalHeld) * 100 : null,
      target,
      subjects: rows,
    };
  },
};

/* ---- Notifications engine ---- */

export const notifications = {
  /* Newest first. Alerts raised in the same millisecond (one refresh can
     raise several) fall back to creation order, newest first, so the list
     never depends on how finely the clock ticked. */
  all() {
    return store.get("notifications")
      .map((n, i) => ({ n, i }))
      .sort((a, b) => (new Date(b.n.createdAt) - new Date(a.n.createdAt)) || (b.i - a.i))
      .map(({ n }) => n);
  },

  add(n) {
    // Dedupe by stable key when provided.
    const list = store.get("notifications");
    if (n.key && list.some((x) => x.key === n.key)) return null;
    const record = {
      id: uid("ntf"),
      key: n.key || null,
      type: n.type || "info",
      title: n.title,
      body: n.body || "",
      createdAt: new Date().toISOString(),
      read: false,
      seen: false,
    };
    list.push(record);
    store.set("notifications", list);
    return record;
  },

  markAllRead() {
    store.update("notifications", (list) => {
      list.forEach((n) => { n.read = true; n.seen = true; });
      return list;
    });
  },

  markRead(id) {
    store.update("notifications", (list) => {
      list.forEach((n) => { if (n.id === id) { n.read = true; n.seen = true; } });
      return list;
    });
  },

  /* "seen" = the bell was opened; clears the red count without marking
     each item as read (they stay highlighted in the list). */
  markAllSeen() {
    store.update("notifications", (list) => {
      list.forEach((n) => { n.seen = true; });
      return list;
    });
  },

  clearAll() { store.set("notifications", []); },

  remove(id) {
    store.update("notifications", (list) => list.filter((n) => n.id !== id));
  },

  unreadCount: () => store.get("notifications").filter((n) => !n.read).length,
  unseenCount: () => store.get("notifications").filter((n) => !n.seen).length,

  /* Remove every notification matching a key prefix, except keepKeys.
     Used to retire alerts whose cause has gone away. */
  dropByPrefix(prefix, keepKeys) {
    store.update("notifications", (list) => list.filter((n) => {
      if (!n.key || n.key.indexOf(prefix) !== 0) return true;
      return keepKeys.indexOf(n.key) !== -1;
    }));
  },

  /* Scan the data and create any new deadline / overdue / attendance alerts. */
  refresh() {
    store.get("tasks").forEach((t) => {
      if (t.status === "completed" || !t.deadline) return;
      const days = daysUntil(t.deadline);
      if (days === null) return;
      if (days < 0) {
        notifications.add({
          key: "overdue:" + t.id + ":" + t.deadline,
          type: "danger",
          title: "Overdue task",
          body: '"' + t.title + '" was due ' + relativeDay(t.deadline).toLowerCase() + ".",
        });
      } else if (days === 0) {
        notifications.add({
          key: "due:" + t.id + ":" + t.deadline,
          type: "warning",
          title: "Due today",
          body: '"' + t.title + '" is due today.',
        });
      } else if (days === 1) {
        notifications.add({
          key: "due:" + t.id + ":" + t.deadline,
          type: "warning",
          title: "Due tomorrow",
          body: '"' + t.title + '" is due tomorrow.',
        });
      }
    });

    /* Attendance below target. A row only counts once it has classes held
       (a half-typed row is not a warning), and the alerts are RECONCILED:
       anything no longer below target is dropped. The percentage is in the
       key, so a subject that slips further re-announces itself.
       derive.attendance() walks only tracked subjects, so an untracked
       subject can never raise a false "0%" warning. */
    const attendance = derive.attendance();
    const target = attendance.target;
    const liveKeys = [];

    attendance.subjects.forEach((row) => {
      if (!row.recorded) return;
      if (row.pct >= target) return;

      const key = "attn:" + row.subjectId + ":" + Math.round(row.pct);
      liveKeys.push(key);

      notifications.add({
        key,
        type: "warning",
        title: "Attendance warning",
        body: row.subject + " is at " + row.pct.toFixed(0) + "% — below your " + target + "% target.",
      });
    });

    notifications.dropByPrefix("attn:", liveKeys);
  },
};

/* ---- Achievements engine ---- */

const ACHIEVEMENTS = [
  { id: "first-step", title: "First Step", desc: "Complete your first task.", icon: "check", goal: 1,
    measure: (c) => c.completed },
  { id: "getting-started", title: "Getting Started", desc: "Complete 5 tasks.", icon: "checkCircle", goal: 5,
    measure: (c) => c.completed },
  { id: "productive", title: "Productive", desc: "Complete 10 tasks.", icon: "trophy", goal: 10,
    measure: (c) => c.completed },
  { id: "consistent", title: "Consistent", desc: "Reach a 3-day completion streak.", icon: "flame", goal: 3,
    measure: (c) => c.streak },
  { id: "deadline-master", title: "Deadline Master", desc: "Finish 3 tasks before their deadline.", icon: "clock", goal: 3,
    measure: (c) => c.beforeDeadline },
  { id: "academic-planner", title: "Academic Planner", desc: "Add your class timetable.", icon: "calendar", goal: 1,
    measure: (c) => c.timetable },
  { id: "organized", title: "Organized", desc: "Write 5 quick notes.", icon: "note", goal: 5,
    measure: (c) => c.notes },
];

function achievementContext() {
  const completed = store.get("tasks").filter((t) => t.status === "completed");
  const beforeDeadline = completed.filter((t) =>
    t.deadline && t.completedAt && toISODate(new Date(t.completedAt)) <= t.deadline
  ).length;
  return {
    completed: completed.length,
    beforeDeadline,
    notes: store.get("notes").length,
    timetable: store.get("timetable").length,
    streak: streak.current(),
  };
}

export const achievements = {
  list() {
    const ctx = achievementContext();
    const unlocked = store.get("achievements").unlocked || {};
    return ACHIEVEMENTS.map((a) => ({
      id: a.id, title: a.title, desc: a.desc, icon: a.icon,
      goal: a.goal,
      current: Math.min(a.measure(ctx), a.goal),
      unlocked: !!unlocked[a.id],
      unlockedAt: unlocked[a.id] || null,
    }));
  },

  /* Unlock any newly-earned achievements; notify (and toast) for each. */
  evaluate(announce) {
    const ctx = achievementContext();
    const data = store.get("achievements");
    data.unlocked = data.unlocked || {};
    const newly = [];
    ACHIEVEMENTS.forEach((a) => {
      if (!data.unlocked[a.id] && a.measure(ctx) >= a.goal) {
        data.unlocked[a.id] = new Date().toISOString();
        newly.push(a);
      }
    });
    if (newly.length) {
      store.set("achievements", data);
      newly.forEach((a) => {
        notifications.add({ type: "success", title: "Achievement unlocked", body: a.title });
        if (announce !== false) toast.success("Achievement unlocked 🏆", a.title);
      });
    }
    return newly;
  },
};

/* Call after any data change. */
export function refresh() {
  store.subjects.ensureColors();
  notifications.refresh();
  achievements.evaluate();
}
