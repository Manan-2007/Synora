import { useCallback, useRef, useState } from "react";
import { useModal, useModalClose } from "../modal/ModalProvider.jsx";
import Icon from "../Icon.jsx";
import { PRIORITY, STATUS, REPEAT, newTask, saveTask, removeTask, repeatOf, nextMessage } from "../../lib/tasks.js";
import { streak } from "../../lib/engine.js";
import { store } from "../../lib/storage.js";
import { toast } from "../../lib/toast.js";
import { uid, todayISO } from "../../lib/util.js";

const MAX_STEPS = 50;

/* The shared task dialog (create / edit), used by the Tasks page, the
   dashboard's quick-add and the calendar. Passing a task makes it an
   edit; otherwise a new task starts from `preset` (e.g. a deadline). */
export function useTaskForm() {
  const modal = useModal();
  return useCallback((existing, preset) => {
    const isEdit = !!existing;
    modal.open({
      title: isEdit ? "Edit task" : "New task",
      content: <TaskForm task={existing || newTask(preset)} isEdit={isEdit} />,
    });
  }, [modal]);
}

/* Delete with a confirmation that names the task. */
export function useDeleteTask() {
  const modal = useModal();
  return useCallback(async (task) => {
    const ok = await modal.confirm({
      title: "Delete task?",
      message: "“" + (task ? task.title : "This task") + "” will be removed. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) {
      removeTask(task.id);
      toast("Task deleted");
    }
  }, [modal]);
}

function TaskForm({ task, isEdit }) {
  const close = useModalClose();
  const titleRef = useRef(null);
  const [titleError, setTitleError] = useState("");
  const [values, setValues] = useState({
    title: task.title || "",
    subject: task.subject || "",
    deadline: task.deadline || "",
    priority: task.priority || "medium",
    status: task.status || "not-started",
    description: task.description || "",
    repeat: repeatOf(task),
  });
  const [steps, setSteps] = useState(() => (task.subtasks || []).map((st) => ({ ...st })));
  const [newStep, setNewStep] = useState("");
  const stepRef = useRef(null);
  /* A datalist, not a select: it offers the user's own subjects without
     ruling out a task that belongs to none of them. */
  const [subjects] = useState(() => store.subjects.all());

  const bind = (name) => ({
    value: values[name],
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });

  function addStep() {
    const text = newStep.trim();
    if (!text || steps.length >= MAX_STEPS) return;
    setSteps((list) => [...list, { id: uid("st"), text: text.slice(0, 200), done: false }]);
    setNewStep("");
    stepRef.current.focus();
  }
  const editStep = (id, patch) => setSteps((list) => list.map((st) => (st.id === id ? { ...st, ...patch } : st)));

  function submit() {
    const title = values.title.trim();
    if (!title) {
      setTitleError("Give the task a title.");
      titleRef.current.focus();
      return;
    }
    const t = {
      ...task,
      title,
      subject: values.subject.trim(),
      deadline: values.deadline || (values.repeat !== "none" ? todayISO() : ""),
      priority: values.priority,
      description: values.description.trim(),
      repeat: values.repeat,
      subtasks: steps.map((st) => ({ ...st, text: st.text.trim() })).filter((st) => st.text),
    };
    // Keep completedAt consistent with status.
    if (values.status === "completed" && task.status !== "completed") {
      t.completedAt = new Date().toISOString();
      streak.recordCompletion();
    } else if (values.status !== "completed") {
      t.completedAt = null;
    }
    t.status = values.status;

    const next = saveTask(t);
    close();
    toast.success(isEdit ? "Task updated" : "Task added", next ? t.title + " · " + nextMessage(next) : t.title);
  }

  return (
    <>
      <div className="modal__body">
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className={"field" + (titleError ? " is-invalid" : "")} style={{ margin: 0 }}>
            <label className="field__label" htmlFor="tf-title">Title</label>
            <input className="input" id="tf-title" maxLength={200} ref={titleRef} placeholder="e.g. Finish DBMS assignment" required
              {...bind("title")} />
            <p className="field__error">{titleError}</p>
          </div>
          <div className="form-grid">
            <div className="field" style={{ margin: 0 }}>
              <label className="field__label" htmlFor="tf-subject">Subject</label>
              <input className="input" id="tf-subject" maxLength={100} list="tf-subjects" autoComplete="off" placeholder="e.g. DBMS"
                {...bind("subject")} />
              <datalist id="tf-subjects">
                {subjects.map((s) => <option key={s.id} value={s.name}></option>)}
              </datalist>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field__label" htmlFor="tf-deadline">Deadline</label>
              <input className="input" type="date" id="tf-deadline" {...bind("deadline")} />
            </div>
          </div>
          <div className="form-grid">
            <div className="field" style={{ margin: 0 }}>
              <label className="field__label" htmlFor="tf-priority">Priority</label>
              <select className="select" id="tf-priority" {...bind("priority")}>
                {Object.keys(PRIORITY).map((k) => <option key={k} value={k}>{PRIORITY[k].label}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field__label" htmlFor="tf-status">Status</label>
              <select className="select" id="tf-status" {...bind("status")}>
                {Object.keys(STATUS).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="field" style={{ margin: 0 }}>
              <label className="field__label" htmlFor="tf-repeat">Repeats</label>
              <select className="select" id="tf-repeat" {...bind("repeat")}>
                {Object.keys(REPEAT).map((k) => <option key={k} value={k}>{REPEAT[k].label}</option>)}
              </select>
            </div>
            {values.repeat !== "none" && (
              <p className="text-small muted tf-repeat-hint">
                Finish it and the next one is added for you{values.deadline ? "" : ", starting today"}.
              </p>
            )}
          </div>
          <fieldset className="field tf-steps" style={{ margin: 0 }}>
            <legend className="field__label">Checklist</legend>
            {steps.length > 0 && (
              <ul className="tf-steps__list">
                {steps.map((st, i) => (
                  <li key={st.id} className="tf-steps__row">
                    <input type="checkbox" checked={st.done} aria-label={"Step " + (i + 1) + " done"}
                      onChange={(e) => editStep(st.id, { done: e.target.checked })} />
                    <input className="input input--sm" value={st.text} maxLength={200} aria-label={"Step " + (i + 1)}
                      onChange={(e) => editStep(st.id, { text: e.target.value })} />
                    <button type="button" className="icon-btn" aria-label={"Remove step " + (i + 1)}
                      onClick={() => setSteps((list) => list.filter((x) => x.id !== st.id))}>
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {steps.length < MAX_STEPS && (
              <div className="tf-steps__add">
                <input className="input input--sm" ref={stepRef} value={newStep} maxLength={200}
                  placeholder={steps.length ? "Add another step" : "Break it into steps (optional)"} aria-label="New step"
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStep(); } }} />
                <button type="button" className="btn btn--ghost btn--sm" onClick={addStep} disabled={!newStep.trim()}>
                  <Icon name="plus" size={14} />Add
                </button>
              </div>
            )}
          </fieldset>
          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" htmlFor="tf-desc">Notes</label>
            <textarea className="input" id="tf-desc" maxLength={5000} placeholder="Optional details" {...bind("description")} />
          </div>
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={submit}>{isEdit ? "Save changes" : "Add task"}</button>
      </div>
    </>
  );
}
