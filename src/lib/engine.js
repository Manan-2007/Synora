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

/* ---- Achievements engine ----
   Badges unlock from what the person actually does, and stay unlocked.
   Each has a tier (1 bronze · 2 silver · 3 gold) worth XP; XP adds up to
   a level, so there is always a next thing to reach. Definitions carry a
   `measure` over one shared context, worked out once per check. */

export const ACH_CATEGORIES = {
  tasks: "Tasks", habits: "Habits", planning: "Planning", academics: "Academics",
  focus: "Focus", notes: "Notes", fun: "Just for fun",
};

const TIER_XP = { 1: 10, 2: 25, 3: 50 };

const ACHIEVEMENTS = [
  /* Tasks */
  { id: "first-step", cat: "tasks", tier: 1, title: "First Step", desc: "Complete your first task.", icon: "check", goal: 1, measure: (c) => c.completed },
  { id: "getting-started", cat: "tasks", tier: 1, title: "Getting Started", desc: "Complete 5 tasks.", icon: "checkCircle", goal: 5, measure: (c) => c.completed },
  { id: "productive", cat: "tasks", tier: 2, title: "Productive", desc: "Complete 10 tasks.", icon: "trophy", goal: 10, measure: (c) => c.completed },
  { id: "task-machine", cat: "tasks", tier: 2, title: "Task Machine", desc: "Complete 25 tasks.", icon: "bolt", goal: 25, measure: (c) => c.completed },
  { id: "half-century", cat: "tasks", tier: 3, title: "Half Century", desc: "Complete 50 tasks.", icon: "star", goal: 50, measure: (c) => c.completed },
  { id: "centurion", cat: "tasks", tier: 3, title: "Centurion", desc: "Complete 100 tasks.", icon: "crown", goal: 100, measure: (c) => c.completed },
  { id: "deadline-master", cat: "tasks", tier: 1, title: "Deadline Master", desc: "Finish 3 tasks before their deadline.", icon: "clock", goal: 3, measure: (c) => c.beforeDeadline },
  { id: "ahead-of-schedule", cat: "tasks", tier: 2, title: "Ahead of Schedule", desc: "Finish 15 tasks before their deadline.", icon: "target", goal: 15, measure: (c) => c.beforeDeadline },
  { id: "clean-slate", cat: "tasks", tier: 2, title: "Clean Slate", desc: "Have 5 open tasks and nothing overdue.", icon: "sparkle", goal: 1, measure: (c) => (c.pending >= 5 && c.overdue === 0 ? 1 : 0) },
  { id: "step-by-step", cat: "tasks", tier: 1, title: "Step by Step", desc: "Tick off 10 checklist steps inside tasks.", icon: "list", goal: 10, measure: (c) => c.stepsDone },

  /* Habits */
  { id: "consistent", cat: "habits", tier: 1, title: "Consistent", desc: "Reach a 3-day completion streak.", icon: "flame", goal: 3, measure: (c) => c.streak },
  { id: "on-a-roll", cat: "habits", tier: 2, title: "On a Roll", desc: "Reach a 7-day streak.", icon: "flame", goal: 7, measure: (c) => c.streak },
  { id: "unstoppable", cat: "habits", tier: 3, title: "Unstoppable", desc: "Reach a 14-day streak.", icon: "flame", goal: 14, measure: (c) => c.streak },
  { id: "habit-formed", cat: "habits", tier: 3, title: "Habit Formed", desc: "Reach a 30-day streak.", icon: "crown", goal: 30, measure: (c) => c.streak },
  { id: "on-repeat", cat: "habits", tier: 1, title: "On Repeat", desc: "Set up a repeating task.", icon: "repeat", goal: 1, measure: (c) => c.repeating },

  /* Planning */
  { id: "academic-planner", cat: "planning", tier: 1, title: "Academic Planner", desc: "Add your class timetable.", icon: "calendar", goal: 1, measure: (c) => c.timetable },
  { id: "full-week", cat: "planning", tier: 2, title: "Full Week", desc: "Have classes on 5 different days.", icon: "grid", goal: 5, measure: (c) => c.classDays },
  { id: "roll-call", cat: "planning", tier: 1, title: "Roll Call", desc: "Answer \u201cDid you attend?\u201d after a class.", icon: "users", goal: 1, measure: (c) => c.marked },
  { id: "present", cat: "planning", tier: 3, title: "Present & Correct", desc: "Every tracked subject at your attendance target, over 20+ classes.", icon: "checkCircle", goal: 1, measure: (c) => c.attendanceGood },

  /* Academics */
  { id: "graded", cat: "academics", tier: 1, title: "Report Card", desc: "Enter a grade for every subject this semester.", icon: "chart", goal: 1, measure: (c) => c.allGraded },
  { id: "historian", cat: "academics", tier: 2, title: "Historian", desc: "Save 2 past semesters.", icon: "cap", goal: 2, measure: (c) => c.semesters },
  { id: "deans-list", cat: "academics", tier: 3, title: "Dean's List", desc: "Reach an overall CGPA of 8.5 or more.", icon: "star", goal: 1, measure: (c) => c.highCgpa },

  /* Focus */
  { id: "deep-breath", cat: "focus", tier: 1, title: "Deep Breath", desc: "Finish your first focus session.", icon: "timer", goal: 1, measure: (c) => c.focusSessions },
  { id: "in-the-zone", cat: "focus", tier: 2, title: "In the Zone", desc: "Finish 10 focus sessions.", icon: "target", goal: 10, measure: (c) => c.focusSessions },
  { id: "power-hour", cat: "focus", tier: 2, title: "Power Hour", desc: "Focus for 60 minutes in one day.", icon: "bolt", goal: 60, measure: (c) => c.focusBestDay },
  { id: "ten-hours", cat: "focus", tier: 3, title: "Ten Hours", desc: "Focus for 10 hours in total.", icon: "crown", goal: 600, measure: (c) => c.focusMinutes },

  /* Notes */
  { id: "organized", cat: "notes", tier: 1, title: "Organized", desc: "Write 5 quick notes.", icon: "note", goal: 5, measure: (c) => c.notes },
  { id: "note-taker", cat: "notes", tier: 2, title: "Note Taker", desc: "Write 15 notes.", icon: "note", goal: 15, measure: (c) => c.notes },
  { id: "checklist-maker", cat: "notes", tier: 1, title: "Checklist Maker", desc: "Put a - [ ] checklist in a note.", icon: "list", goal: 1, measure: (c) => c.noteChecklists },

  /* Just for fun */
  { id: "made-it-yours", cat: "fun", tier: 1, title: "Made It Yours", desc: "Pick an avatar illustration.", icon: "user", goal: 1, measure: (c) => c.avatar },
  { id: "early-bird", cat: "fun", tier: 1, title: "Early Bird", desc: "Finish a task before 8 am.", icon: "sun", goal: 1, measure: (c) => c.earlyBird },
  { id: "night-owl", cat: "fun", tier: 1, title: "Night Owl", desc: "Finish a task after 11 pm.", icon: "moon", goal: 1, measure: (c) => c.nightOwl },
  { id: "weekend-warrior", cat: "fun", tier: 1, title: "Weekend Warrior", desc: "Finish 5 tasks on weekends.", icon: "sparkle", goal: 5, measure: (c) => c.weekend },
];

function achievementContext() {
  const tasks = store.get("tasks");
  const completed = tasks.filter((t) => t.status === "completed");
  const hours = completed.filter((t) => t.completedAt).map((t) => new Date(t.completedAt));
  const stats = derive.taskStats();

  const timetable = store.get("timetable");
  const notes = store.get("notes");
  const focus = store.get("focus");
  const byDay = {};
  focus.forEach((f) => { const d = toISODate(new Date(f.endedAt)); byDay[d] = (byDay[d] || 0) + (Number(f.minutes) || 0); });

  /* Overall CGPA over every semester (current + saved), as lib/semesters.js does. */
  const pastRows = store.get("semesters").flatMap((s) => s.subjects || []);
  const currentGrades = store.get("cgpa").subjects || [];
  let credits = 0, points = 0;
  const add = (c, g) => { const p = gradePoint(g); if (c > 0 && p !== undefined) { credits += c; points += c * p; } };
  pastRows.forEach((r) => add(Number(r.credits) || 0, r.grade));
  currentGrades.forEach((g) => { const s = store.subjects.byId(g.subjectId); if (s) add(Number(s.credits) || 0, g.grade); });

  const subjects = store.subjects.all();
  const att = derive.attendance();
  const recorded = att.subjects.filter((r) => r.recorded);
  const held = recorded.reduce((a, r) => a + r.total, 0);

  return {
    completed: completed.length,
    beforeDeadline: completed.filter((t) => t.deadline && t.completedAt && toISODate(new Date(t.completedAt)) <= t.deadline).length,
    pending: stats.pending,
    overdue: stats.overdue,
    stepsDone: tasks.reduce((a, t) => a + (t.subtasks || []).filter((st) => st.done).length, 0),
    repeating: tasks.some((t) => t.repeat && t.repeat !== "none") ? 1 : 0,
    streak: streak.current(),
    timetable: timetable.length,
    classDays: new Set(timetable.map((c) => c.day)).size,
    marked: timetable.some((c) => c.lastMarked) ? 1 : 0,
    attendanceGood: recorded.length && held >= 20 && att.subjects.every((r) => !r.recorded || r.pct >= att.target) ? 1 : 0,
    allGraded: subjects.length >= 3 && subjects.every((s) => currentGrades.some((g) => g.subjectId === s.id && gradePoint(g.grade) !== undefined)) ? 1 : 0,
    semesters: store.get("semesters").length,
    highCgpa: credits >= 10 && points / credits >= 8.5 ? 1 : 0,
    focusSessions: focus.length,
    focusMinutes: focus.reduce((a, f) => a + (Number(f.minutes) || 0), 0),
    focusBestDay: Math.max(0, ...Object.values(byDay)),
    notes: notes.length,
    noteChecklists: notes.some((n) => /^\s*[-*+]\s+\[[ xX]\]/m.test(n.body || "")) ? 1 : 0,
    avatar: (profile.get().avatar || {}).type === "illustration" ? 1 : 0,
    earlyBird: hours.some((d) => d.getHours() >= 4 && d.getHours() < 8) ? 1 : 0,
    nightOwl: hours.some((d) => d.getHours() >= 23 || d.getHours() < 4) ? 1 : 0,
    weekend: hours.filter((d) => d.getDay() === 0 || d.getDay() === 6).length,
  };
}

/* Level n needs 50 × (1 + 2 + … + (n−1)) XP: 0, 50, 150, 300, 500, 750 … */
const LEVEL_TITLES = ["Freshman", "Learner", "Scholar", "Achiever", "Expert", "Master", "Legend"];
const xpForLevel = (n) => 25 * n * (n - 1);

export const achievements = {
  list() {
    const ctx = achievementContext();
    const unlocked = store.get("achievements").unlocked || {};
    return ACHIEVEMENTS.map((a) => ({
      id: a.id, title: a.title, desc: a.desc, icon: a.icon, cat: a.cat, tier: a.tier, xp: TIER_XP[a.tier],
      goal: a.goal,
      current: Math.min(a.measure(ctx), a.goal),
      unlocked: !!unlocked[a.id],
      unlockedAt: unlocked[a.id] || null,
    }));
  },

  /* XP, level and how far into it. */
  summary(list = achievements.list()) {
    const xp = list.filter((a) => a.unlocked).reduce((s, a) => s + a.xp, 0);
    let level = 1;
    while (xp >= xpForLevel(level + 1)) level++;
    const from = xpForLevel(level), to = xpForLevel(level + 1);
    return {
      xp, level, title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
      into: xp - from, span: to - from, toNext: to - xp,
      unlocked: list.filter((a) => a.unlocked).length, total: list.length,
    };
  },

  /* The locked badges closest to unlocking. */
  nextUp(n = 3, list = achievements.list()) {
    return list.filter((a) => !a.unlocked)
      .sort((a, b) => (b.current / b.goal) - (a.current / a.goal) || a.tier - b.tier)
      .slice(0, n);
  },

  /* Unlock any newly-earned achievements. Several at once (a first sign-in,
     a new badge set) make ONE toast and one notification, not a wall. */
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
      const names = newly.length <= 3
        ? newly.map((a) => a.title).join(", ")
        : newly.slice(0, 3).map((a) => a.title).join(", ") + " and " + (newly.length - 3) + " more";
      if (newly.length <= 2) newly.forEach((a) => notifications.add({ type: "success", title: "Achievement unlocked", body: a.title }));
      else notifications.add({ type: "success", title: newly.length + " achievements unlocked", body: names });
      if (announce !== false) {
        toast.success(newly.length === 1 ? "Achievement unlocked 🏆" : newly.length + " achievements unlocked 🏆", names);
      }
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
