/* Tasks — shape:
     { id, title, subject, description, deadline (YYYY-MM-DD),
       priority: critical|high|medium|low,
       status:   not-started|in-progress|completed,
       createdAt, completedAt } */

import { store } from "./storage.js";
import { refresh, streak } from "./engine.js";
import { uid } from "./util.js";
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
    createdAt: new Date().toISOString(), completedAt: null,
    ...fields,
  };
}

export function saveTask(task) {
  const list = allTasks();
  const idx = list.findIndex((t) => t.id === task.id);
  if (idx >= 0) list[idx] = task; else list.push(task);
  store.set("tasks", list);
  refresh();
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
  store.set("tasks", list);
  refresh();
  if (t.status === "completed") toast.success("Task completed", t.title);
}
