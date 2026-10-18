/* =========================================================
   Reminders — the browser's own notifications.

   While Synora is open (a tab, even in the background, or the
   installed app) it checks every 30 seconds and notifies:
     • 10 minutes before each class in today's timetable
     • once a day from 8 am: what's due today
   The focus timer uses notify() when a session ends.

   With Synora closed, the server sends the same reminders as Web
   Push (server/push.js) to every browser that subscribed below —
   on iPhone that needs the installed app. The switch is per device
   (this browser's localStorage), like the permission itself.
   ========================================================= */

import { store } from "./storage.js";
import { allClasses, todayName } from "./timetable.js";
import { allTasks } from "./tasks.js";
import { todayISO } from "./util.js";
import { api } from "./api.js";
import { formatTime } from "./time.js";

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
  if (permission === "granted") { checkReminders(); await enablePush(); }
  return reminderState();
}

export function disableReminders() {
  write(KEY, { enabled: false });
  emit();
  disablePush();
}

/* ---- Push: reminders with Synora closed ----
   "on" | "off" | "unsupported" | "install" (iPhone/iPad: only the
   home-screen app can receive pushes) | "not-set-up" (no keys on the
   server) | "signed-out" (not connected to the database). */
let pushStatus = "off";
export const getPushStatus = () => pushStatus;
function setPush(s) { pushStatus = s; emit(); }

const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg || null;
}

function keyBytes(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/* One at a time: two overlapping subscribe() calls (Settings opening while
   reminders are switched on) would leave the server with a stale copy. */
let pushing = null;
export function enablePush() {
  if (!pushing) pushing = subscribePush().finally(() => { pushing = null; });
  return pushing;
}

async function subscribePush() {
  if (!("PushManager" in window) || !("serviceWorker" in navigator)) return setPush(ios() && !standalone() ? "install" : "unsupported");
  if (ios() && !standalone()) return setPush("install");
  const token = api.token();
  if (!token) return setPush("signed-out");
  try {
    const keyRes = await api.pushKey();
    if (!keyRes.ok) return setPush("not-set-up");
    const reg = await registration();
    if (!reg) return setPush("unsupported");          // no service worker (the dev server)
    const sub = (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(keyRes.body.key) }));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const saved = await api.pushSubscribe(sub.toJSON(), tz, token);
    setPush(saved.ok ? "on" : "off");
  } catch {
    setPush("off");
  }
}

export async function disablePush() {
  try {
    const reg = await registration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) {
      const token = api.token();
      if (token) await api.pushUnsubscribe(sub.endpoint, token);
      await sub.unsubscribe();
    }
  } catch { /* already gone */ }
  setPush("off");
}

export async function sendTestPush() {
  const token = api.token();
  if (!token) return false;
  const r = await api.pushTest(token);
  return r.ok && r.body && r.body.sent > 0;
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
      notify(name + " at " + formatTime(c.startTime),
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
  /* Re-send this browser's subscription quietly (a new sign-in, a renewed
     subscription), so the server keeps pushing to it. */
  if (reminderState() === "on") enablePush();
  const timer = setInterval(() => checkReminders(), 30000);
  return () => clearInterval(timer);
}

export function sendTestReminder() {
  return notify("Reminders are on", "You'll hear from Synora 10 minutes before each class and when work is due.", "test");
}
