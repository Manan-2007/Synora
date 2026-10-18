import { useState } from "react";
import { Link } from "react-router";
import Icon from "../components/Icon.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import { useModal, useModalClose } from "../components/modal/ModalProvider.jsx";
import useStore from "../hooks/useStore.js";
import { store } from "../lib/storage.js";
import { derive, refresh } from "../lib/engine.js";
import { analyse, attendanceTarget, countsFor, setCounts, stepCount } from "../lib/attendance.js";
import { clamp } from "../lib/util.js";
import { toast } from "../lib/toast.js";
import { subjectVar } from "../lib/colors.js";
import EmptyArt from "../components/EmptyArt.jsx";

/* =========================================================
   Attendance — the subjects with trackAttendance = true, and
   only those. A subject with the flag off is absent from this
   page, its chart and the warnings, but keeps its credits and
   grade for CGPA. There is deliberately no "track a subject"
   button: a subject is something you already have.
   ========================================================= */

/* Edit — the major changes: name, credits, whether it takes a register
   at all, and a direct correction of both counts. It edits the SUBJECT,
   so a rename here shows up in CGPA and the timetable too. */
function EditSubjectForm({ subject }) {
  const close = useModalClose();
  const row = countsFor(subject.id);
  const [values, setValues] = useState({
    name: subject.name,
    total: String(row.total),
    attended: String(row.attended),
    credits: String(subject.credits || ""),
    track: subject.trackAttendance,
  });
  const [errors, setErrors] = useState({});

  const bind = (name) => ({
    value: values[name],
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });
  const fail = (field, message) => setErrors({ [field]: message });

  function submit() {
    const name = values.name.trim();
    const total = parseInt(values.total, 10);
    const attended = parseInt(values.attended, 10);
    const credits = parseInt(values.credits, 10);

    if (!name) return fail("name", "Give the subject a name.");
    const clash = store.subjects.all().some((other) =>
      other.id !== subject.id && other.name.toLowerCase() === name.toLowerCase());
    if (clash) return fail("name", "You already have a subject with that name.");
    if (isNaN(total) || total < 0) return fail("total", "Enter how many classes have been held.");
    if (isNaN(attended) || attended < 0) return fail("attended", "Enter how many you attended.");
    if (attended > total) return fail("attended", "You can't attend more classes than were held.");
    if (isNaN(credits) || credits < 0) return fail("credits", "Enter the subject's credit value.");

    store.subjects.save({ id: subject.id, name, credits, trackAttendance: values.track });
    setCounts(subject.id, total, attended);
    close();
    toast.success("Subject updated", values.track ? name : name + " — attendance tracking is now off");
  }

  const fieldClass = (name) => "field" + (errors[name] ? " is-invalid" : "");

  return (
    <>
      <div className="modal__body">
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className={fieldClass("name")} style={{ margin: 0 }}>
            <label className="field__label" htmlFor="ae-name">Subject name</label>
            <input className="input" id="ae-name" maxLength={100} {...bind("name")} />
            <p className="field__hint">Renaming updates this subject everywhere — attendance, CGPA and your timetable.</p>
            <p className="field__error">{errors.name || ""}</p>
          </div>
          <div className="form-grid">
            <div className={fieldClass("total")} style={{ margin: 0 }}>
              <label className="field__label" htmlFor="ae-total">Classes held</label>
              <input className="input" type="number" min="0" id="ae-total" {...bind("total")} />
              <p className="field__error">{errors.total || ""}</p>
            </div>
            <div className={fieldClass("attended")} style={{ margin: 0 }}>
              <label className="field__label" htmlFor="ae-attended">Classes attended</label>
              <input className="input" type="number" min="0" id="ae-attended" {...bind("attended")} />
              <p className="field__error">{errors.attended || ""}</p>
            </div>
          </div>
          <div className={fieldClass("credits")} style={{ margin: 0 }}>
            <label className="field__label" htmlFor="ae-credits">Credits</label>
            <input className="input" type="number" min="0" max="20" id="ae-credits" {...bind("credits")} />
            <p className="field__hint">Used by CGPA, not by attendance.</p>
            <p className="field__error">{errors.credits || ""}</p>
          </div>
          <label className="check-row" style={{ alignItems: "flex-start" }}>
            <input type="checkbox" id="ae-track" checked={values.track}
              onChange={(e) => setValues((v) => ({ ...v, track: e.target.checked }))} />
            <span>
              <strong>Record attendance for this subject</strong>
              <span className="text-small muted" style={{ display: "block" }}>
                Turn this off and the subject leaves this page and its chart. It keeps its credits and grade for CGPA.
              </span>
            </span>
          </label>
          <p className="text-small muted" style={{ margin: 0 }}>
            {"Your target is " + attendanceTarget() + "% for every subject. Change it in Settings."}
          </p>
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={submit}>Save changes</button>
      </div>
    </>
  );
}

function listPhrase(items) {
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

/* A labelled number with a − and a + either side of it. */
function Stepper({ subjectId, which, label, value, subjectName }) {
  const labelId = "lbl-" + which + "-" + subjectId;
  return (
    <div className="att-step">
      <span className="att-step__label" id={labelId}>{label}</span>
      <div className="att-step__controls">
        <button type="button" className="att-step__btn" aria-label={"One fewer " + label.toLowerCase() + " for " + subjectName}
          onClick={() => stepCount(subjectId, which, -1)}>−</button>
        <output className="att-step__value" aria-labelledby={labelId}>{value}</output>
        <button type="button" className="att-step__btn" aria-label={"One more " + label.toLowerCase() + " for " + subjectName}
          onClick={() => stepCount(subjectId, which, 1)}>+</button>
      </div>
    </div>
  );
}

/* The y axis is fixed at 0–100%, never scaled to the data — a chart that
   stretched to its tallest bar would make 83% look like a full house. The
   dashed line is the target, read from the profile. */
function AttendanceChart({ subjects, goal }) {
  if (!subjects.length) return <p className="muted text-small">Record some classes to see the chart.</p>;

  const ticks = [100, 80, 60, 40, 20, 0];
  const summary = "Attendance by subject against a " + goal + "% target. " +
    subjects.map((s) => s.subject + " " + s.pct.toFixed(0) + "%").join(", ") + ".";

  return (
    <>
      <div className="chart" role="img" aria-label={summary}>
        <div className="chart__y" aria-hidden="true">
          {ticks.map((t) => <span key={t}>{t + "%"}</span>)}
        </div>
        <div className="chart__plot" aria-hidden="true">
          <div className="chart__grid">{ticks.map((t) => <i key={t}></i>)}</div>
          <div className="chart__target" style={{ bottom: goal + "%" }}>
            <span className="chart__target-tag">{goal + "%"}</span>
          </div>
          <div className="chart__bars">
            {subjects.map((s) => (
              <div className="chart__col" key={s.subjectId}>
                <span className="chart__value">{s.pct.toFixed(0) + "%"}</span>
                <div className={"chart__bar" + (s.pct < goal ? " chart__bar--danger" : " chart__bar--subject")}
                  style={{ height: clamp(s.pct, 0, 100) + "%", ...subjectVar(s.color) }}></div>
              </div>
            ))}
          </div>
        </div>
        <div className="chart__corner" aria-hidden="true"></div>
        <div className="chart__x" aria-hidden="true">
          {subjects.map((s) => <span key={s.subjectId} title={s.subject}>{s.subject}</span>)}
        </div>
      </div>
      <p className="chart__caption">
        {"Subjects along the bottom, attendance from 0% to 100%. The dashed line is your " + goal + "% target."}
      </p>
    </>
  );
}

export default function Attendance() {
  useStore();
  const modal = useModal();
  const data = derive.attendance();
  const rows = data.subjects;
  const untracked = store.subjects.all().length - rows.length;
  const recorded = rows.filter((s) => s.recorded);

  function openEdit(subjectId) {
    const subject = store.subjects.byId(subjectId);
    if (!subject) return;
    modal.open({ title: "Edit " + subject.name, content: <EditSubjectForm subject={subject} /> });
  }

  /* Delete removes the SUBJECT, not just its counts — and says exactly
     what will be lost rather than asking about an unnamed amount of data. */
  async function confirmDelete(subjectId) {
    const subject = store.subjects.byId(subjectId);
    if (!subject) return;
    const timetableCount = store.get("timetable").filter((c) => c.subjectId === subjectId).length;
    const graded = (store.get("cgpa").subjects || []).some((g) => g.subjectId === subjectId && g.grade);

    const losing = ["its attendance record"];
    if (timetableCount) losing.push(timetableCount + " timetable " + (timetableCount === 1 ? "entry" : "entries"));
    if (graded) losing.push("its grade");

    const ok = await modal.confirm({
      title: "Delete " + subject.name + "?",
      message: "This removes the subject itself, along with " + listPhrase(losing) + ". This can't be undone.",
      confirmLabel: "Delete subject",
      danger: true,
    });
    if (!ok) return;
    store.subjects.remove(subjectId);
    refresh();
    toast("Deleted " + subject.name);
  }

  const val = data.overall;
  const below = val !== null && val < data.target;
  const color = val === null ? "var(--color-secondary)" : below ? "var(--status-high)" : "var(--status-low)";

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Know exactly how many classes you can afford to miss.</p>
      </div>

      <div>
        <div className="card card--pad" style={{ marginBottom: 24 }}>
          <div className="summary-row">
            <ProgressRing frac={val === null ? 0 : clamp(val / 100, 0, 1)} color={color}
              value={val === null ? "—" : val.toFixed(0) + "%"} label="overall" />
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 700 }}>
                {val === null ? "No classes recorded yet" : below ? "Below your " + data.target + "% target" : "On track"}
              </p>
              <p className="muted text-small" style={{ marginTop: 4 }}>
                {val === null ? "Use the + buttons below as classes happen."
                  : below ? "Attend upcoming classes to pull your average back up."
                  : "Nice — you're keeping above target across your subjects."}
              </p>
              <p className="text-small muted" style={{ marginTop: 12 }}>
                Target: <strong>{data.target + "%"}</strong> · <Link className="card__link" to="/settings">Change</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <span className="card__title">Subjects</span>
            <span className="text-small muted">
              {untracked > 0
                ? untracked + " more " + (untracked === 1 ? "subject is" : "subjects are") + " not tracked for attendance"
                : ""}
            </span>
          </div>
          <div className="card__body">
            {rows.length ? (
              /* A card per tracked subject. Credits are deliberately not
                 shown: they are a CGPA fact and say nothing about attendance. */
              <div className="att-grid">
                {rows.map((r) => {
                  const a = analyse(r);
                  return (
                    <article key={r.subjectId} className={"att-card" + (a.status === "danger" ? " att-card--danger" : "")}>
                      <header className="att-card__head">
                        <h2 className="att-card__name">{r.subject}</h2>
                        <div className="att-card__actions">
                          <button type="button" className="icon-btn" aria-label={"Edit " + r.subject}
                            onClick={() => openEdit(r.subjectId)}>
                            <Icon name="edit" size={15} />
                          </button>
                          <button type="button" className="icon-btn" aria-label={"Delete " + r.subject}
                            onClick={() => confirmDelete(r.subjectId)}>
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </header>

                      <div className="att-card__counts">
                        <Stepper subjectId={r.subjectId} which="held" label="Held" value={a.total} subjectName={r.subject} />
                        <Stepper subjectId={r.subjectId} which="attended" label="Attended" value={a.attended} subjectName={r.subject} />
                      </div>

                      <div className="att-card__pct">
                        <span className="att-card__pct-label">Attendance</span>
                        <span className={"att-card__pct-value" + (a.recorded ? (a.status === "danger" ? " is-danger" : " is-safe") : " is-none")}>
                          {a.recorded ? a.pct.toFixed(2) + "%" : "—"}
                        </span>
                      </div>

                      <p className="att-card__msg">{a.message}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty" style={{ padding: "40px 24px" }}>
                <EmptyArt name="attendance" />
                <p className="empty__title">No subjects are tracked for attendance</p>
                <p className="empty__text">
                  Attendance follows your subject list. Turn on "Record attendance" for a subject in Settings and it
                  will appear here.
                </p>
                <Link className="btn btn--primary" to="/settings">Open Settings</Link>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card__header">
            <span className="card__title">Attendance by subject</span>
            <span className="text-small muted">{recorded.length ? "Target " + data.target + "%" : ""}</span>
          </div>
          <div className="card__body"><AttendanceChart subjects={recorded} goal={data.target} /></div>
        </div>
      </div>
    </>
  );
}
