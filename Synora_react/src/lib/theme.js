/* Theme contract (shared with the vanilla build):
     storage key   "synora-theme"
     values        "light" | "dark"
     applied as    <html data-theme="...">

   index.html applies it before the first paint; the app re-applies the
   stored value on every navigation, the way each vanilla page did when
   it loaded, and setTheme() changes it. */

import { KEYS } from "./storage.js";

const root = document.documentElement;
const listeners = new Set();

export function getTheme() {
  return root.getAttribute("data-theme") || "light";
}

function apply(theme) {
  if (theme === getTheme() && root.hasAttribute("data-theme")) return;
  root.setAttribute("data-theme", theme);
  listeners.forEach((fn) => fn());
}

/* Priority: the saved choice, else the operating system, else light. */
export function applyStoredTheme() {
  const saved = localStorage.getItem(KEYS.theme);
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  apply(saved || (systemPrefersDark ? "dark" : "light"));
}

export function setTheme(theme) {
  apply(theme);
  saveThemePreference(theme);
}

/* Remember a theme without switching to it now — the next page applies it. */
export function saveThemePreference(theme) {
  localStorage.setItem(KEYS.theme, theme);
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
