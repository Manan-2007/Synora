import { useState } from "react";
import { Link } from "react-router";
import { useModal, useModalClose } from "../components/modal/ModalProvider.jsx";
import { toast } from "../lib/toast.js";
import { history, overall, saveSemester, removeSemester, archiveCurrent, gradeNeeded, currentName, tally } from "../lib/semesters.js";
import Icon from "../components/Icon.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import useStore from "../hooks/useStore.js";
import { store } from "../lib/storage.js";
import { derive } from "../lib/engine.js";
import { GRADES, GRADE_LADDER, FAIL_LADDER, GRADE_MAX, gradePoint, isFailGrade } from "../lib/grades.js";
import { uid, clamp } from "../lib/util.js";
import { subjectVar } from "../lib/colors.js";
import EmptyArt from "../components/EmptyArt.jsx";

/* =========================================================
   CGPA — give each subject a grade; Synora works out

     CGPA = Σ(credits × grade point) / Σ(credits)

   Credits belong to the subject record, not to this page.
   EVERY subject appears here, including the ones not tracked
   for attendance: attendance is about registers, CGPA is
   about credits and grades. Rows are { id, subjectId, grade }.
   ========================================================= */

function standing(cgpa, max) {
  const pct = cgpa / max;
  if (pct >= 0.9) return "Outstanding";
  if (pct >= 0.8) return "Excellent";
  if (pct >= 0.7) return "Very good";
  if (pct >= 0.6) return "Good";
  if (pct > 0) return "Keep going";
  return "—";
}

function rowFor(subjectId, data) {
  return (data.subjects || []).find((r) => r.subjectId === subjectId) || null;
}

function setGrade(subjectId, grade) {
  store.update("cgpa", (data) => {
    data.subjects = data.subjects || [];
    let row = rowFor(subjectId, data);
    if (!row) {
      row = { id: uid("grd"), subjectId, grade: "" };
      data.subjects.push(row);
    }
    row.grade = grade;
    return data;
  });
}

function gradeOption(g) {
  const info = GRADES[g];
  return <option key={g} value={g}>{info.pass ? g + " · " + info.point + " points" : g + " · " + info.label}</option>;
}

/* Passes and failures in one dropdown, grouped so the two kinds stay
   visually distinct while remaining a single choice. */
function GradeOptions() {
  return (
    <>
      <option value="">Not graded</option>
      <optgroup label="Pass">{GRADE_LADDER.toReversed().map(gradeOption)}</optgroup>
      <optgroup label="Fail">{FAIL_LADDER.map(gradeOption)}</optgroup>
    </>
  );
}

function StatBox({ label, value, foot }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__foot">{foot}</div>
    </div>
  );
}

/* One axis, two directions. ABOVE the baseline the passing grades, on a
   ladder of bands (B → O); BELOW it the three failure states, labelled
   individually and never merged — which examination was failed is the
   whole point. The numbers are only bar heights: B → 1 … O → 5 upwards,
   E1 → 1, E2 → 2, E3 → 3 downwards. The x axis is every subject. */
function GradeChart({ rows }) {
  if (!rows.length) return <p className="muted text-small">Grade a subject to see the chart.</p>;

  const summary = "Grade by subject. " + rows.map((r) => {
    const g = GRADES[r.grade];
    return r.name + ": " + r.grade + (g.pass ? " (" + g.point + " points)" : " — " + g.label);
  }).join(". ") + ".";

  return (
    <>
      <div className="chart chart--split" role="img" aria-label={summary}>
        <div className="chart__y" aria-hidden="true">
          {GRADE_LADDER.toReversed().map((g) => <span key={g}>{g}</span>)}
        </div>

        <div className="chart__plot" aria-hidden="true">
          <div className="chart__grid">{GRADE_LADDER.map((g) => <i key={g}></i>)}</div>
          <div className="chart__bars">
            {rows.map((r) => {
              const idx = GRADE_LADDER.indexOf(r.grade);
              const h = idx >= 0 ? ((idx + 1) / GRADE_LADDER.length) * 100 : 0;
              return (
                <div className="chart__col" key={r.key}>
                  <span className="chart__value">{h ? r.grade : ""}</span>
                  {h ? <div className="chart__bar chart__bar--subject" style={{ height: h + "%", ...subjectVar(r.color) }}></div> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart__y-neg" aria-hidden="true">
          {FAIL_LADDER.map((e) => <span key={e}>{e}</span>)}
        </div>

        <div className="chart__plot-neg" aria-hidden="true">
          <div className="chart__grid">{FAIL_LADDER.map((e) => <i key={e}></i>)}</div>
          <div className="chart__bars-neg">
            {rows.map((r) => {
              const depth = FAIL_LADDER.indexOf(r.grade) + 1;   // E1 → 1, E2 → 2, E3 → 3
              const h = depth > 0 ? (depth / FAIL_LADDER.length) * 100 : 0;
              return (
                <div className="chart__col-neg" key={r.key}>
                  {h ? <div className="chart__bar-neg" style={{ height: h + "%" }}></div> : null}
                  <span className="chart__exam">{h ? r.grade : ""}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart__corner" aria-hidden="true"></div>
        <div className="chart__x" aria-hidden="true">
          {rows.map((r) => <span key={r.key} title={r.name}>{r.name}</span>)}
        </div>
      </div>

      <p className="chart__caption">
        {"Subjects along the middle. Above the line, the passing grades (" + GRADE_LADDER.join(" → ") +
          " reading upwards, worth " + GRADE_LADDER.map((g) => GRADES[g].point).join(" → ") + " points). " +
          "Below it, the three failure states: " +
          FAIL_LADDER.map((f) => f + " — " + GRADES[f].label.toLowerCase()).join("; ") +
          ". A failure scores 0 points."}
      </p>
    </>
  );
}

/* ---- "What grade do I need?" ---- */
function GradeNeeded() {
  const [target, setTarget] = useState("");
  const r = target === "" ? null : gradeNeeded(target);
  let answer = null;
  if (r) {
    if (r.state === "invalid") answer = "Enter a target between 0 and " + GRADE_MAX + ".";
    else if (r.state === "no-remaining") answer = "Every subject this semester already has a grade, so there's nothing left to aim with" +
      (r.current !== null ? ": your CGPA is " + r.current.toFixed(2) + "." : ".");
    else if (r.state === "reached") answer = "You're already there: even without more passes, your CGPA stays at or above " + Number(target).toFixed(2) + ".";
    else if (r.state === "any-pass") answer = "Any passing grade (B or better) in your remaining " + r.remaining + " credits gets you there.";
    else if (r.state === "unreachable") answer = "Out of reach this semester: even all O grades in your remaining " + r.remaining +
      " credits would reach " + r.best.toFixed(2) + ".";
    else answer = (
      <>You need an average of <strong>{r.needed.toFixed(2)}</strong> points in your remaining {r.remaining} credits:
        about <strong>{r.grade}</strong> or better in each.</>
    );
  }
  return (
    <div className="card card--pad">
      <div className="needed">
        <div>
          <h2 className="needed__title">What grade do I need?</h2>
          <p className="text-small muted" style={{ margin: 0 }}>
            Your target CGPA, worked back to the grades you still need this semester.
          </p>
        </div>
        <label className="needed__input">
          <span className="field__label">Target CGPA</span>
          <input className="input" type="number" inputMode="decimal" min="0" max={GRADE_MAX} step="0.1"
            placeholder="e.g. 8.5" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
      </div>
      {answer && <p className="needed__answer" role="status">{answer}</p>}
    </div>
  );
}

/* ---- Semester history ---- */

function SemesterEditor({ semester }) {
  const close = useModalClose();
  const blank = () => ({ id: uid("sg"), name: "", credits: "", grade: "" });
  const [name, setName] = useState(semester ? semester.name : "");
  const [rows, setRows] = useState(semester && semester.subjects.length
    ? semester.subjects.map((r) => ({ ...r, credits: String(r.credits) })) : [blank(), blank(), blank()]);
  const [error, setError] = useState("");
  const setRow = (i, k) => (e) => setRows((list) => list.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)));
  const preview = tally(rows);

  function save() {
    if (!name.trim()) { setError("Give the semester a name, e.g. Semester 2."); return; }
    if (!rows.some((r) => r.name.trim())) { setError("Add at least one subject."); return; }
    saveSemester({ id: semester && semester.id, name, subjects: rows });
    close();
    toast.success(semester ? "Semester updated" : "Semester added", name.trim());
  }

  return (
    <>
      <div className="modal__body">
        <div className="stack">
          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" htmlFor="sem-name">Semester</label>
            <input className="input" id="sem-name" maxLength={60} placeholder="e.g. Semester 2" value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }} />
          </div>
          <div className="sem-rows">
            <div className="sem-rows__head" aria-hidden="true"><span>Subject</span><span>Credits</span><span>Grade</span><span></span></div>
            {rows.map((r, i) => (
              <div className="sem-row" key={r.id}>
                <input className="input input--sm" aria-label={"Subject " + (i + 1)} maxLength={100} placeholder="Subject"
                  value={r.name} onChange={setRow(i, "name")} />
                <input className="input input--sm" aria-label={"Credits for subject " + (i + 1)} type="number" min="0" max="20"
                  placeholder="3" value={r.credits} onChange={setRow(i, "credits")} />
                <select className="select select--sm" aria-label={"Grade for subject " + (i + 1)} value={r.grade}
                  onChange={setRow(i, "grade")}>
                  <GradeOptions />
                </select>
                <button type="button" className="icon-btn" aria-label={"Remove subject " + (i + 1)}
                  onClick={() => setRows((list) => list.filter((_, j) => j !== i))}>
                  <Icon name="x" size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="row row--wrap" style={{ justifyContent: "space-between", gap: 12 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRows((list) => [...list, blank()])}>
              <Icon name="plus" size={15} />Add subject
            </button>
            <span className="text-small muted">
              {preview.value !== null ? "SGPA " + preview.value.toFixed(2) + " over " + preview.credits + " credits" : "SGPA appears as you grade"}
            </span>
          </div>
          {error && <p className="contact-form__failure" role="alert" style={{ margin: 0 }}>{error}</p>}
        </div>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={save}>{semester ? "Save changes" : "Add semester"}</button>
      </div>
    </>
  );
}

function SemesterHistory() {
  const modal = useModal();
  const list = history();
  const open = (semester) => modal.open({ title: semester ? "Edit " + semester.name : "Add a past semester", content: <SemesterEditor semester={semester} /> });

  async function remove(sem) {
    const ok = await modal.confirm({ title: "Delete " + sem.name + "?", message: "Its subjects and grades are removed from your CGPA.", confirmLabel: "Delete semester", danger: true });
    if (ok) { removeSemester(sem.id); toast("Deleted " + sem.name); }
  }

  function archive() {
    const sem = archiveCurrent();
    toast.success("Saved to history", sem.name + " is now in your semester history.");
  }

  const graded = list.filter((s) => s.value !== null);
  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Semester history</span>
        <div className="row row--wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={archive}>Save this semester</button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => open(null)}>
            <Icon name="plus" size={15} />Add past semester
          </button>
        </div>
      </div>
      <div className="card__body stack" style={{ gap: 16 }}>
        {graded.length > 1 && (
          <div className="sgpa-trend" role="img" aria-label={"SGPA by semester: " + graded.map((s) => s.name + " " + s.value.toFixed(2)).join(", ")}>
            {graded.map((s) => (
              <div className="sgpa-trend__col" key={s.id}>
                <span className="sgpa-trend__value">{s.value.toFixed(2)}</span>
                <div className={"sgpa-trend__bar" + (s.past ? "" : " is-current")} style={{ height: (s.value / GRADE_MAX) * 100 + "%" }}></div>
                <span className="sgpa-trend__name">{s.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="table-wrap">
          <table className="table sem-table">
            <thead><tr><th>Semester</th><th>Credits</th><th>SGPA</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong>{!s.past && <span className="badge badge--low sem-table__now">Current</span>}</td>
                  <td className="muted">{s.credits || "—"}</td>
                  <td>{s.value !== null ? <strong>{s.value.toFixed(2)}</strong> : <span className="muted">—</span>}</td>
                  <td>
                    {s.past && (
                      <div className="row" style={{ gap: 2 }}>
                        <button type="button" className="icon-btn" aria-label={"Edit " + s.name} onClick={() => open(s)}><Icon name="edit" size={15} /></button>
                        <button type="button" className="icon-btn" aria-label={"Delete " + s.name} onClick={() => remove(s)}><Icon name="trash" size={15} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 1 && (
          <p className="text-small muted" style={{ margin: 0 }}>
            Add your earlier semesters to see your overall CGPA and how it has moved, or save this semester to history
            when it ends.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Cgpa() {
  useStore();
  const subjects = store.subjects.all();
  const data = store.get("cgpa");
  const result = derive.cgpa();
  const total = overall();
  const hasHistory = total.semesters > 1;
  const cgpa = (hasHistory ? total.value : result && result.value) || 0;

  const chartRows = subjects.map((s) => {
    const row = rowFor(s.id, data);
    return { key: s.id, name: s.name, color: s.color, grade: row ? row.grade : "" };
  }).filter((r) => GRADES[r.grade]);

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Enter each subject's grade — your CGPA updates as you type. {currentName()} below; earlier semesters in the history.</p>
      </div>

      {/* minmax(0, 1fr), not 1fr: the subject table scrolls inside its card
          on a phone instead of pushing the whole page wider. */}
      <div>
        <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr)", gap: 24 }}>
          <div className="card">
            <div className="card__header">
              <span className="card__title">Your subjects</span>
              <span className="text-small muted">Every subject counts, tracked for attendance or not</span>
            </div>
            <div className="card__body" style={{ padding: 0 }}>
              {subjects.length ? (
                <div className="table-wrap">
                  <table className="table table--grades">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th className="col-credits">Credits</th>
                        <th className="col-grade">Grade</th>
                        <th className="col-points">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((s) => {
                        const grade = (rowFor(s.id, data) || { grade: "" }).grade;
                        const point = gradePoint(grade);
                        return (
                          <tr key={s.id}>
                            <td>
                              <strong>{s.name}</strong>
                              {!s.trackAttendance && (
                                <span className="text-small muted" style={{ display: "block" }}>not tracked for attendance</span>
                              )}
                            </td>
                            <td className="muted">{s.credits || "—"}</td>
                            <td>
                              <label className="visually-hidden" htmlFor={"g-" + s.id}>{"Grade for " + s.name}</label>
                              {/* On a phone the column is too narrow for "A+ · 9 points",
                                  so the box shows just the grade code on top of the
                                  select; tapping it still opens the full list. */}
                              <span className="grade-select">
                                <select className="select select--sm" id={"g-" + s.id} value={grade}
                                  onChange={(e) => setGrade(s.id, e.target.value)}>
                                  <GradeOptions />
                                </select>
                                <span className="grade-select__code" aria-hidden="true">{grade || "—"}</span>
                              </span>
                            </td>
                            <td>
                              {point === undefined
                                ? <span className="muted">—</span>
                                : isFailGrade(grade)
                                  ? <span className="badge badge--high">0.0</span>
                                  : <strong>{(point * (Number(s.credits) || 0)).toFixed(1)}</strong>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* You cannot add a subject here — a subject is not a grade. */
                <div className="empty" style={{ padding: "40px 24px" }}>
                  <EmptyArt name="subjects" />
                  <p className="empty__title">No subjects yet</p>
                  <p className="empty__text">Add your subjects and their credits, then come back to grade them.</p>
                  <Link className="btn btn--primary" to="/settings">Add subjects</Link>
                </div>
              )}
            </div>
          </div>

          <div className="card card--pad">
            <div className="summary-row">
              <ProgressRing frac={clamp(cgpa / GRADE_MAX, 0, 1)} value={cgpa.toFixed(2)} label={"of " + GRADE_MAX} />
              <div className="stat-grid" style={{ flex: 1, minWidth: 220 }}>
                <StatBox label={hasHistory ? "Overall CGPA" : "CGPA"} value={cgpa.toFixed(2)} foot={standing(cgpa, GRADE_MAX)} />
                {hasHistory && (
                  <StatBox label={currentName() + " (SGPA)"} value={result ? result.value.toFixed(2) : "—"}
                    foot={(result ? result.count : 0) + " graded"} />
                )}
                <StatBox label="Total credits" value={hasHistory ? total.credits : result ? result.totalCredits : 0}
                  foot={hasHistory ? "across " + total.semesters + " semesters" : (result ? result.count : 0) + " graded"} />
                <StatBox label="Grade points" value={(hasHistory ? total.points : result ? result.totalPoints : 0).toFixed(1)}
                  foot={(hasHistory ? total.failed : result && result.failed)
                    ? (hasHistory ? total.failed : result.failed) + " failed " + ((hasHistory ? total.failed : result.failed) === 1 ? "subject" : "subjects")
                    : "credits × grade"} />
              </div>
            </div>
          </div>

          <GradeNeeded />

          <div className="card">
            <div className="card__header"><span className="card__title">Grades by subject</span></div>
            <div className="card__body"><GradeChart rows={chartRows} /></div>
          </div>

          <SemesterHistory />
        </div>
      </div>
    </>
  );
}
