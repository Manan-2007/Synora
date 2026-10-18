/* Tasks — shape:
     { id, title, subject, description, deadline (YYYY-MM-DD),
       priority: critical|high|medium|low,
       status:   not-started|in-progress|completed,
       repeat:   none|daily|weekly|monthly,
       subtasks: [{ id, text, done }],
       createdAt, completedAt } */

import { store } from "./storage.js";
import { refresh, streak } from "./engine.js";
import { uid, todayISO, toISODate, parseISODate, formatDate } from "./util.js";
import { toast } from "./toast.js";

export const PRIORITY = {
  critical: { label: "Critical", badge: "badge--critical", order: 0 },
  high:     { label: "High",     badge: "badge--high",     order: 1 },
  medium:   { label: "Medium",   badge: "badge--medium",   order: 2 },
  low:      { label: "Low",      badge: "badge--low",      order: 3 },
};

export const STATUS = {
  "not-started": { label: "Not started", badge: "badge--neutral" },
  "in-progress": { label: "In progress", badge: "badge--brand" },
  "completed":   { label: "Completed",   badge: "badge--done" },
};

export const REPEAT = {
  none:    { label: "Doesn't repeat", short: "" },
  daily:   { label: "Every day",      short: "Daily" },
  weekly:  { label: "Every week",     short: "Weekly" },
  monthly: { label: "Every month",    short: "Monthly" },
};

export const repeatOf = (task) => (REPEAT[task && task.repeat] && task.repeat) || "none";

/* The next date after `iso` for a repeat rule. A monthly task on the 31st
   falls on the last day of shorter months. */
export function nextDate(iso, rule) {
  const d = parseISODate(iso);
  if (!d) return "";
  if (rule === "daily") return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  if (rule === "weekly") return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
  if (rule === "monthly") {
    const last = new Date(d.getFullYear(), d.getMonth() + 2, 0).getDate();
    return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), last)));
  }
  return "";
}

/* Finishing a repeating task puts the next one on the list: same title,
   subject, notes and priority, a fresh checklist, and the next deadline
   that isn't already past. Nothing is added twice — finishing, undoing
   and finishing again finds the one already waiting. */
function queueNext(task, list) {
  const rule = repeatOf(task);
  if (rule === "none") return null;
  const today = todayISO();
  let due = nextDate(task.deadline || today, rule);
  while (due < today) due = nextDate(due, rule);
  const waiting = list.find((t) => t.id !== task.id && t.status !== "completed" &&
    t.title === task.title && (t.subject || "") === (task.subject || "") && repeatOf(t) === rule && t.deadline === due);
  if (waiting) return null;
  const next = newTask({
    title: task.title, subject: task.subject, description: task.description,
    priority: task.priority, repeat: rule, deadline: due,
    subtasks: (task.subtasks || []).map((st) => ({ id: uid("st"), text: st.text, done: false })),
  });
  list.push(next);
  return next;
}

export function allTasks() {
  return store.get("tasks");
}

export function getTask(id) {
  return allTasks().find((t) => t.id === id) || null;
}

export function newTask(fields) {
  return {
    id: uid("tsk"), title: "", subject: "", description: "",
    deadline: "", priority: "medium", status: "not-started",
    repeat: "none", subtasks: [],
    createdAt: new Date().toISOString(), completedAt: null,
    ...fields,
  };
}

/* Saves a task. Returns the next occurrence when this save finished a
   repeating task (so the caller can say so), otherwise null. */
export function saveTask(task) {
  const list = allTasks();
  const idx = list.findIndex((t) => t.id === task.id);
  const wasDone = idx >= 0 && list[idx].status === "completed";
  if (idx >= 0) list[idx] = task; else list.push(task);
  const next = task.status === "completed" && !wasDone ? queueNext(task, list) : null;
  store.set("tasks", list);
  refresh();
  return next;
}

export function nextMessage(next) {
  return next ? "Next one is due " + formatDate(next.deadline) + "." : undefined;
}

export function toggleSubtask(taskId, subId) {
  store.update("tasks", (list) => list.map((t) => (t.id !== taskId ? t : {
    ...t, subtasks: (t.subtasks || []).map((st) => (st.id === subId ? { ...st, done: !st.done } : st)),
  })));
}

export function removeTask(id) {
  store.set("tasks", allTasks().filter((t) => t.id !== id));
  refresh();
}

export function toggleComplete(id) {
  const list = allTasks();
  const t = list.find((x) => x.id === id);
  if (!t) return;
  if (t.status === "completed") {
    t.status = "not-started";
    t.completedAt = null;
  } else {
    t.status = "completed";
    t.completedAt = new Date().toISOString();
    streak.recordCompletion();
  }
  const next = t.status === "completed" ? queueNext(t, list) : null;
  store.set("tasks", list);
  refresh();
  if (t.status === "completed") toast.success("Task completed", next ? t.title + " · " + nextMessage(next) : t.title);
}
