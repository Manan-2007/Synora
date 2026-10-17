/* Small shared helpers — no DOM, no storage, safe to use anywhere. */

/* Reasonably-unique id without any external library. */
export function uid(prefix) {
  return (prefix || "id") + "-" +
    Date.now().toString(36) + "-" +
    Math.random().toString(36).slice(2, 8);
}

/* Local (not UTC) YYYY-MM-DD for a Date — the format the
   <input type="date"> fields and deadline comparisons use. */
export function toISODate(date) {
  const d = date || new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

export function todayISO() {
  return toISODate(new Date());
}

/* Parse a YYYY-MM-DD string as a LOCAL date at midnight. */
export function parseISODate(iso) {
  if (!iso) return null;
  const parts = String(iso).split("-");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/* Whole-day difference: target - today. Negative = in the past. */
export function daysUntil(iso) {
  const target = parseISODate(iso);
  if (!target) return null;
  const today = parseISODate(todayISO());
  return Math.round((target - today) / 86400000);
}

/* Friendly relative label for a deadline. */
export function relativeDay(iso) {
  const n = daysUntil(iso);
  if (n === null) return "";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return Math.abs(n) + " days ago";
  return "In " + n + " days";
}

/* e.g. "9 Aug 2026" */
export function formatDate(iso) {
  const d = parseISODate(iso);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* ONE definition of how a person's initials are formed, so the sidebar,
   topbar, dashboard, settings and onboarding can never disagree:

     initials("Manan", "Kochhar")   → "MK"
     initials("Arshpreet", "Kaur")  → "AK"
     initials("Manan")              → "M"
     initials("Aarav Sharma")       → "AS"   (single string form)

   FIRST letter of the first name + FIRST letter of the last name. */
export function initials(firstName, lastName) {
  let first = String(firstName == null ? "" : firstName).trim();
  let last = String(lastName == null ? "" : lastName).trim();

  if (!last && first.indexOf(" ") !== -1) {
    const parts = first.split(/\s+/);
    first = parts[0];
    last = parts[parts.length - 1];
  }

  const out = (first.charAt(0) || "") + (last.charAt(0) || "");
  return out.toUpperCase() || "S";
}

/* "Manan Kochhar" from the two stored halves. */
export function fullName(firstName, lastName) {
  return [firstName, lastName]
    .map((s) => String(s == null ? "" : s).trim())
    .filter(Boolean)
    .join(" ");
}

export function plural(n, word, suffix = "s") {
  return n === 1 ? word : word + suffix;
}

/* Deliberately permissive: something@something.something. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
