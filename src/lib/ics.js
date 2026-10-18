/* =========================================================
   Calendar export (.ics, RFC 5545).

   One file that Google Calendar, Apple Calendar and Outlook
   can import:
     • every unfinished task with a deadline → an all-day event
     • every timetable class → a weekly repeating event

   Class times are "floating" (no time zone): a calendar app
   shows 09:00 as 09:00 wherever it is, as the timetable does.
   ========================================================= */

import { store } from "./storage.js";
import { allTasks, PRIORITY } from "./tasks.js";
import { allClasses, DAYS } from "./timetable.js";
import { parseISODate, toISODate } from "./util.js";
import { toast } from "./toast.js";

const BYDAY = { Monday: "MO", Tuesday: "TU", Wednesday: "WE", Thursday: "TH", Friday: "FR", Saturday: "SA", Sunday: "SU" };

/* Commas, semicolons, backslashes and line breaks are escaped in text. */
const esc = (s) => String(s == null ? "" : s)
  .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const ymd = (iso) => iso.replace(/-/g, "");
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

/* Lines longer than 75 bytes are folded: CRLF + one space, never inside
   a multi-byte character. */
function fold(line) {
  const enc = new TextEncoder();
  const out = [];
  let part = "", bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) { out.push(part); part = ""; bytes = 0; }
    part += ch; bytes += n;
  }
  out.push(part);
  return out.join("\r\n ");
}

function taskEvent(t, now) {
  const start = parseISODate(t.deadline);
  const end = toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1));
  const details = [
    t.subject && "Subject: " + t.subject,
    "Priority: " + (PRIORITY[t.priority] || PRIORITY.medium).label,
    (t.subtasks || []).length && "Checklist:\n" + t.subtasks.map((s) => (s.done ? "[x] " : "[ ] ") + s.text).join("\n"),
    t.description,
  ].filter(Boolean).join("\n");
  return [
    "BEGIN:VEVENT",
    "UID:" + t.id + "@synora",
    "DTSTAMP:" + now,
    "DTSTART;VALUE=DATE:" + ymd(t.deadline),
    "DTEND;VALUE=DATE:" + ymd(end),
    /* "DBMS: Lab record", unless the title already names the subject */
    "SUMMARY:" + esc((t.subject && !t.title.toLowerCase().includes(t.subject.toLowerCase()) ? t.subject + ": " : "") + t.title),
    "DESCRIPTION:" + esc(details),
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ];
}

/* The class's first day: its weekday in the current week (Monday first). */
function firstDay(dayName) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + DAYS.indexOf(dayName));
  return ymd(toISODate(d));
}

const hhmm = (t) => String(t || "").replace(":", "").slice(0, 4).padEnd(4, "0") + "00";

function classEvent(c, now) {
  const subject = store.subjects.nameOf(c.subjectId) || "Class";
  const day = firstDay(c.day);
  const end = c.endTime && c.endTime > c.startTime ? c.endTime : c.startTime;
  return [
    "BEGIN:VEVENT",
    "UID:" + c.id + "@synora",
    "DTSTAMP:" + now,
    "DTSTART:" + day + "T" + hhmm(c.startTime),
    "DTEND:" + day + "T" + hhmm(end),
    "RRULE:FREQ=WEEKLY;BYDAY=" + BYDAY[c.day],
    "SUMMARY:" + esc(subject),
    c.room ? "LOCATION:" + esc(c.room) : null,
    c.teacher ? "DESCRIPTION:" + esc("Teacher: " + c.teacher) : null,
    "END:VEVENT",
  ].filter(Boolean);
}

/* The calendar as text, plus how many events of each kind it holds. */
export function buildCalendar({ tasks = true, classes = true } = {}) {
  const now = stamp();
  const taskList = tasks ? allTasks().filter((t) => t.deadline && t.status !== "completed" && parseISODate(t.deadline)) : [];
  const classList = classes
    ? allClasses().filter((c) => BYDAY[c.day] && /^\d{2}:\d{2}/.test(c.startTime || "") && store.subjects.byId(c.subjectId))
    : [];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Synora//Synora student planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Synora",
    ...taskList.flatMap((t) => taskEvent(t, now)),
    ...classList.flatMap((c) => classEvent(c, now)),
    "END:VCALENDAR",
  ];
  return { text: lines.map(fold).join("\r\n") + "\r\n", tasks: taskList.length, classes: classList.length };
}

const plural = (n, one) => n + " " + one + (n === 1 ? "" : "s");

/* Builds the file and saves it through the browser's normal download,
   saying what went in — or that there was nothing to put in. */
export function exportCalendar(options, filename = "synora.ics") {
  const cal = buildCalendar(options);
  if (!cal.tasks && !cal.classes) {
    toast.info("Nothing to export yet",
      options && options.tasks === false ? "Add classes to your timetable first." : "Add a task with a deadline, or a class, first.");
    return;
  }
  const url = URL.createObjectURL(new Blob([cal.text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const what = [cal.tasks && plural(cal.tasks, "deadline"), cal.classes && plural(cal.classes, "weekly class")].filter(Boolean).join(" and ");
  toast.success("Calendar file saved", what + ". Open it, or import it into Google Calendar, Apple Calendar or Outlook.");
}
