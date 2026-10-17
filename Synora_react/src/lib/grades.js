/* ---- The Synora grading system -----------------------------
   One 10-point scale. A single grade carries the whole result,
   pass or fail — there is no separate "exam status" field.

     PASSES          FAILURES
     O  = 10         E1  failed the internals
     A+ =  9         E2  failed the end-term exam
     A  =  8         E3  failed both
     B+ =  7
     B  =  6

   A failure earns ZERO grade points but still carries its
   credits into the denominator — the standard way a backlog
   drags a CGPA down, and an assumption this project states
   openly. It is never plotted as a positive grade.            */

export const GRADES = {
  "O":  { point: 10, pass: true,  label: "Outstanding" },
  "A+": { point: 9,  pass: true,  label: "Excellent" },
  "A":  { point: 8,  pass: true,  label: "Very good" },
  "B+": { point: 7,  pass: true,  label: "Good" },
  "B":  { point: 6,  pass: true,  label: "Above average" },
  "E1": { point: 0,  pass: false, label: "Failed in Internals" },
  "E2": { point: 0,  pass: false, label: "Failed in End Term Exam" },
  "E3": { point: 0,  pass: false, label: "Failed in Both Internals and End Term" },
};

/* Reading upwards from the baseline — the positive Y axis. */
export const GRADE_LADDER = ["B", "B+", "A", "A+", "O"];

/* Hanging below the baseline — the negative Y axis. Three distinct
   results, never collapsed into one "E1/E2/E3" label. */
export const FAIL_LADDER = ["E1", "E2", "E3"];

export const GRADE_MAX = 10;

export function gradePoint(grade) {
  return GRADES[grade] ? GRADES[grade].point : undefined;
}

export function isFailGrade(grade) {
  return !!GRADES[grade] && !GRADES[grade].pass;
}
