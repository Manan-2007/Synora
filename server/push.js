/* =========================================================
   Push notifications — reminders that arrive with Synora closed.

   A browser that turns reminders on subscribes to Web Push and
   sends its subscription (plus its time zone) here. A scheduler
   calls /api/push/tick every ~10 minutes (GitHub Actions, and a
   daily Vercel cron as a backstop); each tick, for every
   subscribed account:
     • classes starting in the next 20 minutes → one push each
     • from 7 am, once a day → what's due today
   push_sent remembers what went out, so a class is announced once
   however many ticks see it.

   Needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (npx web-push
   generate-vapid-keys) and CRON_SECRET in the environment.
   ========================================================= */

import crypto from "node:crypto";
import webpush from "web-push";
import { pool } from "./db.js";

export const pushReady = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let configuredKeys = false;
function configure() {
  if (configuredKeys || !pushReady()) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:synora@example.com",
    process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  configuredKeys = true;
}

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const validTz = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };

export async function subscribe(userId, sub, tz) {
  const endpoint = String(sub && sub.endpoint || "");
  const keys = (sub && sub.keys) || {};
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !keys.p256dh || !keys.auth) return false;
  await pool.query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, tz) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), tz = VALUES(tz)`,
    [sha(endpoint), userId, endpoint, String(keys.p256dh).slice(0, 200), String(keys.auth).slice(0, 100),
      validTz(tz) ? String(tz).slice(0, 60) : "Asia/Kolkata"],
  );
  return true;
}

export async function unsubscribe(userId, endpoint) {
  await pool.query("DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?", [sha(String(endpoint || "")), userId]);
}

/* Sends one message to every device of a user; drops subscriptions the
   push service says are gone. Returns how many were delivered. */
export async function sendToUser(userId, message) {
  configure();
  const [subs] = await pool.query("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?", [userId]);
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(message), { TTL: 1800, urgency: "high" });
      ok++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) await pool.query("DELETE FROM push_subscriptions WHERE id = ?", [s.id]);
      else console.error("Push failed:", err.statusCode || err.name, String(err.body || err.message).slice(0, 200));
    }
  }
  return ok;
}

/* "Monday", "2026-10-19", minutes since midnight — in the user's zone. */
function localNow(tz, now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, weekday: "long", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map((p) => [p.type, p.value]));
  return { day: parts.weekday, date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

async function once(userId, key) {
  const [r] = await pool.query("INSERT IGNORE INTO push_sent (user_id, `key`) VALUES (?, ?)", [userId, key.slice(0, 120)]);
  return r.affectedRows === 1;
}

export async function tick(now = new Date()) {
  if (!pushReady()) return { skipped: "not-set-up" };
  const [users] = await pool.query(
    `SELECT s.user_id, MIN(s.tz) AS tz, MIN(p.time_format) AS fmt
     FROM push_subscriptions s LEFT JOIN profiles p ON p.user_id = s.user_id GROUP BY s.user_id`);
  let sent = 0;
  for (const { user_id: userId, tz, fmt } of users) {
    /* The account's 12/24-hour choice; "auto" reads as 12-hour, the usual habit on phones. */
    const show = (hhmm) => {
      if (fmt === "24h") return hhmm;
      const [hh, mm] = hhmm.split(":").map(Number);
      return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
    };
    const t = localNow(tz, now);

    const [classes] = await pool.query(
      `SELECT c.id, TIME_FORMAT(c.start_time, '%H:%i') AS start, c.room, s.name
       FROM timetable_classes c JOIN subjects s ON s.user_id = c.user_id AND s.id = c.subject_id
       WHERE c.user_id = ? AND c.day = ? AND c.start_time IS NOT NULL`, [userId, t.day]);
    for (const c of classes) {
      const [h, m] = c.start.split(":").map(Number);
      const inMin = h * 60 + m - t.minutes;
      if (inMin > 0 && inMin <= 20 && await once(userId, `class:${c.id}:${t.date}`)) {
        sent += await sendToUser(userId, {
          title: `${c.name} at ${show(c.start)}`,
          body: `Starts in ${inMin} minute${inMin === 1 ? "" : "s"}${c.room ? " · " + c.room : ""}`,
          tag: "class-" + c.id, url: "/timetable",
        });
      }
    }

    if (t.minutes >= 7 * 60) {
      const [due] = await pool.query(
        "SELECT title FROM tasks WHERE user_id = ? AND deadline = ? AND status <> 'completed' ORDER BY position", [userId, t.date]);
      if (due.length && await once(userId, `due:${t.date}`)) {
        const names = due.slice(0, 3).map((d) => d.title).join(", ") + (due.length > 3 ? ` and ${due.length - 3} more` : "");
        sent += await sendToUser(userId, {
          title: due.length === 1 ? "1 task due today" : `${due.length} tasks due today`, body: names, tag: "due-today", url: "/tasks",
        });
      }
    }
  }
  await pool.query("DELETE FROM push_sent WHERE sent_at < NOW() - INTERVAL 3 DAY");
  return { users: users.length, sent };
}
