/* =========================================================
   Reminders — the browser's own notifications.

   While Synora is open (a tab, even in the background, or the
   installed app) it checks every 30 seconds and notifies:
     • 10 minutes before each class in today's timetable
     • once a day from 8 am: what's due today
   The focus timer uses notify() when a session ends.

   There's no push server, so nothing arrives while Synora is
   closed — the Settings card says so. The switch is per device
   (this browser's localStorage), like the permission itself.
   ========================================================= */

import { store } from "./storage.js";
import { allClasses, todayName } from "./timetable.js";
import { allTasks } from "./tasks.js";
import { todayISO } from "./util.js";

const KEY = "synora-reminders";      // { enabled }
const SHOWN = "synora-reminded";     // { date, keys: ["class:<id>", "due:<date>"] } — today's only
const CLASS_LEAD_MIN = 10;
const DIGEST_HOUR = 8;

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
}

export const supported = () => typeof window !== "undefined" && "Notification" in window;

/* "unsupported" | "blocked" | "off" | "on" */
export function reminderState() {
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return read(KEY, {}).enabled && Notification.permission === "granted" ? "on" : "off";
}

export function subscribeReminders(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === KEY) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

/* Asks for permission (the browser shows its prompt once) and switches on. */
export async function enableReminders() {
  if (!supported()) return "unsupported";
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  write(KEY, { enabled: permission === "granted" });
  emit();
  if (permission === "granted") checkReminders();
  return reminderState();
}

export function disableReminders() {
  write(KEY, { enabled: false });
  emit();
}

/* Shows one notification. The installed app (and Android Chrome) need the
   service worker to show it; a plain tab can do it directly. `tag` makes a
   repeat replace the earlier one instead of stacking. */
export async function notify(title, body, tag) {
  if (reminderState() !== "on") return false;
  const options = { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
  try {
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (reg) { await reg.showNotification(title, options); return true; }
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch {
    return false;
  }
}

/* Each reminder is shown once: remembered by key for today only. */
function once(key) {
  const today = todayISO();
  const shown = read(SHOWN, {});
  if (shown.date !== today) { write(SHOWN, { date: today, keys: [key] }); return true; }
  const keys = shown.keys || [];
  if (keys.includes(key)) return false;
  write(SHOWN, { date: today, keys: [...keys, key] });
  return true;
}

const minutesOf = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

export function checkReminders(now = new Date()) {
  if (reminderState() !== "on") return;
  const today = todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const c of allClasses()) {
    if (c.day !== todayName()) continue;
    const start = minutesOf(c.startTime);
    const name = store.subjects.nameOf(c.subjectId);
    if (start === null || !name) continue;
    const inMin = start - nowMin;
    if (inMin > 0 && inMin <= CLASS_LEAD_MIN && once("class:" + c.id)) {
      notify(name + " at " + c.startTime,
        "Starts in " + inMin + (inMin === 1 ? " minute" : " minutes") + (c.room ? " · " + c.room : ""), "class-" + c.id);
    }
  }

  if (now.getHours() >= DIGEST_HOUR) {
    const due = allTasks().filter((t) => t.deadline === today && t.status !== "completed");
    if (due.length && once("due:" + today)) {
      const names = due.slice(0, 3).map((t) => t.title).join(", ") + (due.length > 3 ? " and " + (due.length - 3) + " more" : "");
      notify(due.length === 1 ? "1 task due today" : due.length + " tasks due today", names, "due-today");
    }
  }
}

/* Runs the checks while the app is open; returns a stop function. */
export function startReminders() {
  checkReminders();
  const timer = setInterval(() => checkReminders(), 30000);
  return () => clearInterval(timer);
}

export function sendTestReminder() {
  return notify("Reminders are on", "You'll hear from Synora 10 minutes before each class and when work is due.", "test");
}
