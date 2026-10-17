/* Attendance maths. For each tracked subject, the percentage
   attended and the question students actually ask:

     • below target: how many classes in a row must I attend?
     • at or above:  how many can I safely miss?

   Storage holds counts only — { id, subjectId, total, attended }. */

import { store, profile } from "./storage.js";
import { refresh } from "./engine.js";
import { uid, clamp, plural } from "./util.js";

export function attendanceTarget() {
  return Number(profile.get().targetAttendance) || 75;
}

export function countsFor(subjectId) {
  return store.get("attendance").find((r) => r.subjectId === subjectId) ||
    { total: 0, attended: 0 };
}

/* The one way counts are written, so the invariants live in one place:
     held >= 0,  0 <= attended <= held */
export function setCounts(subjectId, held, attended) {
  const h = Math.max(0, Math.round(Number(held) || 0));
  const a = clamp(Math.round(Number(attended) || 0), 0, h);

  store.update("attendance", (list) => {
    let row = list.find((r) => r.subjectId === subjectId);
    if (!row) {
      row = { id: uid("att"), subjectId, total: 0, attended: 0 };
      list.push(row);
    }
    row.total = h;
    row.attended = a;
    return list;
  });

  refresh();
  return { total: h, attended: a };
}

/* + / − on one count. Dropping held below attended pulls attended down
   with it — nobody attends a class that wasn't held. */
export function stepCount(subjectId, which, delta) {
  const row = countsFor(subjectId);
  let held = Math.max(0, Number(row.total) || 0);
  let attended = clamp(Number(row.attended) || 0, 0, held);

  if (which === "held") {
    held = Math.max(0, held + delta);
    attended = Math.min(attended, held);
  } else {
    attended = clamp(attended + delta, 0, held);
  }

  setCounts(subjectId, held, attended);
}

const classes = (n) => plural(n, "class", "es");

/* The maths for one subject. */
export function analyse(row) {
  const total = Math.max(0, Number(row.total) || 0);
  const attended = clamp(Number(row.attended) || 0, 0, total);
  const goal = attendanceTarget();

  const res = {
    total,
    attended,
    target: goal,
    recorded: total > 0,
    /* Guarding the divide keeps NaN and Infinity off the screen. */
    pct: total ? (attended / total) * 100 : 0,
    status: "none",
    message: "",
  };

  if (!total) {
    res.message = "No classes recorded yet.";
    return res;
  }

  if (res.pct >= goal) {
    res.status = "safe";
    if (goal >= 100) {
      res.canMiss = 0;
      res.message = "Perfect attendance required — don't miss any.";
    } else {
      // attended / (total + x) ≥ goal/100  →  x ≤ attended×100/goal − total
      res.canMiss = Math.max(0, Math.floor((attended * 100) / goal - total));
      res.message = res.canMiss === 0
        ? "Right on target — don't miss the next class."
        : "You can miss " + res.canMiss + " more " + classes(res.canMiss) +
          " and stay above " + goal + "%.";
    }
  } else {
    res.status = "danger";
    if (goal >= 100) {
      res.message = "Can't reach 100% once a class is missed.";
    } else {
      // (attended + n) / (total + n) ≥ goal/100
      res.need = Math.max(0, Math.ceil((goal * total - 100 * attended) / (100 - goal)));
      res.message = "Attend " + res.need + " " + classes(res.need) +
                    " in a row to reach " + goal + "%.";
    }
  }
  return res;
}
