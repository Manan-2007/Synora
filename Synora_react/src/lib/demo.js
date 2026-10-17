/* =========================================================
   Synora — Demo account

   ONE sample account, so the app can be demonstrated without
   typing an evening's worth of data in front of an audience:

     Arshpreet Kaur · @arsh2309 · B.E CSE AIML · Semester 3

   Its data is written into arsh2309's own namespaced keys the
   first time it signs in, exactly as if she had typed it — so
   it can be edited and deleted like any other workspace. A
   brand-new account gets NONE of this.

   Four subjects record attendance. Cyber Security and Finance
   for Everyone do not: they count fully towards the CGPA while
   being absent from attendance entirely.

   The password is a LOCAL demo credential for this project
   only. It unlocks nothing but a browser's localStorage.
   ========================================================= */

import { KEYS, readJSON, writeJSON, store, session, profile } from "./storage.js";
import { toISODate } from "./util.js";
import { saveThemePreference } from "./theme.js";

const USERNAME = "arsh2309";
const PASSWORD = "arsh2309";       // local demo credential — not a real secret

/* Bump whenever the shipped demo data below changes. The demo seeds once
   and then behaves like an editable workspace; comparing this against the
   version stored in meta forces a fresh re-seed when (and only when) the
   fixture changes, so the demo always matches what ships. */
const SEED_VERSION = 2;

const ACCOUNT = {
  firstName: "Arshpreet",
  lastName: "Kaur",
  username: USERNAME,
  email: "arsh2309@gmail.com",
};

const PROFILE = {
  firstName: "Arshpreet",
  lastName: "Kaur",
  username: USERNAME,
  email: "arsh2309@gmail.com",
  avatar: { type: "illustration", id: "avatar-10" },
  program: "B.E CSE AIML",
  semester: "3",
  targetAttendance: 75,
  appearance: "dark",
  onboarded: true,
};

/* The canonical six. Fixed ids so every other record can point here. */
const SUBJECTS = [
  { id: "fee",     name: "FEE",                  credits: 3, trackAttendance: true },
  { id: "dbms",    name: "DBMS",                 credits: 3, trackAttendance: true },
  { id: "sde",     name: "SDE",                  credits: 3, trackAttendance: true },
  { id: "oops",    name: "OOPS",                 credits: 4, trackAttendance: true },
  { id: "cyber",   name: "Cyber Security",       credits: 3, trackAttendance: false },
  { id: "finance", name: "Finance for Everyone", credits: 1, trackAttendance: false },
];

/* Counts for the four tracked subjects only — deliberately uneven, so the
   chart has something to say. The untracked two have no row at all. */
const ATTENDANCE = [
  { id: "att-fee",  subjectId: "fee",  total: 42, attended: 39 },   // 92.9%
  { id: "att-dbms", subjectId: "dbms", total: 40, attended: 31 },   // 77.5%
  { id: "att-sde",  subjectId: "sde",  total: 38, attended: 25 },   // 65.8% — below target
  { id: "att-oops", subjectId: "oops", total: 44, attended: 37 },   // 84.1%
];

/* Grades across ALL SIX subjects. One deliberate failure (E1 on Cyber
   Security: 0 points, still 3 credits) so the chart's negative axis has
   something real to draw.
     FEE A+ 3×9=27 · DBMS A 3×8=24 · SDE B+ 3×7=21 · OOPS O 4×10=40
     Cyber E1 3×0=0 · Fin B 1×6=6   →   118 / 17 credits = 6.94      */
const CGPA = {
  subjects: [
    { id: "grd-fee",     subjectId: "fee",     grade: "A+" },
    { id: "grd-dbms",    subjectId: "dbms",    grade: "A"  },
    { id: "grd-sde",     subjectId: "sde",     grade: "B+" },
    { id: "grd-oops",    subjectId: "oops",    grade: "O"  },
    { id: "grd-cyber",   subjectId: "cyber",   grade: "E1" },
    { id: "grd-finance", subjectId: "finance", grade: "B"  },
  ],
};

/* Three two-hour blocks a day, Monday to Friday. */
const TIMETABLE = [
  { id: "tt-mon-1", subjectId: "fee",  day: "Monday",    startTime: "09:00", endTime: "11:00", room: "LT-2",    teacher: "Dr. Menon" },
  { id: "tt-mon-2", subjectId: "sde",  day: "Monday",    startTime: "11:00", endTime: "13:00", room: "Block C", teacher: "Dr. Rao" },
  { id: "tt-mon-3", subjectId: "oops", day: "Monday",    startTime: "14:00", endTime: "16:00", room: "LT-1",    teacher: "Prof. Nair" },

  { id: "tt-tue-1", subjectId: "fee",  day: "Tuesday",   startTime: "09:00", endTime: "11:00", room: "LT-2",    teacher: "Dr. Menon" },
  { id: "tt-tue-2", subjectId: "sde",  day: "Tuesday",   startTime: "11:00", endTime: "13:00", room: "Block C", teacher: "Dr. Rao" },
  { id: "tt-tue-3", subjectId: "oops", day: "Tuesday",   startTime: "14:00", endTime: "16:00", room: "LT-1",    teacher: "Prof. Nair" },

  { id: "tt-wed-1", subjectId: "fee",  day: "Wednesday", startTime: "09:00", endTime: "11:00", room: "LT-2",    teacher: "Dr. Menon" },
  { id: "tt-wed-2", subjectId: "oops", day: "Wednesday", startTime: "11:00", endTime: "13:00", room: "LT-1",    teacher: "Prof. Nair" },
  { id: "tt-wed-3", subjectId: "oops", day: "Wednesday", startTime: "14:00", endTime: "16:00", room: "Lab 1",   teacher: "Prof. Nair" },

  { id: "tt-thu-1", subjectId: "dbms", day: "Thursday",  startTime: "09:00", endTime: "11:00", room: "LT-4",    teacher: "Prof. Iyer" },
  { id: "tt-thu-2", subjectId: "sde",  day: "Thursday",  startTime: "11:00", endTime: "13:00", room: "Block C", teacher: "Dr. Rao" },
  { id: "tt-thu-3", subjectId: "oops", day: "Thursday",  startTime: "14:00", endTime: "16:00", room: "LT-1",    teacher: "Prof. Nair" },

  { id: "tt-fri-1", subjectId: "dbms", day: "Friday",    startTime: "09:00", endTime: "11:00", room: "LT-4",    teacher: "Prof. Iyer" },
  { id: "tt-fri-2", subjectId: "dbms", day: "Friday",    startTime: "11:00", endTime: "13:00", room: "LT-4",    teacher: "Prof. Iyer" },
  { id: "tt-fri-3", subjectId: "oops", day: "Friday",    startTime: "14:00", endTime: "16:00", room: "Lab 1",   teacher: "Prof. Nair" },
];

/* Deadlines are relative to whenever the demo is opened, so the dashboard
   always has real overdue / due-today / upcoming work. */
function dateOffset(days) {
  return toISODate(new Date(Date.now() + days * 86400000));
}
function whenCompleted(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function tasks() {
  const made = new Date(Date.now() - 20 * 86400000).toISOString();
  const task = (fields) => ({ description: "", createdAt: made, completedAt: null, ...fields });
  return [
    /* ---- Overdue (3) ---- */
    task({ id: "tsk-1", title: "Submit SDE assignment 2", subject: "SDE",
      description: "Sprint planning write-up and the updated use-case diagram.",
      deadline: dateOffset(-4), priority: "critical", status: "in-progress" }),
    task({ id: "tsk-2", title: "DBMS lab record — week 6", subject: "DBMS",
      description: "Nested queries and joins, questions 1–8.",
      deadline: dateOffset(-2), priority: "high", status: "not-started" }),
    task({ id: "tsk-3", title: "Revise OOPS inheritance notes", subject: "OOPS",
      description: "Multilevel vs hierarchical, plus the diamond problem.",
      deadline: dateOffset(-1), priority: "medium", status: "not-started" }),

    /* ---- Due today (2) ---- */
    task({ id: "tsk-4", title: "FEE assignment 3", subject: "FEE",
      description: "Network theorems — Thevenin and Norton problems.",
      deadline: dateOffset(0), priority: "high", status: "in-progress" }),
    task({ id: "tsk-5", title: "Prepare DBMS viva answers", subject: "DBMS",
      description: "Normalization up to BCNF, with an example for each form.",
      deadline: dateOffset(0), priority: "medium", status: "not-started" }),

    /* ---- Upcoming (5) ---- */
    task({ id: "tsk-6", title: "OOPS practical — file handling", subject: "OOPS",
      description: "Read/write streams and exception handling.",
      deadline: dateOffset(2), priority: "high", status: "not-started" }),
    task({ id: "tsk-7", title: "SDE project — module 3", subject: "SDE",
      description: "Finish the reporting module and write its test cases.",
      deadline: dateOffset(4), priority: "critical", status: "not-started" }),
    task({ id: "tsk-8", title: "FEE unit test revision", subject: "FEE",
      description: "AC fundamentals and RLC circuits.",
      deadline: dateOffset(6), priority: "medium", status: "not-started" }),
    task({ id: "tsk-9", title: "DBMS mini-project proposal", subject: "DBMS",
      description: "One page: problem, schema sketch, tech stack.",
      deadline: dateOffset(8), priority: "low", status: "not-started" }),
    task({ id: "tsk-10", title: "Read SDE chapter on agile estimation", subject: "SDE",
      deadline: dateOffset(11), priority: "low", status: "not-started" }),

    /* ---- Completed — two before their deadline, the rest late, which
       keeps "Deadline Master" (3 on time) still to earn. ---- */
    task({ id: "tsk-11", title: "OOPS assignment 1 — classes and objects", subject: "OOPS",
      deadline: dateOffset(-12), priority: "medium", status: "completed", completedAt: whenCompleted(-13) }),
    task({ id: "tsk-12", title: "FEE lab record — experiments 1–4", subject: "FEE",
      deadline: dateOffset(-10), priority: "high", status: "completed", completedAt: whenCompleted(-11) }),
    task({ id: "tsk-13", title: "DBMS ER diagram exercise", subject: "DBMS",
      deadline: dateOffset(-9), priority: "medium", status: "completed", completedAt: whenCompleted(-7) }),
    task({ id: "tsk-14", title: "SDE seminar slides", subject: "SDE",
      deadline: dateOffset(-7), priority: "low", status: "completed", completedAt: whenCompleted(-5) }),
    task({ id: "tsk-15", title: "OOPS quiz preparation", subject: "OOPS",
      deadline: dateOffset(-6), priority: "high", status: "completed", completedAt: whenCompleted(-4) }),
    task({ id: "tsk-16", title: "FEE tutorial sheet 2", subject: "FEE",
      deadline: dateOffset(-3), priority: "low", status: "completed", completedAt: whenCompleted(-2) }),
    task({ id: "tsk-17", title: "DBMS assignment 1 — relational algebra", subject: "DBMS",
      deadline: dateOffset(-16), priority: "medium", status: "completed", completedAt: whenCompleted(-14) }),
    task({ id: "tsk-18", title: "SDE case study write-up", subject: "SDE",
      deadline: dateOffset(-15), priority: "medium", status: "completed", completedAt: whenCompleted(-13) }),
    task({ id: "tsk-19", title: "OOPS lab — constructors and destructors", subject: "OOPS",
      deadline: dateOffset(-14), priority: "low", status: "completed", completedAt: whenCompleted(-12) }),

    /* Completed yesterday, which is what keeps the streak alive. */
    task({ id: "tsk-20", title: "FEE numericals — set 4", subject: "FEE",
      deadline: dateOffset(-2), priority: "medium", status: "completed", completedAt: whenCompleted(-1) }),
  ];
}

function daysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function notes() {
  return [
    { id: "nte-1", title: "DBMS — SQL revision", category: "DBMS",
      body: "JOIN types: INNER keeps matches only, LEFT keeps every row on the left, " +
            "FULL keeps both sides.\nNormalization: 1NF atomic values → 2NF no partial " +
            "dependency → 3NF no transitive dependency → BCNF every determinant is a key.",
      createdAt: daysAgo(9), updatedAt: daysAgo(3) },
    { id: "nte-2", title: "OOPS — the four pillars", category: "OOPS",
      body: "Encapsulation: data + methods behind one interface.\nInheritance: reuse, " +
            "not copy.\nPolymorphism: overloading is compile-time, overriding is run-time.\n" +
            "Abstraction: expose what it does, hide how.",
      createdAt: daysAgo(7), updatedAt: daysAgo(2) },
    { id: "nte-3", title: "SDE — assignment checklist", category: "SDE",
      body: "Still to do: reporting module, unit tests, and the README.\n" +
            "Ask Dr. Rao whether the estimation section needs story points or hours.",
      createdAt: daysAgo(5), updatedAt: daysAgo(1) },
    { id: "nte-4", title: "FEE — formulas to remember", category: "FEE",
      body: "Thevenin: find Vth open-circuit, Rth with sources killed.\n" +
            "For AC: Z = R + j(XL − XC), and resonance is at XL = XC.",
      createdAt: daysAgo(4), updatedAt: daysAgo(4) },
    { id: "nte-5", title: "Week plan", category: "Personal",
      body: "Mon–Tue: clear the overdue SDE assignment.\nWed: DBMS viva prep.\n" +
            "Thu: OOPS practical.\nFri: catch up on SDE attendance.",
      createdAt: daysAgo(2), updatedAt: daysAgo(0) },
  ];
}

/* Write the whole workspace. Runs the first time arsh2309 signs in, and
   again whenever SEED_VERSION changes. */
function seed() {
  store.subjects.setAll(SUBJECTS);
  store.set("attendance", ATTENDANCE.map((a) => ({ ...a })));
  store.set("cgpa", { subjects: CGPA.subjects.map((g) => ({ ...g })) });
  store.set("timetable", TIMETABLE.map((c) => ({ ...c })));
  store.set("tasks", tasks());
  store.set("notes", notes());

  profile.save({ ...PROFILE });

  store.update("meta", (m) => {
    m.demo = true;
    m.demoVersion = SEED_VERSION;
    m.streak = 2;
    m.lastCompletionDate = toISODate(new Date(Date.now() - 86400000));
    return m;
  });

  // Remember the appearance the demo was designed for (applied on the next page).
  saveThemePreference(PROFILE.appearance);
}

/* Make sure the account exists in synora-users. If it already does, its
   password hash is re-synced to the constant above: the demo account
   belongs to the app, so the app owns its credential. hashFn comes from
   auth.js, which owns the hashing. */
function ensureAccount(hashFn) {
  const users = readJSON(KEYS.users, []);
  const passHash = hashFn(PASSWORD);
  const existing = users.find((u) => String(u.username).toLowerCase() === USERNAME);

  if (existing) {
    if (existing.passHash === passHash) return false;
    existing.passHash = passHash;
    writeJSON(KEYS.users, users);
    return true;
  }

  users.push({
    firstName: ACCOUNT.firstName,
    lastName: ACCOUNT.lastName,
    fullName: ACCOUNT.firstName + " " + ACCOUNT.lastName,
    username: ACCOUNT.username,
    email: ACCOUNT.email,
    passHash,
    isDemo: true,
    createdAt: new Date().toISOString(),
  });
  writeJSON(KEYS.users, users);
  return true;
}

export const demo = {
  username: USERNAME,
  password: PASSWORD,
  seed,
  ensureAccount,

  isCurrent() {
    const u = session.username();
    return !!u && u.toLowerCase() === USERNAME;
  },

  /* True on the very first sign-in, and again after SEED_VERSION is bumped.
     Must be called while the demo account is the current session. */
  needsSeed() {
    const m = store.get("meta");
    return !m.demo || m.demoVersion !== SEED_VERSION;
  },
};
