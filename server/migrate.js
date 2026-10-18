/* =========================================================
   Self-upgrading database.

   New features need new columns and tables. Instead of asking
   for SQL to be run by hand on every database (Aiven, a local
   MySQL…), the API brings the schema up to date itself, once per
   server start, before the first request that touches data:

     • a missing column is added (ALTER TABLE … ADD COLUMN)
     • a missing table is created (CREATE TABLE IF NOT EXISTS)

   Every step checks first, so running it again changes nothing.
   database/schema.sql already contains the final shape for a
   brand-new database. A local MySQL needs local-user.sql run once
   more (it now also grants ALTER and CREATE to synora_app).
   ========================================================= */

import { pool } from "./db.js";

/* Columns added after the first release: [table, column, definition]. */
const COLUMNS = [
  ["subjects", "color", "VARCHAR(20) NULL AFTER track_attendance"],
  ["tasks", "repeat_rule", "ENUM('none', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'none' AFTER status"],
  ["tasks", "subtasks", "JSON NULL AFTER repeat_rule"],
  ["timetable_classes", "last_marked", "DATE NULL AFTER teacher"],
  ["user_meta", "checklist_dismissed", "BOOLEAN NOT NULL DEFAULT FALSE AFTER demo_version"],
  ["tasks", "attachments", "JSON NULL AFTER subtasks"],
  ["notes", "attachments", "JSON NULL AFTER category"],
];

/* Tables added after the first release. */
const TABLES = [
  `CREATE TABLE IF NOT EXISTS semesters (
     user_id  INT UNSIGNED NOT NULL,
     id       VARCHAR(40)  NOT NULL,
     name     VARCHAR(60)  NOT NULL,
     position INT UNSIGNED NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, id),
     CONSTRAINT fk_semesters_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS semester_grades (
     user_id     INT UNSIGNED     NOT NULL,
     id          VARCHAR(40)      NOT NULL,
     semester_id VARCHAR(40)      NOT NULL,
     name        VARCHAR(100)     NOT NULL,
     credits     TINYINT UNSIGNED NOT NULL DEFAULT 0,
     grade       ENUM('O', 'A+', 'A', 'B+', 'B', 'E1', 'E2', 'E3') NULL,
     position    INT UNSIGNED     NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, id),
     CONSTRAINT fk_semgrades_semester FOREIGN KEY (user_id, semester_id)
       REFERENCES semesters (user_id, id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS focus_sessions (
     user_id    INT UNSIGNED     NOT NULL,
     id         VARCHAR(40)      NOT NULL,
     subject_id VARCHAR(40)      NULL,
     task_id    VARCHAR(40)      NULL,
     minutes    SMALLINT UNSIGNED NOT NULL,
     ended_at   DATETIME(3)      NOT NULL,
     PRIMARY KEY (user_id, id),
     KEY ix_focus_ended (user_id, ended_at),
     CONSTRAINT fk_focus_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS attachments (
     user_id    INT UNSIGNED  NOT NULL,
     id         VARCHAR(40)   NOT NULL,
     owner_type ENUM('task', 'note') NOT NULL,
     owner_id   VARCHAR(40)   NOT NULL,
     name       VARCHAR(200)  NOT NULL,
     mime       VARCHAR(100)  NOT NULL,
     size       INT UNSIGNED  NOT NULL,
     data       MEDIUMBLOB    NOT NULL,
     created_at DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     PRIMARY KEY (user_id, id),
     KEY ix_attachments_owner (user_id, owner_type, owner_id),
     CONSTRAINT fk_attachments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
     id         CHAR(64)      NOT NULL,
     user_id    INT UNSIGNED  NOT NULL,
     endpoint   TEXT          NOT NULL,
     p256dh     VARCHAR(200)  NOT NULL,
     auth       VARCHAR(100)  NOT NULL,
     tz         VARCHAR(60)   NOT NULL DEFAULT 'Asia/Kolkata',
     created_at DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     PRIMARY KEY (id),
     KEY ix_push_user (user_id),
     CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS push_sent (
     user_id INT UNSIGNED NOT NULL,
     \`key\`   VARCHAR(120) NOT NULL,
     sent_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     PRIMARY KEY (user_id, \`key\`),
     CONSTRAINT fk_pushsent_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS password_resets (
     token_hash CHAR(64)     NOT NULL,
     user_id    INT UNSIGNED NOT NULL,
     expires_at DATETIME(3)  NOT NULL,
     PRIMARY KEY (token_hash),
     CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
   )`,
];

let done = null;

/* Resolves once the schema is current. A failure (e.g. the database user
   may not ALTER) is logged and retried on a later request; features that
   need the new columns report errors until then. */
export function ensureSchema() {
  if (!done) {
    done = upgrade().catch((err) => {
      console.error("Schema upgrade failed:", err.code || err.name, err.sqlMessage || err.message);
      done = null;
    });
  }
  return done;
}

async function upgrade() {
  const [rows] = await pool.query(
    "SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()",
  );
  const have = new Set(rows.map((r) => r.t + "." + r.c));
  for (const sql of TABLES) await pool.query(sql);
  for (const [table, column, definition] of COLUMNS) {
    if (!have.has(table + "." + column)) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log("Schema: added", table + "." + column);
    }
  }
}
