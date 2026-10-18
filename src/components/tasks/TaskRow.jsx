import Icon from "../Icon.jsx";
import { PRIORITY } from "../../lib/tasks.js";
import { daysUntil, relativeDay } from "../../lib/util.js";
import { store } from "../../lib/storage.js";
import { subjectVar } from "../../lib/colors.js";

/* One task row — the Tasks page, the dashboard and the calendar's day
   dialog all use it. Without onEdit/onDelete it is view-only. */
export default function TaskRow({ task, onToggle, onEdit, onDelete }) {
  const done = task.status === "completed";
  const p = PRIORITY[task.priority] || PRIORITY.medium;

  let due = null;
  if (task.deadline && !done) {
    const days = daysUntil(task.deadline);
    const cls = days < 0 ? "due-over" : days <= 1 ? "due-soon" : "";
    due = <span className={cls}>{relativeDay(task.deadline)}</span>;
  }

  return (
    <div className={"titem" + (done ? " is-done" : "")}>
      <button type="button" className="tcheck" aria-label="Toggle complete" aria-pressed={done}
        onClick={() => onToggle(task.id)}>
        <Icon name="check" size={12} />
      </button>
      <span className="titem__main">
        <span className="titem__title">{task.title}</span>
        <span className="titem__meta">
          {task.subject && (() => {
            const color = store.subjects.colorOfName(task.subject);
            return color
              ? <span className="badge badge--subject" style={subjectVar(color)}><span className="subject-dot"></span>{task.subject}</span>
              : <span className="badge badge--neutral">{task.subject}</span>;
          })()}
          <span className={"badge " + p.badge}><span className="badge__dot"></span>{p.label}</span>
          {due}
          {done && task.completedAt && <span>Done</span>}
        </span>
      </span>
      {onEdit && (
        <span className="titem__actions">
          <button type="button" className="icon-btn" aria-label="Edit task" onClick={() => onEdit(task)}>
            <Icon name="edit" size={15} />
          </button>
          <button type="button" className="icon-btn" aria-label="Delete task" onClick={() => onDelete(task)}>
            <Icon name="trash" size={15} />
          </button>
        </span>
      )}
    </div>
  );
}
