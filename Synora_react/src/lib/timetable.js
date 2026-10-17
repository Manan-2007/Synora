/* Timetable — an entry is { id, subjectId, day, startTime, endTime, room, teacher }.
   It stores the subject's ID, not its name, so renaming a subject renames
   it here too and the dashboard can match today's classes to real subjects. */

import { store } from "./storage.js";
import { refresh } from "./engine.js";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* JS counts Sunday as day 0; the timetable week starts on Monday. */
export function todayName() {
  return DAYS[(new Date().getDay() + 6) % 7];
}

export function allClasses() {
  return store.get("timetable");
}

export function getClass(id) {
  return allClasses().find((c) => c.id === id) || null;
}

export function saveClass(entry) {
  const list = allClasses();
  const idx = list.findIndex((c) => c.id === entry.id);
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  store.set("timetable", list);
  refresh();
}

export function removeClass(id) {
  store.set("timetable", allClasses().filter((c) => c.id !== id));
  refresh();
}

export function timeLabel(entry) {
  if (!entry.startTime) return "";
  return entry.startTime + (entry.endTime ? "–" + entry.endTime : "");
}
