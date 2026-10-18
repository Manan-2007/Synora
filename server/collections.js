/* =========================================================
   Collections ⇄ tables.

   The app keeps each user's data as ten "collections" (the same
   shapes it stores in localStorage). This file converts them to
   rows in their MySQL tables and back again:

     profile        → users (name, email) + profiles
     meta           → user_meta
     subjects       → subjects
     tasks          → tasks
     notes          → notes
     timetable      → timetable_classes
     attendance     → attendance
     cgpa           → grades
     achievements   → achievements
     notifications  → notifications

   Saving is by CHANGE, never by replacing a whole list: the app
   sends, per collection, the items it added or edited ("upsert")
   and the ids it deleted ("delete"). Rows it did not mention are
   left alone, so an item added on another device survives a save
   from a device that has not seen it yet. profile and meta are one
   row each and are saved whole.
   ========================================================= */

export const COLLECTIONS = [
  "profile", "meta", "subjects",
  "tasks", "notes", "timetable", "attendance", "cgpa",
  "achievements", "notifications", "semesters", "focus",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PRIORITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["not-started", "in-progress", "completed"];
const GRADES = ["O", "A+", "A", "B+", "B", "E1", "E2", "E3"];
const REPEATS = ["none", "daily", "weekly", "monthly"];
const COLORS = /^[a-z]{2,20}$/;

/* ---- Value helpers: app value → column value ---- */

/* Text clipped to a VARCHAR's length in characters (whole characters, so an
   emoji is never cut in half). */
const str = (v, max) => Array.from(String(v ?? "")).slice(0, max).join("");

/* TEXT holds at most 65,535 BYTES. Longer text is cut to fit rather than
   failing the whole save; the forms stop well before this. */
const TEXT_BYTES = 65535;
function text(v) {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v);
  if (Buffer.byteLength(s) <= TEXT_BYTES) return s;
  return Buffer.from(s).subarray(0, TEXT_BYTES).toString().replace(/�+$/, "");
}

const int = (v) => Math.max(0, Math.trunc(Number(v) || 0));
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

/* ISO string → 'YYYY-MM-DD HH:MM:SS.mmm' (UTC) for DATETIME(3); null if empty or invalid. */
function toDateTime(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 23).replace("T", " ");
}

/* 'YYYY-MM-DD' for DATE; null otherwise. */
const toDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : null);

/* 'HH:MM' for TIME; null otherwise. */
const toTime = (v) => (/^\d{2}:\d{2}$/.test(String(v || "")) ? v + ":00" : null);

/* ---- Column value → app value ---- */

const fromDateTime = (v) => (v ? v.replace(" ", "T") + "Z" : null);

/* mysql2 may hand a JSON column back parsed or as text. */
function parseJSON(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return null; }
}
const fromTime = (v) => (v ? v.slice(0, 5) : "");

const asList = (v) => (Array.isArray(v) ? v : []);

/* A task's checklist, stored as a JSON column: at most 50 steps. */
function subtasksJSON(list) {
  const clean = asList(list).filter((s) => s && s.id).slice(0, 50)
    .map((s) => ({ id: str(s.id, 40), text: str(s.text, 200), done: !!s.done }));
  return clean.length ? JSON.stringify(clean) : null;
}
const pos = (r, i) => int(r && r._pos !== undefined ? r._pos : i);

/* Subject ids that exist for this user right now. Rows that point at a
   subject that is gone are skipped instead of breaking the foreign key. */
async function subjectIds(conn, userId) {
  const [rows] = await conn.query("SELECT id FROM subjects WHERE user_id = ?", [userId]);
  return new Set(rows.map((r) => r.id));
}

/* ---- List collections: one table each ----
   key:      the column that identifies a row (with user_id)
   columns:  the columns written, in order
   row:      app item → column values
   valid:    which items can be stored (bad ones are skipped, not fatal)
   needsSubject: rows that must point at an existing subject */
const LISTS = {
  subjects: {
    table: "subjects", key: "id",
    columns: ["id", "name", "credits", "track_attendance", "color", "position"],
    row: (s, i) => [str(s.id, 40), str(s.name, 100), Math.min(255, int(s.credits)), s.trackAttendance !== false,
      COLORS.test(s.color || "") ? s.color : null, pos(s, i)],
  },
  tasks: {
    table: "tasks", key: "id",
    columns: ["id", "title", "subject", "description", "deadline", "priority", "status", "repeat_rule", "subtasks",
      "created_at", "completed_at", "position"],
    row: (t, i) => [
      str(t.id, 40), str(t.title, 255), str(t.subject, 100), text(t.description),
      toDate(t.deadline), oneOf(t.priority, PRIORITIES, "medium"), oneOf(t.status, STATUSES, "not-started"),
      oneOf(t.repeat, REPEATS, "none"), subtasksJSON(t.subtasks),
      toDateTime(t.createdAt), toDateTime(t.completedAt), pos(t, i),
    ],
  },
  notes: {
    table: "notes", key: "id",
    columns: ["id", "title", "body", "category", "created_at", "updated_at", "position"],
    row: (n, i) => [str(n.id, 40), str(n.title, 255), text(n.body), str(n.category, 100),
      toDateTime(n.createdAt), toDateTime(n.updatedAt), pos(n, i)],
  },
  timetable: {
    table: "timetable_classes", key: "id", needsSubject: true,
    columns: ["id", "subject_id", "day", "start_time", "end_time", "room", "teacher", "last_marked", "position"],
    valid: (c) => DAYS.includes(c.day),
    row: (c, i) => [str(c.id, 40), c.subjectId, c.day, toTime(c.startTime), toTime(c.endTime),
      str(c.room, 100), str(c.teacher, 100), toDate(c.lastMarked), pos(c, i)],
  },
  attendance: {
    table: "attendance", key: "id", needsSubject: true,
    columns: ["id", "subject_id", "total", "attended", "position"],
    row: (a, i) => {
      const total = int(a.total);
      return [str(a.id, 40), a.subjectId, total, Math.min(int(a.attended), total), pos(a, i)];
    },
  },
  /* The app keeps grades as cgpa = { subjects: [...] }; changes arrive as
     those inner rows. */
  cgpa: {
    table: "grades", key: "id", needsSubject: true,
    columns: ["id", "subject_id", "grade", "position"],
    row: (g, i) => [str(g.id, 40), g.subjectId, oneOf(g.grade, GRADES, null), pos(g, i)],
  },
  /* achievements = { unlocked: { id: date } }; changes arrive as { id, unlockedAt }. */
  achievements: {
    table: "achievements", key: "achievement_id",
    columns: ["achievement_id", "unlocked_at"],
    valid: (a) => !!toDateTime(a.unlockedAt),
    row: (a) => [str(a.id, 40), toDateTime(a.unlockedAt)],
  },
  notifications: {
    table: "notifications", key: "id",
    columns: ["id", "notif_key", "type", "title", "body", "created_at", "is_read", "is_seen", "position"],
    row: (n, i) => [str(n.id, 40), n.key ? str(n.key, 160) : null, str(n.type || "info", 20), str(n.title, 255),
      text(n.body), toDateTime(n.createdAt), !!n.read, !!n.seen, pos(n, i)],
  },
  /* Completed past semesters; their grades are child rows (saveSemesters). */
  semesters: {
    table: "semesters", key: "id",
    columns: ["id", "name", "position"],
    row: (s, i) => [str(s.id, 40), str(s.name, 60), pos(s, i)],
  },
  focus: {
    table: "focus_sessions", key: "id",
    columns: ["id", "subject_id", "task_id", "minutes", "ended_at"],
    valid: (f) => int(f.minutes) > 0 && !!toDateTime(f.endedAt),
    row: (f) => [str(f.id, 40), f.subjectId ? str(f.subjectId, 40) : null, f.taskId ? str(f.taskId, 40) : null,
      Math.min(600, int(f.minutes)), toDateTime(f.endedAt)],
  },
};

/* A semester row plus its grades: the grades of every semester that changed
   are replaced as a set. */
async function saveSemesters(conn, userId, change) {
  await upsertRows(conn, userId, LISTS.semesters, change.upsert, null);
  for (const sem of asList(change.upsert).filter((s) => s && s.id)) {
    const semId = str(sem.id, 40);
    await conn.query("DELETE FROM semester_grades WHERE user_id = ? AND semester_id = ?", [userId, semId]);
    const rows = asList(sem.subjects).filter((g) => g && g.id).slice(0, 40).map((g, i) => [
      userId, str(g.id, 40), semId, str(g.name, 100), Math.min(255, int(g.credits)), oneOf(g.grade, GRADES, null), i,
    ]);
    if (rows.length) {
      await conn.query("INSERT INTO semester_grades (user_id, id, semester_id, name, credits, grade, position) VALUES ?", [rows]);
    }
  }
  await deleteRows(conn, userId, LISTS.semesters, change.delete);
}

async function upsertRows(conn, userId, spec, items, known) {
  const rows = asList(items)
    .filter((r) => r && r.id)
    .filter((r) => !spec.valid || spec.valid(r))
    .filter((r) => !spec.needsSubject || known.has(r.subjectId))
    .map((r, i) => [userId, ...spec.row(r, i)]);
  if (!rows.length) return;
  const cols = ["user_id", ...spec.columns];
  const updates = spec.columns.filter((c) => c !== spec.key).map((c) => `${c} = VALUES(${c})`).join(", ");
  await conn.query(`INSERT INTO ${spec.table} (${cols.join(", ")}) VALUES ? ON DUPLICATE KEY UPDATE ${updates}`, [rows]);
}

async function deleteRows(conn, userId, spec, ids) {
  const list = asList(ids).filter((id) => typeof id === "string" && id).map((id) => str(id, 40));
  if (!list.length) return;
  await conn.query(`DELETE FROM ${spec.table} WHERE user_id = ? AND ${spec.key} IN (?)`, [userId, list]);
}

/* ---- Single-row collections ---- */

async function saveProfile(conn, userId, p) {
  if (!p || typeof p !== "object") return;
  /* Name and email live on the account row. */
  const names = [];
  const values = [];
  if (p.firstName) { names.push("first_name = ?"); values.push(str(p.firstName, 60)); }
  if (p.lastName)  { names.push("last_name = ?");  values.push(str(p.lastName, 60)); }
  if (p.email)     { names.push("email = ?");      values.push(str(p.email, 255)); }
  if (names.length) {
    await conn.query(`UPDATE users SET ${names.join(", ")} WHERE id = ?`, [...values, userId]);
  }

  let avatar = p.avatar;
  if (typeof avatar === "string") avatar = { type: "illustration", id: avatar };   // older shape
  const avatarType = avatar && ["illustration", "initials"].includes(avatar.type) ? avatar.type : null;

  await conn.query(
    `REPLACE INTO profiles
       (user_id, avatar_type, avatar_id, program, semester, target_attendance, appearance, onboarded)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      avatarType,
      avatarType ? str(avatar.id, 40) : null,
      str(p.program, 120),
      str(p.semester, 20),
      Math.min(100, int(p.targetAttendance) || 75),
      p.appearance === "dark" ? "dark" : "light",
      !!p.onboarded,
    ],
  );
}

async function saveMeta(conn, userId, m) {
  if (!m || typeof m !== "object") return;
  await conn.query(
    `REPLACE INTO user_meta (user_id, streak, last_completion_date, demo, demo_version, checklist_dismissed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, int(m.streak), toDate(m.lastCompletionDate), !!m.demo,
      m.demoVersion == null ? null : int(m.demoVersion), !!m.checklistDismissed],
  );
}

/* Apply one save. `changes` maps collection → { upsert: [...], delete: [ids] }
   (profile and meta → the whole object). Subjects go first so the rows that
   point at them can be checked; deleting a subject also deletes its classes,
   attendance and grade (ON DELETE CASCADE), as in the app. */
export async function applyChanges(conn, userId, changes) {
  const has = (name) => Object.prototype.hasOwnProperty.call(changes, name);
  if (has("profile")) await saveProfile(conn, userId, changes.profile);
  if (has("meta")) await saveMeta(conn, userId, changes.meta);

  if (has("subjects")) {
    await upsertRows(conn, userId, LISTS.subjects, changes.subjects.upsert, null);
    await deleteRows(conn, userId, LISTS.subjects, changes.subjects.delete);
  }
  const known = await subjectIds(conn, userId);
  for (const name of COLLECTIONS) {
    if (name === "profile" || name === "meta" || name === "subjects" || !has(name)) continue;
    const change = changes[name] || {};
    if (name === "semesters") { await saveSemesters(conn, userId, change); continue; }
    await upsertRows(conn, userId, LISTS[name], change.upsert, known);
    await deleteRows(conn, userId, LISTS[name], change.delete);
  }
}

/* Earlier versions of the app sent whole collections. Treat them as
   upserts only: nothing is deleted, so a stale copy can never wipe out
   items another device added. */
export function changesFromCollections(data) {
  const changes = {};
  for (const name of COLLECTIONS) {
    if (!Object.prototype.hasOwnProperty.call(data, name)) continue;
    const v = data[name];
    if (name === "profile" || name === "meta") changes[name] = v;
    else if (name === "cgpa") changes[name] = { upsert: v && v.subjects };
    else if (name === "achievements") {
      const unlocked = (v && v.unlocked) || {};
      changes[name] = { upsert: Object.entries(unlocked).map(([id, unlockedAt]) => ({ id, unlockedAt })) };
    } else changes[name] = { upsert: v };
  }
  return changes;
}

/* ---- Reader: every collection for one user, in the app's shapes ---- */

export async function loadCollections(conn, userId) {
  const q = async (sql) => (await conn.query(sql, [userId]))[0];

  const [user] = await q("SELECT username, first_name, last_name, email FROM users WHERE id = ?");
  const [p] = await q("SELECT * FROM profiles WHERE user_id = ?");
  const [m] = await q("SELECT * FROM user_meta WHERE user_id = ?");

  const profile = {
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    email: user.email,
    avatar: p && p.avatar_type ? { type: p.avatar_type, id: p.avatar_id } : null,
    program: p ? p.program : "",
    semester: p ? p.semester : "",
    targetAttendance: p ? p.target_attendance : 75,
    appearance: p ? p.appearance : "light",
    onboarded: p ? !!p.onboarded : false,
  };

  const meta = {
    streak: m ? m.streak : 0,
    lastCompletionDate: m ? m.last_completion_date : null,
    demo: m ? !!m.demo : false,
    checklistDismissed: m ? !!m.checklist_dismissed : false,
  };
  if (m && m.demo_version != null) meta.demoVersion = m.demo_version;

  const ordered = (table) => q(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY position`);

  const subjects = (await ordered("subjects")).map((s) => ({
    id: s.id, name: s.name, credits: s.credits, trackAttendance: !!s.track_attendance,
    ...(s.color ? { color: s.color } : {}),
  }));

  const tasks = (await ordered("tasks")).map((t) => ({
    id: t.id, title: t.title, subject: t.subject, description: t.description || "",
    deadline: t.deadline || "", priority: t.priority, status: t.status,
    repeat: t.repeat_rule || "none", subtasks: parseJSON(t.subtasks) || [],
    createdAt: fromDateTime(t.created_at), completedAt: fromDateTime(t.completed_at),
  }));

  const notes = (await ordered("notes")).map((n) => ({
    id: n.id, title: n.title, body: n.body || "", category: n.category,
    createdAt: fromDateTime(n.created_at), updatedAt: fromDateTime(n.updated_at),
  }));

  const timetable = (await ordered("timetable_classes")).map((c) => ({
    id: c.id, subjectId: c.subject_id, day: c.day,
    startTime: fromTime(c.start_time), endTime: fromTime(c.end_time), room: c.room, teacher: c.teacher,
    ...(c.last_marked ? { lastMarked: c.last_marked } : {}),
  }));

  const attendance = (await ordered("attendance")).map((a) => ({
    id: a.id, subjectId: a.subject_id, total: a.total, attended: a.attended,
  }));

  const cgpa = {
    subjects: (await ordered("grades")).map((g) => ({ id: g.id, subjectId: g.subject_id, grade: g.grade || "" })),
  };

  const achievements = { unlocked: {} };
  for (const a of await q("SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ?")) {
    achievements.unlocked[a.achievement_id] = fromDateTime(a.unlocked_at);
  }

  const notifications = (await ordered("notifications")).map((n) => ({
    id: n.id, key: n.notif_key, type: n.type, title: n.title, body: n.body || "",
    createdAt: fromDateTime(n.created_at), read: !!n.is_read, seen: !!n.is_seen,
  }));

  const grades = await q("SELECT * FROM semester_grades WHERE user_id = ? ORDER BY position");
  const semesters = (await ordered("semesters")).map((s) => ({
    id: s.id, name: s.name,
    subjects: grades.filter((g) => g.semester_id === s.id)
      .map((g) => ({ id: g.id, name: g.name, credits: g.credits, grade: g.grade || "" })),
  }));

  const focus = (await q("SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY ended_at")).map((f) => ({
    id: f.id, subjectId: f.subject_id || "", taskId: f.task_id || "", minutes: f.minutes, endedAt: fromDateTime(f.ended_at),
  }));

  return { profile, meta, subjects, tasks, notes, timetable, attendance, cgpa, achievements, notifications, semesters, focus };
}
