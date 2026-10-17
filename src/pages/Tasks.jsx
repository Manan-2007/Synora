import { useState } from "react";
import Icon from "../components/Icon.jsx";
import TaskRow from "../components/tasks/TaskRow.jsx";
import { useTaskForm, useDeleteTask } from "../components/tasks/TaskForm.jsx";
import useStore from "../hooks/useStore.js";
import { PRIORITY, allTasks, toggleComplete } from "../lib/tasks.js";
import { daysUntil } from "../lib/util.js";

const VIEWS = ["all", "today", "upcoming", "overdue", "completed"];

const EMPTY = {
  all: ["No tasks yet", "Add your first task and get your day organized."],
  today: ["Nothing due today", "Enjoy the breathing room — or plan ahead."],
  upcoming: ["Nothing upcoming", "Add a task with a deadline to see it here."],
  overdue: ["No overdue tasks", "You're on top of everything. Nice."],
  completed: ["Nothing completed yet", "Finished tasks will collect here."],
};

function inView(t, view) {
  const days = t.deadline ? daysUntil(t.deadline) : null;
  switch (view) {
    case "today": return t.status !== "completed" && days === 0;
    case "upcoming": return t.status !== "completed" && days !== null && days > 0;
    case "overdue": return t.status !== "completed" && days !== null && days < 0;
    case "completed": return t.status === "completed";
    default: return true;
  }
}

function compare(sort) {
  if (sort === "priority") return (a, b) => PRIORITY[a.priority].order - PRIORITY[b.priority].order;
  if (sort === "created") return (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  // Deadline: tasks without one sink to the bottom.
  return (a, b) => {
    const da = a.deadline || "9999", db = b.deadline || "9999";
    return da < db ? -1 : da > db ? 1 : 0;
  };
}

export default function Tasks() {
  useStore();
  const openTaskForm = useTaskForm();
  const deleteTask = useDeleteTask();
  const [view, setView] = useState("all");
  const [sort, setSort] = useState("deadline");
  const [query, setQuery] = useState("");

  const items = allTasks()
    .filter((t) => !query || (t.title + " " + (t.subject || "")).toLowerCase().indexOf(query) >= 0)
    .filter((t) => inView(t, view))
    .sort(compare(sort));

  const [emptyTitle, emptyText] = EMPTY[view];

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Everything on your plate, sorted by what matters now.</p>
        <div className="page__actions">
          <button type="button" className="btn btn--primary" onClick={() => openTaskForm(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            New task
          </button>
        </div>
      </div>

      <div>
        <div className="toolbar">
          <label className="search">
            <span className="visually-hidden">Search tasks</span>
            <Icon name="search" size={16} />
            <input className="input" type="search" placeholder="Search tasks…"
              onChange={(e) => setQuery(e.target.value.toLowerCase())} />
          </label>
          <select className="select select--sm" aria-label="Sort tasks" style={{ flex: "0 0 auto", width: "auto" }} value={sort}
            onChange={(e) => setSort(e.target.value)}>
            <option value="deadline">Sort: Deadline</option>
            <option value="priority">Sort: Priority</option>
            <option value="created">Sort: Newest</option>
          </select>
        </div>

        <div className="segmented" role="tablist" style={{ marginBottom: 16 }}>
          {VIEWS.map((v) => (
            <button key={v} role="tab" className={v === view ? "is-active" : undefined} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="card__body" style={{ padding: "8px 24px" }}>
            {items.length ? (
              <div className="tlist">
                {items.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggleComplete} onEdit={openTaskForm} onDelete={deleteTask} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <span className="empty__icon"><Icon name="check" size={26} /></span>
                <p className="empty__title">{emptyTitle}</p>
                <p className="empty__text">{emptyText}</p>
                {view === "all" && (
                  <button className="btn btn--primary" onClick={() => openTaskForm(null)}>
                    <Icon name="plus" size={16} />Add a task
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
