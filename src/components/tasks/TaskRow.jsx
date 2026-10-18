import { useState } from "react";
import Icon from "../Icon.jsx";
import { PRIORITY, REPEAT, repeatOf, toggleSubtask } from "../../lib/tasks.js";
import { daysUntil, relativeDay } from "../../lib/util.js";
import { store } from "../../lib/storage.js";
import { subjectVar } from "../../lib/colors.js";

/* One task row — the Tasks page, the dashboard and the calendar's day
   dialog all use it. Without onEdit/onDelete it is view-only. */
export default function TaskRow({ task, onToggle, onEdit, onDelete }) {
  const done = task.status === "completed";
  const p = PRIORITY[task.priority] || PRIORITY.medium;
  const [open, setOpen] = useState(false);
  const steps = task.subtasks || [];
  const stepsDone = steps.filter((st) => st.done).length;
  const repeat = repeatOf(task);

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
      <div className="titem__main">
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
          {repeat !== "none" && (
            <span className="titem__repeat" title={REPEAT[repeat].label}><Icon name="repeat" size={12} />{REPEAT[repeat].short}</span>
          )}
          {steps.length > 0 && (
            <button type="button" className={"titem__steps" + (stepsDone === steps.length ? " is-complete" : "")}
              aria-expanded={open} onClick={() => setOpen((o) => !o)}
              aria-label={stepsDone + " of " + steps.length + " steps done. " + (open ? "Hide" : "Show") + " checklist"}>
              <Icon name="list" size={12} />{stepsDone}/{steps.length}
            </button>
          )}
          {(task.attachments || []).length > 0 && (
            <span className="titem__repeat" title={task.attachments.length + " attached"}>
              <Icon name="paperclip" size={12} />{task.attachments.length}
            </span>
          )}
          {done && task.completedAt && <span>Done</span>}
        </span>
        {open && steps.length > 0 && (
          <ul className="titem__checklist">
            {steps.map((st) => (
              <li key={st.id}>
                <label className={st.done ? "is-done" : ""}>
                  <input type="checkbox" checked={st.done} onChange={() => toggleSubtask(task.id, st.id)} />
                  <span>{st.text}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
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
