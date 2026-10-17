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
