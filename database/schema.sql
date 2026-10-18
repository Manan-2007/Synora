-- =========================================================
--   Synora — MySQL schema (local database)
--
--   Run this whole file once in MySQL Workbench (File → Open SQL
--   Script…, then the ⚡ "Execute" button), on each server you use:
--     • the cloud database behind the live site (Aiven), and/or
--     • your local MySQL (then also run local-user.sql).
--   It is safe to run again: nothing is dropped or overwritten.
--
--   It creates the `synora` database and its tables. (The API also
--   adds anything newer by itself: server/migrate.js.)
--
--   Every table except `users` belongs to one user through
--   `user_id`. Deleting a user deletes all of their rows
--   (ON DELETE CASCADE).
-- =========================================================

CREATE DATABASE IF NOT EXISTS synora
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE synora;

-- ---------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------

-- One row per account. Usernames are unique regardless of case
-- (the collation is case-insensitive), matching the app.
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  username      VARCHAR(20)   NOT NULL,
  first_name    VARCHAR(60)   NOT NULL,
  last_name     VARCHAR(60)   NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  password_hash CHAR(60)      NOT NULL,          -- bcrypt, never the password itself
  created_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
);

-- A signed-in browser holds one of these tokens. Signing out deletes it.
CREATE TABLE IF NOT EXISTS sessions (
  token      CHAR(64)     NOT NULL,              -- 32 random bytes, hex
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (token),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Settings chosen during onboarding and in Settings. Name and email
-- live in `users`.
CREATE TABLE IF NOT EXISTS profiles (
  user_id           INT UNSIGNED NOT NULL,
  avatar_type       ENUM('illustration', 'initials') NULL,
  avatar_id         VARCHAR(40)  NULL,           -- e.g. 'avatar-03' or a colour name like 'sage'
  program           VARCHAR(120) NOT NULL DEFAULT '',
  semester          VARCHAR(20)  NOT NULL DEFAULT '',
  target_attendance TINYINT UNSIGNED NOT NULL DEFAULT 75,
  appearance        ENUM('light', 'dark') NOT NULL DEFAULT 'light',
  onboarded         BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Streak bookkeeping and the demo account's seed version.
CREATE TABLE IF NOT EXISTS user_meta (
  user_id              INT UNSIGNED NOT NULL,
  streak               INT UNSIGNED NOT NULL DEFAULT 0,
  last_completion_date DATE         NULL,
  demo                 BOOLEAN      NOT NULL DEFAULT FALSE,
  demo_version         INT UNSIGNED NULL,
  checklist_dismissed  BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_meta_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Academic data
--
-- Row ids are the app's own string ids (e.g. 'tsk-4f9a…'), so the
-- primary key is (user_id, id). `position` keeps each list in the
-- order the app stored it.
-- ---------------------------------------------------------

-- The subject list is the source of truth that the timetable,
-- attendance and grades point at.
CREATE TABLE IF NOT EXISTS subjects (
  user_id          INT UNSIGNED     NOT NULL,
  id               VARCHAR(40)      NOT NULL,
  name             VARCHAR(100)     NOT NULL,
  credits          TINYINT UNSIGNED NOT NULL DEFAULT 0,
  track_attendance BOOLEAN          NOT NULL DEFAULT TRUE,
  color            VARCHAR(20)      NULL,                     -- palette name, e.g. 'sage'
  position         INT UNSIGNED     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_subjects_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Tasks hold the subject NAME as typed (it is a free-text field in
-- the task form), so there is no foreign key to `subjects` here.
CREATE TABLE IF NOT EXISTS tasks (
  user_id      INT UNSIGNED NOT NULL,
  id           VARCHAR(40)  NOT NULL,
  title        VARCHAR(255) NOT NULL,
  subject      VARCHAR(100) NOT NULL DEFAULT '',
  description  TEXT         NULL,
  deadline     DATE         NULL,
  priority     ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  status       ENUM('not-started', 'in-progress', 'completed') NOT NULL DEFAULT 'not-started',
  repeat_rule  ENUM('none', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'none',
  subtasks     JSON         NULL,                        -- [{ id, text, done }]
  created_at   DATETIME(3)  NULL,
  completed_at DATETIME(3)  NULL,
  position     INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  KEY ix_tasks_deadline (user_id, deadline),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  user_id    INT UNSIGNED NOT NULL,
  id         VARCHAR(40)  NOT NULL,
  title      VARCHAR(255) NOT NULL DEFAULT '',
  body       TEXT         NULL,
  category   VARCHAR(100) NOT NULL DEFAULT '',
  created_at DATETIME(3)  NULL,
  updated_at DATETIME(3)  NULL,
  position   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timetable_classes (
  user_id    INT UNSIGNED NOT NULL,
  id         VARCHAR(40)  NOT NULL,
  subject_id VARCHAR(40)  NOT NULL,
  day        ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  start_time TIME         NULL,
  end_time   TIME         NULL,
  room       VARCHAR(100) NOT NULL DEFAULT '',
  teacher    VARCHAR(100) NOT NULL DEFAULT '',
  last_marked DATE        NULL,                         -- attendance asked about on this day
  position   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_timetable_user    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_subject FOREIGN KEY (user_id, subject_id) REFERENCES subjects (user_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  user_id    INT UNSIGNED NOT NULL,
  id         VARCHAR(40)  NOT NULL,
  subject_id VARCHAR(40)  NOT NULL,
  total      INT UNSIGNED NOT NULL DEFAULT 0,    -- classes held
  attended   INT UNSIGNED NOT NULL DEFAULT 0,
  position   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_attendance_user    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_subject FOREIGN KEY (user_id, subject_id) REFERENCES subjects (user_id, id) ON DELETE CASCADE,
  CONSTRAINT ck_attendance_counts  CHECK (attended <= total)
);

-- One grade per graded subject. O … B pass; E1 / E2 / E3 are the
-- three failure states (0 grade points, credits still count).
CREATE TABLE IF NOT EXISTS grades (
  user_id    INT UNSIGNED NOT NULL,
  id         VARCHAR(40)  NOT NULL,
  subject_id VARCHAR(40)  NOT NULL,
  grade      ENUM('O', 'A+', 'A', 'B+', 'B', 'E1', 'E2', 'E3') NULL,
  position   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_grades_user    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_grades_subject FOREIGN KEY (user_id, subject_id) REFERENCES subjects (user_id, id) ON DELETE CASCADE
);

-- Unlocked badges only; the badge definitions live in the app.
CREATE TABLE IF NOT EXISTS achievements (
  user_id        INT UNSIGNED NOT NULL,
  achievement_id VARCHAR(40)  NOT NULL,          -- e.g. 'first-step', 'consistent'
  unlocked_at    DATETIME(3)  NOT NULL,
  PRIMARY KEY (user_id, achievement_id),
  CONSTRAINT fk_achievements_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  user_id    INT UNSIGNED NOT NULL,
  id         VARCHAR(40)  NOT NULL,
  notif_key  VARCHAR(160) NULL,                  -- stops the same alert being raised twice
  type       VARCHAR(20)  NOT NULL DEFAULT 'info',
  title      VARCHAR(255) NOT NULL DEFAULT '',
  body       TEXT         NULL,
  created_at DATETIME(3)  NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  is_seen    BOOLEAN      NOT NULL DEFAULT FALSE,
  position   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Messages sent from the landing page's "Get in Touch" form.
-- Not tied to an account: anyone can write in.
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(30)  NOT NULL DEFAULT '',
  message    TEXT         NOT NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_contact_created (created_at)
);

-- ---------------------------------------------------------
-- Added later (the API creates these by itself on an existing
-- database: server/migrate.js)
-- ---------------------------------------------------------

-- Completed past semesters and their grades (the current semester's grades
-- are in `grades`). Overall CGPA = all semesters together.
CREATE TABLE IF NOT EXISTS semesters (
  user_id  INT UNSIGNED NOT NULL,
  id       VARCHAR(40)  NOT NULL,
  name     VARCHAR(60)  NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_semesters_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS semester_grades (
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
);

-- Finished focus-timer sessions.
CREATE TABLE IF NOT EXISTS focus_sessions (
  user_id    INT UNSIGNED     NOT NULL,
  id         VARCHAR(40)      NOT NULL,
  subject_id VARCHAR(40)      NULL,
  task_id    VARCHAR(40)      NULL,
  minutes    SMALLINT UNSIGNED NOT NULL,
  ended_at   DATETIME(3)      NOT NULL,
  PRIMARY KEY (user_id, id),
  KEY ix_focus_ended (user_id, ended_at),
  CONSTRAINT fk_focus_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- One-time password-reset links (only a SHA-256 of the token is stored).
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash CHAR(64)     NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  expires_at DATETIME(3)  NOT NULL,
  PRIMARY KEY (token_hash),
  CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
