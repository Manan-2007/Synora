/* =========================================================
   Collections ⇄ tables.

   The app keeps each user's data as ten "collections" (the same
   shapes it stores in localStorage). This file converts each one
   to rows in its MySQL table and back again:

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

   Writes replace a collection as a whole: the app always sends the
   full, current list, so "delete this user's rows, insert the new
   ones" inside one transaction is simple and always consistent.
   Subjects are the exception (see saveSubjects).
   ========================================================= */

/* The order matters when several collections arrive together: subjects
   must exist before the timetable, attendance and grades that point at
   them (foreign keys). */
export const COLLECTIONS = [
  "profile", "meta", "subjects",
  "tasks", "notes", "timetable", "attendance", "cgpa",
  "achievements", "notifications",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PRIORITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["not-started", "in-progress", "completed"];
const GRADES = ["O", "A+", "A", "B+", "B", "E1", "E2", "E3"];

/* ---- Value helpers: app value → column value ---- */

/* Text clipped to the column's length, so one over-long value can't make
   the whole save fail. */
const str = (v, max) => String(v ?? "").slice(0, max);
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
const fromTime = (v) => (v ? v.slice(0, 5) : "");

/* Insert many rows at once: INSERT INTO t (a, b) VALUES (…), (…). */
async function insertRows(conn, table, columns, rows) {
  if (!rows.length) return;
  await conn.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ?`, [rows]);
}

async function replaceRows(conn, table, userId, columns, rows) {
  await conn.query(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  await insertRows(conn, table, ["user_id", ...columns], rows.map((r) => [userId, ...r]));
}

const asList = (v) => (Array.isArray(v) ? v : []);

/* Subject ids that exist for this user right now. Rows that point at a
   subject that is gone are skipped instead of breaking the foreign key. */
async function subjectIds(conn, userId) {
  const [rows] = await conn.query("SELECT id FROM subjects WHERE user_id = ?", [userId]);
  return new Set(rows.map((r) => r.id));
}

/* ---- Writers: one per collection ---- */

const writers = {
  async profile(conn, userId, p) {
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
  },

  async meta(conn, userId, m) {
    if (!m || typeof m !== "object") return;
    await conn.query(
      `REPLACE INTO user_meta (user_id, streak, last_completion_date, demo, demo_version)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, int(m.streak), toDate(m.lastCompletionDate), !!m.demo,
        m.demoVersion == null ? null : int(m.demoVersion)],
    );
  },

  /* Subjects are upserted and only the missing ones deleted. Deleting
     every subject first would cascade away the timetable, attendance and
     grades that point at the subjects that are staying. */
  async subjects(conn, userId, list) {
    const rows = asList(list).filter((s) => s && s.id);
    const ids = rows.map((s) => str(s.id, 40));

    if (ids.length) {
      await conn.query("DELETE FROM subjects WHERE user_id = ? AND id NOT IN (?)", [userId, ids]);
      await conn.query(
        `INSERT INTO subjects (user_id, id, name, credits, track_attendance, position) VALUES ?
         ON DUPLICATE KEY UPDATE name = VALUES(name), credits = VALUES(credits),
           track_attendance = VALUES(track_attendance), position = VALUES(position)`,
        [rows.map((s, i) => [userId, str(s.id, 40), str(s.name, 100), Math.min(255, int(s.credits)),
          s.trackAttendance !== false, i])],
      );
    } else {
      await conn.query("DELETE FROM subjects WHERE user_id = ?", [userId]);
    }
  },

  async tasks(conn, userId, list) {
    await replaceRows(conn, "tasks", userId,
      ["id", "title", "subject", "description", "deadline", "priority", "status", "created_at", "completed_at", "position"],
      asList(list).filter((t) => t && t.id).map((t, i) => [
        str(t.id, 40), str(t.title, 255), str(t.subject, 100), t.description ? String(t.description) : null,
        toDate(t.deadline), oneOf(t.priority, PRIORITIES, "medium"), oneOf(t.status, STATUSES, "not-started"),
        toDateTime(t.createdAt), toDateTime(t.completedAt), i,
      ]));
  },

  async notes(conn, userId, list) {
    await replaceRows(conn, "notes", userId,
      ["id", "title", "body", "category", "created_at", "updated_at", "position"],
      asList(list).filter((n) => n && n.id).map((n, i) => [
        str(n.id, 40), str(n.title, 255), n.body ? String(n.body) : null, str(n.category, 100),
        toDateTime(n.createdAt), toDateTime(n.updatedAt), i,
      ]));
  },

  async timetable(conn, userId, list) {
    const known = await subjectIds(conn, userId);
    await replaceRows(conn, "timetable_classes", userId,
      ["id", "subject_id", "day", "start_time", "end_time", "room", "teacher", "position"],
      asList(list).filter((c) => c && c.id && known.has(c.subjectId) && DAYS.includes(c.day)).map((c, i) => [
        str(c.id, 40), c.subjectId, c.day, toTime(c.startTime), toTime(c.endTime),
        str(c.room, 100), str(c.teacher, 100), i,
      ]));
  },

  async attendance(conn, userId, list) {
    const known = await subjectIds(conn, userId);
    await replaceRows(conn, "attendance", userId,
      ["id", "subject_id", "total", "attended", "position"],
      asList(list).filter((a) => a && a.id && known.has(a.subjectId)).map((a, i) => {
        const total = int(a.total);
        return [str(a.id, 40), a.subjectId, total, Math.min(int(a.attended), total), i];
      }));
  },

  async cgpa(conn, userId, value) {
    const known = await subjectIds(conn, userId);
    const list = value && Array.isArray(value.subjects) ? value.subjects : [];
    await replaceRows(conn, "grades", userId,
      ["id", "subject_id", "grade", "position"],
      list.filter((g) => g && g.id && known.has(g.subjectId)).map((g, i) => [
        str(g.id, 40), g.subjectId, oneOf(g.grade, GRADES, null), i,
      ]));
  },

  async achievements(conn, userId, value) {
    const unlocked = value && value.unlocked && typeof value.unlocked === "object" ? value.unlocked : {};
    await replaceRows(conn, "achievements", userId,
      ["achievement_id", "unlocked_at"],
      Object.entries(unlocked)
        .map(([id, when]) => [str(id, 40), toDateTime(when)])
        .filter(([, when]) => when));
  },

  async notifications(conn, userId, list) {
    await replaceRows(conn, "notifications", userId,
      ["id", "notif_key", "type", "title", "body", "created_at", "is_read", "is_seen", "position"],
      asList(list).filter((n) => n && n.id).map((n, i) => [
        str(n.id, 40), n.key ? str(n.key, 160) : null, str(n.type || "info", 20), str(n.title, 255),
        n.body ? String(n.body) : null, toDateTime(n.createdAt), !!n.read, !!n.seen, i,
      ]));
  },
};

/* Save the collections in `data` (any subset), in dependency order. */
export async function saveCollections(conn, userId, data) {
  for (const name of COLLECTIONS) {
    if (Object.prototype.hasOwnProperty.call(data, name)) await writers[name](conn, userId, data[name]);
  }
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
  };
  if (m && m.demo_version != null) meta.demoVersion = m.demo_version;

  const ordered = (table) => q(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY position`);

  const subjects = (await ordered("subjects")).map((s) => ({
    id: s.id, name: s.name, credits: s.credits, trackAttendance: !!s.track_attendance,
  }));

  const tasks = (await ordered("tasks")).map((t) => ({
    id: t.id, title: t.title, subject: t.subject, description: t.description || "",
    deadline: t.deadline || "", priority: t.priority, status: t.status,
    createdAt: fromDateTime(t.created_at), completedAt: fromDateTime(t.completed_at),
  }));

  const notes = (await ordered("notes")).map((n) => ({
    id: n.id, title: n.title, body: n.body || "", category: n.category,
    createdAt: fromDateTime(n.created_at), updatedAt: fromDateTime(n.updated_at),
  }));

  const timetable = (await ordered("timetable_classes")).map((c) => ({
    id: c.id, subjectId: c.subject_id, day: c.day,
    startTime: fromTime(c.start_time), endTime: fromTime(c.end_time), room: c.room, teacher: c.teacher,
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

  return { profile, meta, subjects, tasks, notes, timetable, attendance, cgpa, achievements, notifications };
}
