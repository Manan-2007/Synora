/* =========================================================
   How times are shown: "2:30 PM" or "14:30".

   Times are always STORED as 24-hour "HH:MM" (what <input type=time>
   gives); this only changes what's displayed. The choice lives in the
   profile (Settings → Appearance), so it follows the account to every
   device: "12h", "24h", or "auto" — whatever this device's language
   settings normally use.
   ========================================================= */

import { profile } from "./storage.js";

let deviceUses12h = null;
function device12h() {
  if (deviceUses12h === null) {
    try {
      const o = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
      deviceUses12h = o.hour12 === true || o.hourCycle === "h12" || o.hourCycle === "h11";
    } catch { deviceUses12h = false; }
  }
  return deviceUses12h;
}

export function uses12h() {
  const pref = profile.get().timeFormat;
  return pref === "12h" ? true : pref === "24h" ? false : device12h();
}

/* "14:05" → "2:05 PM" (12-hour) or "14:05" (24-hour). */
export function formatTime(hhmm, twelve = uses12h()) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return hhmm || "";
  const h = Number(m[1]);
  if (!twelve) return String(h).padStart(2, "0") + ":" + m[2];
  return (h % 12 || 12) + ":" + m[2] + " " + (h < 12 ? "AM" : "PM");
}

/* "09:00–10:00", or "9:00–10:00 AM" / "11:00 AM–1:00 PM" in 12-hour. */
export function formatRange(start, end, twelve = uses12h()) {
  if (!start) return "";
  if (!end) return formatTime(start, twelve);
  if (!twelve) return formatTime(start, false) + "–" + formatTime(end, false);
  const a = formatTime(start, true), b = formatTime(end, true);
  const same = a.slice(-2) === b.slice(-2);
  return (same ? a.slice(0, -3) : a) + "–" + b;
}

/* A whole hour for the timetable's side axis: "2 pm" or "14:00". */
export function hourLabel(h, twelve = uses12h()) {
  if (!twelve) return String(h % 24).padStart(2, "0") + ":00";
  return (h % 12 || 12) + (h % 24 < 12 ? " am" : " pm");
}

/* A Date's time of day, in the chosen style. */
export const clockTime = (d) => formatTime(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"));
