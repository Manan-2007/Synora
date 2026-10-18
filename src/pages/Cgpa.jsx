import { Link } from "react-router";
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

export default function Cgpa() {
  useStore();
  const subjects = store.subjects.all();
  const data = store.get("cgpa");
  const result = derive.cgpa();
  const cgpa = result ? result.value : 0;

  const chartRows = subjects.map((s) => {
    const row = rowFor(s.id, data);
    return { key: s.id, name: s.name, color: s.color, grade: row ? row.grade : "" };
  }).filter((r) => GRADES[r.grade]);

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Enter each subject's credits and grade — your CGPA updates as you type.</p>
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
                <StatBox label="CGPA" value={cgpa.toFixed(2)} foot={standing(cgpa, GRADE_MAX)} />
                <StatBox label="Total credits" value={result ? result.totalCredits : 0}
                  foot={(result ? result.count : 0) + " graded"} />
                <StatBox label="Grade points" value={(result ? result.totalPoints : 0).toFixed(1)}
                  foot={result && result.failed
                    ? result.failed + " failed " + (result.failed === 1 ? "subject" : "subjects")
                    : "credits × grade"} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__header"><span className="card__title">Grades by subject</span></div>
            <div className="card__body"><GradeChart rows={chartRows} /></div>
          </div>
        </div>
      </div>
    </>
  );
}
