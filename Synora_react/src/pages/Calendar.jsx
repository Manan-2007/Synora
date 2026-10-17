import { useState } from "react";
import Icon from "../components/Icon.jsx";
import TaskRow from "../components/tasks/TaskRow.jsx";
import { useTaskForm } from "../components/tasks/TaskForm.jsx";
import { useModal, useModalClose } from "../components/modal/ModalProvider.jsx";
import useStore from "../hooks/useStore.js";
import { PRIORITY, allTasks, toggleComplete } from "../lib/tasks.js";
import { todayISO, formatDate } from "../lib/util.js";

/* A month view that shares the task system: any task with a deadline
   shows up on its day. Clicking a day lists what's due and lets you add
   a task for that date. */

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function tasksByDate() {
  const map = {};
  allTasks().forEach((t) => {
    if (!t.deadline) return;
    (map[t.deadline] = map[t.deadline] || []).push(t);
  });
  return map;
}

function DayDialog({ iso, onAddTask }) {
  useStore();
  const close = useModalClose();
  const items = (tasksByDate()[iso] || []).sort((a, b) => PRIORITY[a.priority].order - PRIORITY[b.priority].order);

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

export default function Calendar() {
  useStore();
  const modal = useModal();
  const openTaskForm = useTaskForm();
  const [now] = useState(() => new Date());
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  function shift(delta) {
    setView(({ year, month }) => {
      const m = month + delta;
      if (m < 0) return { year: year - 1, month: 11 };
      if (m > 11) return { year: year + 1, month: 0 };
      return { year, month: m };
    });
  }

  function openDay(iso) {
    modal.open({
      title: formatDate(iso),
      content: <DayDialog iso={iso} onAddTask={(day) => openTaskForm(null, { deadline: day })} />,
    });
  }

  const byDate = tasksByDate();
  const today = todayISO();
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const daysPrev = new Date(view.year, view.month, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysPrev - i, muted: true });   // previous month
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - (firstDay + daysInMonth) + 1, muted: true });

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Your deadlines on one timeline — click a day to see what's due.</p>
      </div>

      <div>
        <div className="card card--pad">
          <div className="cal__head">
            <span className="cal__month">{MONTHS[view.month] + " " + view.year}</span>
            <div className="cal__nav">
              <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
                <Icon name="chevronLeft" size={18} />
              </button>
              <button type="button" className="btn btn--ghost btn--sm"
                onClick={() => setView({ year: now.getFullYear(), month: now.getMonth() })}>Today</button>
              <button type="button" className="icon-btn" aria-label="Next month" onClick={() => shift(1)}>
                <Icon name="chevronRight" size={18} />
              </button>
            </div>
          </div>
          <div className="cal-grid">
            {DOW.map((d) => <span key={d} className="cal-dow">{d}</span>)}
          </div>
          <div className="cal-grid" style={{ marginTop: 6 }}>
            {cells.map((c, i) => {
              if (c.muted) {
                return <div key={i} className="cal-cell cal-cell--muted"><span className="cal-cell__num">{c.day}</span></div>;
              }
              const iso = view.year + "-" + String(view.month + 1).padStart(2, "0") + "-" + String(c.day).padStart(2, "0");
              const items = byDate[iso] || [];
              return (
                <button key={i} type="button" onClick={() => openDay(iso)}
                  className={"cal-cell" + (iso === today ? " cal-cell--today" : "") + (items.length ? " cal-cell--has" : "")}>
                  <span className="cal-cell__num">{c.day}</span>
                  {items.slice(0, 2).map((t) => {
                    const cls = t.status === "completed" ? "" :
                      t.priority === "critical" ? " cal-chip--critical" :
                      t.priority === "high" ? " cal-chip--high" : "";
                    return <span key={t.id} className={"cal-chip" + cls}>{t.title}</span>;
                  })}
                  {items.length > 2 && <span className="cal-cell__more">{"+" + (items.length - 2) + " more"}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
