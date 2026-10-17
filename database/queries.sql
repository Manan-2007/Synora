-- =========================================================
--   Synora — useful queries to run in MySQL Workbench
--
--   Run the first two lines once (select them, Ctrl/Cmd+Enter),
--   then put the cursor inside any query and press Ctrl+Enter
--   (Cmd+Enter on a Mac) to run just that one.
--   Change the username below to the account you want to see.
-- =========================================================

USE synora;
SET @user = 'arsh2309';   -- the demo account; change it to see another one

-- 1. Every account (passwords are only stored as bcrypt hashes)
SELECT id, username, first_name, last_name, email, created_at
FROM users
ORDER BY id;

-- 2. How much each user has stored
SELECT u.username,
       (SELECT COUNT(*) FROM subjects s          WHERE s.user_id = u.id) AS subjects,
       (SELECT COUNT(*) FROM tasks t             WHERE t.user_id = u.id) AS tasks,
       (SELECT COUNT(*) FROM notes n             WHERE n.user_id = u.id) AS notes,
       (SELECT COUNT(*) FROM timetable_classes c WHERE c.user_id = u.id) AS classes,
       (SELECT COUNT(*) FROM achievements a      WHERE a.user_id = u.id) AS badges
FROM users u;

-- 3. A user's profile (JOIN users + profiles)
SELECT u.username, CONCAT(u.first_name, ' ', u.last_name) AS name,
       p.program, p.semester, p.target_attendance, p.appearance, p.onboarded
FROM users u
JOIN profiles p ON p.user_id = u.id
WHERE u.username = @user;

-- 4. CGPA worked out in SQL: Σ(credits × grade point) / Σ(credits)
--    E1 / E2 / E3 are failures: 0 points, but the credits still count.
SELECT u.username,
       SUM(s.credits) AS total_credits,
       ROUND(SUM(s.credits * CASE g.grade
               WHEN 'O' THEN 10 WHEN 'A+' THEN 9 WHEN 'A' THEN 8
               WHEN 'B+' THEN 7 WHEN 'B' THEN 6 ELSE 0 END)
             / SUM(s.credits), 2) AS cgpa
FROM grades g
JOIN subjects s ON s.user_id = g.user_id AND s.id = g.subject_id
JOIN users u    ON u.id = g.user_id
WHERE g.grade IS NOT NULL
GROUP BY u.username;

-- 5. Attendance percentage per subject, against the user's target
SELECT s.name AS subject, a.attended, a.total,
       ROUND(100 * a.attended / NULLIF(a.total, 0), 1) AS percent,
       p.target_attendance AS target,
       IF(100 * a.attended / NULLIF(a.total, 0) >= p.target_attendance, 'OK', 'Below target') AS status
FROM attendance a
JOIN subjects s ON s.user_id = a.user_id AND s.id = a.subject_id
JOIN users u    ON u.id = a.user_id
JOIN profiles p ON p.user_id = a.user_id
WHERE u.username = @user
ORDER BY percent;

-- 6. Overdue tasks (deadline passed, not completed)
SELECT t.title, t.subject, t.deadline, t.priority, DATEDIFF(CURDATE(), t.deadline) AS days_late
FROM tasks t
JOIN users u ON u.id = t.user_id
WHERE u.username = @user
  AND t.status <> 'completed'
  AND t.deadline < CURDATE()
ORDER BY t.deadline;

-- 7. Tasks per status and priority
SELECT t.status, t.priority, COUNT(*) AS tasks
FROM tasks t
JOIN users u ON u.id = t.user_id
WHERE u.username = @user
GROUP BY t.status, t.priority
ORDER BY t.status, FIELD(t.priority, 'critical', 'high', 'medium', 'low');

-- 8. The weekly timetable, in day and time order
SELECT c.day, TIME_FORMAT(c.start_time, '%H:%i') AS starts, TIME_FORMAT(c.end_time, '%H:%i') AS ends,
       s.name AS subject, c.room, c.teacher
FROM timetable_classes c
JOIN subjects s ON s.user_id = c.user_id AND s.id = c.subject_id
JOIN users u    ON u.id = c.user_id
WHERE u.username = @user
ORDER BY FIELD(c.day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), c.start_time;

-- 9. Unread notifications, newest first
SELECT n.type, n.title, n.body, n.created_at
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE u.username = @user AND n.is_read = FALSE
ORDER BY n.created_at DESC;

-- 10. Who is signed in right now (one row per signed-in browser)
SELECT u.username, s.created_at AS signed_in_at
FROM sessions s
JOIN users u ON u.id = s.user_id;

-- 11. Messages sent through the landing page's contact form, newest first
SELECT id, name, email, phone, message, created_at
FROM contact_messages
ORDER BY created_at DESC;
