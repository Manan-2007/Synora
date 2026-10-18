/* =========================================================
   Semesters, SGPA and the overall CGPA.

   The current semester lives where it always has: the subject
   list (credits) plus the cgpa collection (grades). Completed
   semesters are kept as a list of their own:

     semesters = [{ id, name, subjects: [{ id, name, credits, grade }] }]

   SGPA  = Σ(credits × grade point) ÷ Σ(credits) for ONE semester
   CGPA  = the same sum over EVERY semester (past + current)

   Failures (E1/E2/E3) count their credits with 0 points, exactly
   as in the current-semester calculation (lib/grades.js).
   ========================================================= */

import { store, profile } from "./storage.js";
import { GRADES, GRADE_MAX, gradePoint, isFailGrade } from "./grades.js";
import { uid } from "./util.js";

/* Totals for a set of { credits, grade } rows; ungraded rows don't count. */
export function tally(rows) {
  let credits = 0, points = 0, count = 0, failed = 0;
  for (const r of rows || []) {
    const c = Number(r.credits) || 0;
    const p = gradePoint(r.grade);
    if (c > 0 && p !== undefined) {
      credits += c;
      points += c * p;
      count++;
      if (isFailGrade(r.grade)) failed++;
    }
  }
  return { credits, points, count, failed, value: credits ? points / credits : null };
}

export function allSemesters() {
  return store.get("semesters");
}

/* The current semester as { name, credits, grade } rows. */
export function currentRows() {
  const grades = store.get("cgpa").subjects || [];
  return store.subjects.all().map((s) => {
    const g = grades.find((row) => row.subjectId === s.id);
    return { id: s.id, name: s.name, credits: Number(s.credits) || 0, grade: g ? g.grade : "" };
  });
}

export function currentName() {
  const sem = String(profile.get().semester || "").trim();
  return sem ? "Semester " + sem : "This semester";
}

/* Every semester with its SGPA, oldest first, the current one last. */
export function history() {
  const past = allSemesters().map((s) => ({ ...s, past: true, ...tally(s.subjects) }));
  return [...past, { id: "current", name: currentName(), past: false, subjects: currentRows(), ...tally(currentRows()) }];
}

/* The overall CGPA across past semesters and the current one. */
export function overall() {
  const rows = [...allSemesters().flatMap((s) => s.subjects || []), ...currentRows()];
  return { ...tally(rows), max: GRADE_MAX, semesters: allSemesters().length + 1 };
}

export function saveSemester(sem) {
  const clean = {
    id: sem.id || uid("sem"),
    name: String(sem.name || "").trim().slice(0, 60) || "Semester",
    subjects: (sem.subjects || [])
      .filter((r) => String(r.name || "").trim())
      .slice(0, 40)
      .map((r) => ({
        id: r.id || uid("sg"),
        name: String(r.name).trim().slice(0, 100),
        credits: Math.max(0, Math.min(20, Number(r.credits) || 0)),
        grade: GRADES[r.grade] ? r.grade : "",
      })),
  };
  store.update("semesters", (list) => {
    const i = list.findIndex((s) => s.id === clean.id);
    if (i >= 0) list[i] = clean; else list.push(clean);
    return list;
  });
  return clean;
}

export function removeSemester(id) {
  store.update("semesters", (list) => list.filter((s) => s.id !== id));
}

/* "Save this semester to history": a copy of the current subjects,
   credits and grades as a completed semester. Nothing current changes. */
export function archiveCurrent() {
  return saveSemester({ name: currentName(), subjects: currentRows().map((r) => ({ ...r, id: undefined })) });
}

/* What average grade point is needed in the current semester's ungraded
   subjects for the overall CGPA to reach `target`?
     done      graded credits and points so far (all semesters)
     remaining credits of current subjects without a grade
     needed  = (target × (done + remaining) − points so far) ÷ remaining */
export function gradeNeeded(target) {
  const t = Number(target);
  if (!(t > 0) || t > GRADE_MAX) return { state: "invalid" };
  const done = overall();
  const remaining = currentRows().filter((r) => r.credits > 0 && !GRADES[r.grade]).reduce((a, r) => a + r.credits, 0);
  if (!remaining) return { state: "no-remaining", current: done.value };
  const needed = (t * (done.credits + remaining) - done.points) / remaining;
  const best = (done.points + GRADE_MAX * remaining) / (done.credits + remaining);
  if (needed <= 0) return { state: "reached", remaining };
  if (needed > GRADE_MAX) return { state: "unreachable", remaining, best };
  /* The lowest passing grade whose points cover the average needed. */
  const grade = ["B", "B+", "A", "A+", "O"].find((g) => GRADES[g].point >= needed - 1e-9);
  return { state: needed <= GRADES.B.point ? "any-pass" : "reachable", remaining, needed, grade };
}
