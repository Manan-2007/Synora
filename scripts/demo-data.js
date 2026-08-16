/* =========================================================
   Synora — Demo account

   ONE sample account exists, so the app can be demonstrated
   without someone having to type an evening's worth of data in
   front of an audience:

     Arshpreet Kaur · @arsh2309 · B.E CSE AIML · Semester 3

   Everything below belongs to that account and nothing else.
   The data is written into arsh2309's own namespaced keys the
   first time it signs in, exactly as if she had typed it — so
   it can be edited and deleted like any other workspace.

   A brand-new account gets NONE of this. That is the point:
   signing up gives you an empty workspace, and the only way to
   see sample data is to deliberately use the demo account.

   The six subjects — FEE, DBMS, SDE, OOPS, Cyber Security and
   Finance for Everyone — are the canonical list for this account
   and are referenced by id everywhere: attendance, CGPA, timetable,
   tasks and notes all point at the same six records.

   Four of them record attendance. Cyber Security and Finance for
   Everyone do not, and are the reason this dataset exists in the
   shape it does: they demonstrate that a subject can count fully
   towards the CGPA while being absent from attendance entirely.

   The password here is a LOCAL demo credential for this project
   only. It unlocks nothing but a browser's localStorage.

   Depends on: storage.js
   ========================================================= */

window.Synora = window.Synora || {};

(function () {
  "use strict";

  var USERNAME = "arsh2309";
  var PASSWORD = "arsh2309";       // local demo credential — not a real secret

  /* Bump this whenever the shipped demo data below changes (avatar,
     credits, subjects, tasks, …). The demo seeds once and then behaves
     like an editable workspace — which means a change made here would
     otherwise never reach a browser that had already opened the demo,
     because seeding is skipped after the first time. Comparing this
     version against the one stored in meta forces a fresh re-seed when
     (and only when) the fixture actually changes, so the demo always
     matches what ships. A re-seed resets the demo workspace to the
     shipped state; that is the intended behaviour for a showcase. */
  var SEED_VERSION = 2;

  var ACCOUNT = {
    firstName: "Arshpreet",
    lastName: "Kaur",
    username: USERNAME,
    email: "arsh2309@gmail.com",
    isDemo: true
  };

  var PROFILE = {
    firstName: "Arshpreet",
    lastName: "Kaur",
    username: USERNAME,
    email: "arsh2309@gmail.com",
    avatar: { type: "illustration", id: "avatar-10" },
    program: "B.E CSE AIML",
    semester: "3",
    targetAttendance: 75,
    appearance: "dark",
    onboarded: true
  };

  /* The canonical six. Fixed ids so every other record can point here.

     Four of them take a register; Cyber Security and Finance for
     Everyone do not. That is the whole point of this demo dataset —
     it shows trackAttendance doing its job, with two subjects that
     count fully towards the CGPA while never appearing on the
     Attendance page, its chart, or in an attendance warning. */
  var SUBJECTS = [
    { id: "fee",     name: "FEE",                  credits: 3, trackAttendance: true },
    { id: "dbms",    name: "DBMS",                 credits: 3, trackAttendance: true },
    { id: "sde",     name: "SDE",                  credits: 3, trackAttendance: true },
    { id: "oops",    name: "OOPS",                 credits: 4, trackAttendance: true },
    { id: "cyber",   name: "Cyber Security",       credits: 3, trackAttendance: false },
    { id: "finance", name: "Finance for Everyone", credits: 1, trackAttendance: false }
  ];

  /* Deliberately uneven, so the attendance chart has something to say:
     one comfortably clear, one just above target, one below it. */
  /* Counts for the four tracked subjects only. Cyber Security and
     Finance for Everyone deliberately have no row at all — not a row
     of zeroes, which would still be a claim about attendance. */
  var ATTENDANCE = [
    { id: "att-fee",  subjectId: "fee",  total: 42, attended: 39 },   // 92.9%
    { id: "att-dbms", subjectId: "dbms", total: 40, attended: 31 },   // 77.5%
    { id: "att-sde",  subjectId: "sde",  total: 38, attended: 25 },   // 65.8% — below target
    { id: "att-oops", subjectId: "oops", total: 44, attended: 37 }    // 84.1%
  ];

  /* Grades across ALL SIX subjects — including the two that are not
     tracked for attendance, which is what shows CGPA and attendance
     are independent systems. CGPA is NOT stored; it is computed from
     these grades and the credits on each subject.

     One deliberate failure (E1 on Cyber Security, worth 0 points but
     still carrying its 3 credits) so the chart's negative axis has
     something real to draw, and so the fail visibly drags the average.

       FEE  A+  3×9  = 27
       DBMS A   3×8  = 24
       SDE  B+  3×7  = 21
       OOPS O   4×10 = 40
       Cyber E1 3×0  =  0
       Fin  B   1×6  =  6
       ------------------
       118 / 17 credits = 6.94                                     */
  var CGPA = {
    subjects: [
      { id: "grd-fee",     subjectId: "fee",     grade: "A+" },
      { id: "grd-dbms",    subjectId: "dbms",    grade: "A"  },
      { id: "grd-sde",     subjectId: "sde",     grade: "B+" },
      { id: "grd-oops",    subjectId: "oops",    grade: "O"  },
      { id: "grd-cyber",   subjectId: "cyber",   grade: "E1" },
      { id: "grd-finance", subjectId: "finance", grade: "B"  }
    ]
  };

  /* The exact weekly grid for this demo, three two-hour blocks a day,
     Monday to Friday. Entries reference a subjectId, never a name, so
     renaming OOPS in Settings renames it here too. */
  var TIMETABLE = [
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
    { id: "tt-fri-3", subjectId: "oops", day: "Friday",    startTime: "14:00", endTime: "16:00", room: "Lab 1",   teacher: "Prof. Nair" }
  ];

  /* Deadlines are relative to whenever the demo is opened, so the
     dashboard always has real overdue / due-today / upcoming work
     rather than dates that went stale months ago. */
  function dateOffset(days) {
    return Synora.util.toISODate(new Date(Date.now() + days * 86400000));
  }
  function whenCompleted(days) {
    return new Date(Date.now() + days * 86400000).toISOString();
  }

  function tasks() {
    var made = new Date(Date.now() - 20 * 86400000).toISOString();
    return [
      /* ---- Overdue (3) ---- */
      { id: "tsk-1", title: "Submit SDE assignment 2", subject: "SDE",
        description: "Sprint planning write-up and the updated use-case diagram.",
        deadline: dateOffset(-4), priority: "critical", status: "in-progress",
        createdAt: made, completedAt: null },
      { id: "tsk-2", title: "DBMS lab record — week 6", subject: "DBMS",
        description: "Nested queries and joins, questions 1–8.",
        deadline: dateOffset(-2), priority: "high", status: "not-started",
        createdAt: made, completedAt: null },
      { id: "tsk-3", title: "Revise OOPS inheritance notes", subject: "OOPS",
        description: "Multilevel vs hierarchical, plus the diamond problem.",
        deadline: dateOffset(-1), priority: "medium", status: "not-started",
        createdAt: made, completedAt: null },

      /* ---- Due today (2) ---- */
      { id: "tsk-4", title: "FEE assignment 3", subject: "FEE",
        description: "Network theorems — Thevenin and Norton problems.",
        deadline: dateOffset(0), priority: "high", status: "in-progress",
        createdAt: made, completedAt: null },
      { id: "tsk-5", title: "Prepare DBMS viva answers", subject: "DBMS",
        description: "Normalization up to BCNF, with an example for each form.",
        deadline: dateOffset(0), priority: "medium", status: "not-started",
        createdAt: made, completedAt: null },

      /* ---- Upcoming (5) ---- */
      { id: "tsk-6", title: "OOPS practical — file handling", subject: "OOPS",
        description: "Read/write streams and exception handling.",
        deadline: dateOffset(2), priority: "high", status: "not-started",
        createdAt: made, completedAt: null },
      { id: "tsk-7", title: "SDE project — module 3", subject: "SDE",
        description: "Finish the reporting module and write its test cases.",
        deadline: dateOffset(4), priority: "critical", status: "not-started",
        createdAt: made, completedAt: null },
      { id: "tsk-8", title: "FEE unit test revision", subject: "FEE",
        description: "AC fundamentals and RLC circuits.",
        deadline: dateOffset(6), priority: "medium", status: "not-started",
        createdAt: made, completedAt: null },
      { id: "tsk-9", title: "DBMS mini-project proposal", subject: "DBMS",
        description: "One page: problem, schema sketch, tech stack.",
        deadline: dateOffset(8), priority: "low", status: "not-started",
        createdAt: made, completedAt: null },
      { id: "tsk-10", title: "Read SDE chapter on agile estimation", subject: "SDE",
        description: "",
        deadline: dateOffset(11), priority: "low", status: "not-started",
        createdAt: made, completedAt: null },

      /* ---- Completed (6) ----
         Two of these were finished before their deadline; the rest went
         in late. That keeps "Deadline Master" (3 on time) still to earn. */
      { id: "tsk-11", title: "OOPS assignment 1 — classes and objects", subject: "OOPS",
        description: "", deadline: dateOffset(-12), priority: "medium", status: "completed",
        createdAt: made, completedAt: whenCompleted(-13) },
      { id: "tsk-12", title: "FEE lab record — experiments 1–4", subject: "FEE",
        description: "", deadline: dateOffset(-10), priority: "high", status: "completed",
        createdAt: made, completedAt: whenCompleted(-11) },
      { id: "tsk-13", title: "DBMS ER diagram exercise", subject: "DBMS",
        description: "", deadline: dateOffset(-9), priority: "medium", status: "completed",
        createdAt: made, completedAt: whenCompleted(-7) },
      { id: "tsk-14", title: "SDE seminar slides", subject: "SDE",
        description: "", deadline: dateOffset(-7), priority: "low", status: "completed",
        createdAt: made, completedAt: whenCompleted(-5) },
      { id: "tsk-15", title: "OOPS quiz preparation", subject: "OOPS",
        description: "", deadline: dateOffset(-6), priority: "high", status: "completed",
        createdAt: made, completedAt: whenCompleted(-4) },
      { id: "tsk-16", title: "FEE tutorial sheet 2", subject: "FEE",
        description: "", deadline: dateOffset(-3), priority: "low", status: "completed",
        createdAt: made, completedAt: whenCompleted(-2) },
      { id: "tsk-17", title: "DBMS assignment 1 — relational algebra", subject: "DBMS",
        description: "", deadline: dateOffset(-16), priority: "medium", status: "completed",
        createdAt: made, completedAt: whenCompleted(-14) },
      { id: "tsk-18", title: "SDE case study write-up", subject: "SDE",
        description: "", deadline: dateOffset(-15), priority: "medium", status: "completed",
        createdAt: made, completedAt: whenCompleted(-13) },
      { id: "tsk-19", title: "OOPS lab — constructors and destructors", subject: "OOPS",
        description: "", deadline: dateOffset(-14), priority: "low", status: "completed",
        createdAt: made, completedAt: whenCompleted(-12) },

      /* Completed yesterday, which is what keeps the streak alive. */
      { id: "tsk-20", title: "FEE numericals — set 4", subject: "FEE",
        description: "", deadline: dateOffset(-2), priority: "medium", status: "completed",
        createdAt: made, completedAt: whenCompleted(-1) }
    ];
  }

  function notes() {
    var t = function (days) {
      return new Date(Date.now() - days * 86400000).toISOString();
    };
    return [
      { id: "nte-1", title: "DBMS — SQL revision", category: "DBMS",
        body: "JOIN types: INNER keeps matches only, LEFT keeps every row on the left, " +
              "FULL keeps both sides.\nNormalization: 1NF atomic values → 2NF no partial " +
              "dependency → 3NF no transitive dependency → BCNF every determinant is a key.",
        createdAt: t(9), updatedAt: t(3) },
      { id: "nte-2", title: "OOPS — the four pillars", category: "OOPS",
        body: "Encapsulation: data + methods behind one interface.\nInheritance: reuse, " +
              "not copy.\nPolymorphism: overloading is compile-time, overriding is run-time.\n" +
              "Abstraction: expose what it does, hide how.",
        createdAt: t(7), updatedAt: t(2) },
      { id: "nte-3", title: "SDE — assignment checklist", category: "SDE",
        body: "Still to do: reporting module, unit tests, and the README.\n" +
              "Ask Dr. Rao whether the estimation section needs story points or hours.",
        createdAt: t(5), updatedAt: t(1) },
      { id: "nte-4", title: "FEE — formulas to remember", category: "FEE",
        body: "Thevenin: find Vth open-circuit, Rth with sources killed.\n" +
              "For AC: Z = R + j(XL − XC), and resonance is at XL = XC.",
        createdAt: t(4), updatedAt: t(4) },
      { id: "nte-5", title: "Week plan", category: "Personal",
        body: "Mon–Tue: clear the overdue SDE assignment.\nWed: DBMS viva prep.\n" +
              "Thu: OOPS practical.\nFri: catch up on SDE attendance.",
        createdAt: t(2), updatedAt: t(0) }
    ];
  }

  /* Write the whole workspace. Runs the first time arsh2309 signs in,
     and again whenever SEED_VERSION changes — otherwise it is left
     alone and behaves like her own editable data. */
  function seed() {
    var store = Synora.store;

    store.subjects.setAll(SUBJECTS);
    store.set("attendance", ATTENDANCE.map(function (a) {
      return { id: a.id, subjectId: a.subjectId, total: a.total, attended: a.attended };
    }));
    store.set("cgpa", { subjects: CGPA.subjects.map(function (g) {
      return { id: g.id, subjectId: g.subjectId, grade: g.grade };
    }) });
    store.set("timetable", TIMETABLE.map(function (c) {
      return {
        id: c.id, subjectId: c.subjectId, day: c.day,
        startTime: c.startTime, endTime: c.endTime, room: c.room, teacher: c.teacher
      };
    }));
    store.set("tasks", tasks());
    store.set("notes", notes());

    var p = {};
    Object.keys(PROFILE).forEach(function (k) { p[k] = PROFILE[k]; });
    Synora.profile.save(p);

    store.update("meta", function (m) {
      m.demo = true;
      m.demoVersion = SEED_VERSION;
      m.streak = 2;
      m.lastCompletionDate = Synora.util.toISODate(new Date(Date.now() - 86400000));
      return m;
    });

    // Remember the appearance the demo was designed for.
    localStorage.setItem(Synora.keys.theme, PROFILE.appearance);
  }

  /* Make sure the account itself exists in synora-users, so the demo
     can be signed into on a browser that has never seen Synora.
     hashFn is passed in by auth.js, which owns the hashing.

     If it already exists, its password is re-synced to the constant
     above. The demo account belongs to the app, not to a person, so
     the app owns its credential — otherwise changing PASSWORD here
     would silently break the "Use the demo account" button on every
     browser that had already opened Synora once, which is exactly
     the browser a demo is most likely to be given on. Only the hash
     is touched; the workspace and its edits are left alone. */
  function ensureAccount(hashFn) {
    var users = Synora.storage.readJSON(Synora.keys.users, []);
    var hash = hashFn(PASSWORD);

    var existing = null;
    users.forEach(function (u) {
      if (String(u.username).toLowerCase() === USERNAME) existing = u;
    });

    if (existing) {
      if (existing.passHash === hash) return false;
      existing.passHash = hash;
      Synora.storage.writeJSON(Synora.keys.users, users);
      return true;
    }

    users.push({
      firstName: ACCOUNT.firstName,
      lastName: ACCOUNT.lastName,
      fullName: ACCOUNT.firstName + " " + ACCOUNT.lastName,
      username: ACCOUNT.username,
      email: ACCOUNT.email,
      passHash: hash,
      isDemo: true,
      createdAt: new Date().toISOString()
    });
    Synora.storage.writeJSON(Synora.keys.users, users);
    return true;
  }

  Synora.demo = {
    username: USERNAME,
    password: PASSWORD,
    account: ACCOUNT,
    subjects: SUBJECTS,
    seed: seed,
    ensureAccount: ensureAccount,
    /* Is the signed-in account the demo one? */
    isCurrent: function () {
      var u = Synora.session.username();
      return !!u && u.toLowerCase() === USERNAME;
    },
    /* Does the demo need seeding? True on the very first sign-in, and
       again after SEED_VERSION is bumped so a shipped change reaches
       browsers that already opened the demo. Must be called while the
       demo account is the current session (meta is per-user). */
    needsSeed: function () {
      var m = Synora.store.get("meta");
      return !m.demo || m.demoVersion !== SEED_VERSION;
    }
  };
})();
