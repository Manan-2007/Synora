/* Quick notes — shape: { id, title, body, category, createdAt, updatedAt } */

import { store } from "./storage.js";
import { refresh } from "./engine.js";

export function allNotes() {
  return store.get("notes");
}

export function getNote(id) {
  return allNotes().find((n) => n.id === id) || null;
}

export function saveNote(note) {
  const list = allNotes();
  const idx = list.findIndex((n) => n.id === note.id);
  if (idx >= 0) list[idx] = note; else list.push(note);
  store.set("notes", list);
  refresh();
}

export function removeNote(id) {
  store.set("notes", allNotes().filter((n) => n.id !== id));
  refresh();
}

/* Ticks or unticks the checklist item on one line of a note ("- [ ] …").
   updatedAt stays as it is: ticking a box shouldn't reorder the notes. */
export function toggleNoteTask(id, lineIndex) {
  store.update("notes", (list) => list.map((n) => {
    if (n.id !== id) return n;
    const lines = String(n.body || "").replace(/\r\n?/g, "\n").split("\n");
    if (lineIndex < 0 || lineIndex >= lines.length) return n;
    lines[lineIndex] = lines[lineIndex].replace(/^(\s*(?:[-*+]|\d+[.)])\s+)\[( |x|X)\]/,
      (m, lead, mark) => lead + (mark === " " ? "[x]" : "[ ]"));
    return { ...n, body: lines.join("\n") };
  }));
}
