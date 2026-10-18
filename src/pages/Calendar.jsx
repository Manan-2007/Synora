import { useState } from "react";
import Icon from "../components/Icon.jsx";
import TaskRow from "../components/tasks/TaskRow.jsx";
import { useTaskForm } from "../components/tasks/TaskForm.jsx";
import { useModal, useModalClose } from "../components/modal/ModalProvider.jsx";
import useStore from "../hooks/useStore.js";
import { store } from "../lib/storage.js";
import { PRIORITY, allTasks, toggleComplete } from "../lib/tasks.js";
import { allClasses, DAYS, timeLabel } from "../lib/timetable.js";
import { subjectVar } from "../lib/colors.js";
import { exportCalendar } from "../lib/ics.js";
import { todayISO, formatDate, toISODate } from "../lib/util.js";

/* Every task with a deadline, on its day — as a month grid, or as a week
   that also shows that week's classes. Clicking a day lists what's due and
   lets you add a task for that date. Chips take their subject's colour;
   a red dot marks critical and high-priority work. */

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VIEW_KEY = "synora-calendar-view";   // this browser's choice only

function tasksByDate() {
  const map = {};
  allTasks().forEach((t) => {
    if (!t.deadline) return;
    (map[t.deadline] = map[t.deadline] || []).push(t);
  });
  for (const list of Object.values(map)) list.sort((a, b) => PRIORITY[a.priority].order - PRIORITY[b.priority].order);
  return map;
}

function Chip({ task, full = false }) {
  const done = task.status === "completed";
  const urgent = !done && (task.priority === "critical" || task.priority === "high");
  const color = store.subjects.colorOfName(task.subject);
  return (
    <span className={"cal-chip" + (done ? " is-done" : "") + (full ? " cal-chip--full" : "")}
      style={subjectVar(color || "stone")}
      title={task.title + (task.subject ? " · " + task.subject : "") + " · " + PRIORITY[task.priority].label + (done ? " · done" : "")}>
      {urgent && <span className="cal-chip__urgent" aria-label={PRIORITY[task.priority].label + " priority"}></span>}
      <span className="cal-chip__text">{task.title}</span>
    </span>
  );
}

function DayDialog({ iso, onAddTask }) {
  useStore();
  const close = useModalClose();
  const items = tasksByDate()[iso] || [];
  return (
    <>
      <div className="modal__body">
        {items.length ? (
          <div className="tlist">
            {items.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={(id) => { toggleComplete(id); close(); }} />
            ))}
          </div>
        ) : (
          <p className="muted">Nothing scheduled for this day.</p>
        )}
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Close</button>
        <button type="button" className="btn btn--primary" onClick={() => { close(); onAddTask(iso); }}>Add task</button>
      </div>
    </>
  );
}

const isoOf = (d) => toISODate(d);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d) => addDays(d, -d.getDay());

function MonthView({ cursor, byDate, today, openDay }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPrev = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysPrev - i, muted: true });   // previous month
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - (firstDay + daysInMonth) + 1, muted: true });

  return (
    <>
      <div className="cal-grid">
        {DOW.map((d) => <span key={d} className="cal-dow">{d}</span>)}
      </div>
      <div className="cal-grid" style={{ marginTop: 6 }}>
        {cells.map((c, i) => {
          if (c.muted) {
            return <div key={i} className="cal-cell cal-cell--muted"><span className="cal-cell__num">{c.day}</span></div>;
          }
          const iso = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(c.day).padStart(2, "0");
          const items = byDate[iso] || [];
          const label = formatDate(iso) + (items.length ? ": " + items.length + " due" : "");
          return (
            <button key={i} type="button" onClick={() => openDay(iso)} aria-label={label}
              className={"cal-cell" + (iso === today ? " cal-cell--today" : "") + (items.length ? " cal-cell--has" : "")}>
              <span className="cal-cell__num">{c.day}</span>
              {items.slice(0, 2).map((t) => <Chip key={t.id} task={t} />)}
              {items.length > 2 && <span className="cal-cell__more">{"+" + (items.length - 2) + " more"}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

function WeekView({ cursor, byDate, today, openDay }) {
  const start = startOfWeek(cursor);
  const classes = allClasses();
  return (
    <div className="cal-week">
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i);
        const iso = isoOf(date);
        const dayName = DAYS[(date.getDay() + 6) % 7];
        const dayClasses = classes
          .filter((c) => c.day === dayName && store.subjects.nameOf(c.subjectId))
          .sort((a, b) => ((a.startTime || "") < (b.startTime || "") ? -1 : 1));
        const items = byDate[iso] || [];
        return (
          <section key={iso} className={"cal-week__day" + (iso === today ? " is-today" : "")} aria-label={formatDate(iso)}>
            <button type="button" className="cal-week__head" onClick={() => openDay(iso)}
              aria-label={formatDate(iso) + ": see or add tasks"}>
              <span className="cal-week__dow">{DOW[date.getDay()]}</span>
              <span className="cal-week__num">{date.getDate()}</span>
            </button>
            {items.length > 0 && (
              <div className="cal-week__group">
                {items.map((t) => <Chip key={t.id} task={t} full />)}
              </div>
            )}
            {dayClasses.length > 0 && (
              <div className="cal-week__group">
                {dayClasses.map((c) => (
                  <span key={c.id} className="cal-class" style={subjectVar(store.subjects.byId(c.subjectId)?.color)}>
                    <span className="cal-class__time">{timeLabel(c)}</span>
                    <span className="cal-class__name">{store.subjects.nameOf(c.subjectId)}</span>
                  </span>
                ))}
              </div>
            )}
            {!items.length && !dayClasses.length && <span className="cal-week__empty">Free</span>}
          </section>
        );
      })}
    </div>
  );
}

export default function Calendar() {
  useStore();
  const modal = useModal();
  const openTaskForm = useTaskForm();
  const [now] = useState(() => new Date());
  const [cursor, setCursor] = useState(now);
  const [view, setViewState] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) === "week" ? "week" : "month"; } catch { return "month"; }
  });

  function setView(v) {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage blocked */ }
  }

  function shift(delta) {
    setCursor((c) => (view === "week"
      ? addDays(c, delta * 7)
      : new Date(c.getFullYear(), c.getMonth() + delta, 1)));
  }

  function openDay(iso) {
    modal.open({
      title: formatDate(iso),
      content: <DayDialog iso={iso} onAddTask={(day) => openTaskForm(null, { deadline: day })} />,
    });
  }

  const byDate = tasksByDate();
  const today = todayISO();
  const weekStart = startOfWeek(cursor);
  const weekEnd = addDays(weekStart, 6);
  const title = view === "week"
    ? (weekStart.getMonth() === weekEnd.getMonth()
      ? weekStart.getDate() + "–" + weekEnd.getDate() + " " + MONTHS[weekEnd.getMonth()] + " " + weekEnd.getFullYear()
      : weekStart.getDate() + " " + MONTHS[weekStart.getMonth()].slice(0, 3) + " – " +
        weekEnd.getDate() + " " + MONTHS[weekEnd.getMonth()].slice(0, 3) + " " + weekEnd.getFullYear())
    : MONTHS[cursor.getMonth()] + " " + cursor.getFullYear();
  const subjects = store.subjects.all();

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Your deadlines on one timeline — click a day to see what's due.</p>
        <div className="page__actions">
          <button type="button" className="btn btn--ghost" onClick={() => exportCalendar({ tasks: true, classes: true })}
            title="Deadlines and weekly classes as an .ics file">
            <Icon name="download" size={16} />Export to calendar
          </button>
        </div>
      </div>

      <div>
        <div className="card card--pad">
          <div className="cal__head">
            <span className="cal__month">{title}</span>
            <div className="cal__nav">
              <div className="segmented cal__views" role="group" aria-label="Calendar view">
                <button type="button" className={view === "month" ? "is-active" : ""}
                  aria-pressed={view === "month"} onClick={() => setView("month")}>Month</button>
                <button type="button" className={view === "week" ? "is-active" : ""}
                  aria-pressed={view === "week"} onClick={() => setView("week")}>Week</button>
              </div>
              <button type="button" className="icon-btn" aria-label={view === "week" ? "Previous week" : "Previous month"}
                onClick={() => shift(-1)}>
                <Icon name="chevronLeft" size={18} />
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCursor(new Date())}>Today</button>
              <button type="button" className="icon-btn" aria-label={view === "week" ? "Next week" : "Next month"}
                onClick={() => shift(1)}>
                <Icon name="chevronRight" size={18} />
              </button>
            </div>
          </div>

          {view === "week"
            ? <WeekView cursor={cursor} byDate={byDate} today={today} openDay={openDay} />
            : <MonthView cursor={cursor} byDate={byDate} today={today} openDay={openDay} />}

          {subjects.length > 0 && (
            <div className="cal-legend" aria-label="Legend">
              {subjects.map((s) => (
                <span key={s.id} className="cal-legend__item">
                  <span className="subject-dot" style={subjectVar(s.color)} aria-hidden="true"></span>{s.name}
                </span>
              ))}
              <span className="cal-legend__item">
                <span className="cal-chip__urgent" aria-hidden="true"></span>Critical or high priority
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
