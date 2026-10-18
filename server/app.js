/* =========================================================
   Synora API — stores every account and workspace in MySQL.

   The same Express app runs in two places:
     • on Vercel, as a serverless function (api/index.js), talking
       to the cloud MySQL database set in the project's settings
     • on this computer (server/index.js), where Vite forwards the
       app's /api/* requests to it (vite.config.js)

     GET  /api/health   is the API up and the database reachable?
     POST /api/signup   create an account          → { token }
     POST /api/login    check a password key       → { token, user, data }
     POST /api/logout   end this browser's session
     GET  /api/data     every collection for the signed-in user
     POST /api/contact  store a message from the landing page's contact form
     POST /api/password          change the password (signed in)
     POST /api/account/delete    delete the account and everything in it (signed in)
     POST /api/password/forgot   email a one-time reset link (Brevo)
     POST /api/password/reset    set a new password with that link
     PUT  /api/data     save changes: { username, changes: { tasks: { upsert: [...], delete: [ids] }, ... } }
     POST   /api/files?owner=task:<id>&name=…&type=…   attach a file (raw bytes) → { id, name, mime, size }
     GET    /api/files/<id>                             the file's bytes
     DELETE /api/files/<id>                             remove it
     POST   /api/timetable/scan?type=…&subjects=…       read a timetable photo / PDF → { classes: [...] }
     GET  /api/push/key            the VAPID public key (503 until push is set up)
     POST /api/push/subscribe      { subscription, tz } — this browser wants pushes
     POST /api/push/unsubscribe    { endpoint }
     POST /api/push/test           send a test push to this account's devices
     GET  /api/push/tick           the scheduler's call (Authorization: Bearer CRON_SECRET)

   Signed-in requests send "Authorization: Bearer <token>".

   Passwords: the browser never sends the password itself. It sends
   a key derived from it (the same one it keeps for signing in
   without the database, see src/lib/auth.js), and the server
   stores only a bcrypt hash of that key. Because the browser
   already holds the key, it can connect an account to the
   database later on its own, without asking for the password.
   ========================================================= */

import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import { pool, transaction, configured } from "./db.js";
import { ensureSchema } from "./migrate.js";
import { pushReady, subscribe, unsubscribe, sendToUser, tick } from "./push.js";
import { COLLECTIONS, applyChanges, changesFromCollections, loadCollections } from "./collections.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

/* Bring the database schema up to date before the first request that
   touches data (server/migrate.js). The health check stays instant. */
app.use("/api", async (req, res, next) => {
  if (configured && req.path !== "/health") await ensureSchema();
  next();
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* 64 hex characters (PBKDF2-SHA256); short ones are the older, weaker key
   that accounts are upgraded from when they next sign in. */
const KEY_RE = /^[0-9a-f]{1,64}$/;


/* Slows down password guessing: at most 20 sign-in / sign-up attempts per
   IP address every 10 minutes. On Vercel each running instance counts on
   its own, so this is a speed bump, not a wall. */
const attempts = new Map();
function rateLimit(req, res, next) {
  const ip = (req.get("x-forwarded-for") || req.ip || "").split(",")[0].trim();
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 20) return res.status(429).json({ error: "too-many-attempts" });
  recent.push(now);
  if (attempts.size > 10000) attempts.clear();   // never let the map grow without bound
  attempts.set(ip, recent);
  next();
}

/* Sign-ups are limited twice over: per address (above), and for the whole
   site per hour, counted in the database so every serverless instance
   shares the same limit. */
const SIGNUPS_PER_HOUR = 60;

const newToken = () => crypto.randomBytes(32).toString("hex");

/* A token lasts 30 days. Browsers that were wiped without signing out
   leave old tokens behind; each new sign-in clears the expired ones. */
const SESSION_DAYS = 30;

async function startSession(userId) {
  await pool.query("DELETE FROM sessions WHERE created_at < NOW() - INTERVAL ? DAY", [SESSION_DAYS]);
  const token = newToken();
  await pool.query("INSERT INTO sessions (token, user_id) VALUES (?, ?)", [token, userId]);
  return token;
}

/* Wrap async handlers so a thrown error becomes a 500 instead of a crash. */
const handle = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* Looks up the session token and puts the user's id on req.userId. */
const requireAuth = handle(async (req, res, next) => {
  const match = /^Bearer ([0-9a-f]{64})$/.exec(req.get("authorization") || "");
  if (!match) return res.status(401).json({ error: "signed-out" });
  const [rows] = await pool.query(
    `SELECT s.user_id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.created_at >= NOW() - INTERVAL ? DAY`,
    [match[1], SESSION_DAYS],
  );
  if (!rows.length) return res.status(401).json({ error: "signed-out" });
  req.userId = rows[0].user_id;
  req.username = rows[0].username;
  req.token = match[1];
  next();
});

/* The app asks this before using the API at all. Any answer but { ok: true }
   (no database configured yet, or MySQL unreachable) keeps it on browser
   storage. */
app.get("/api/health", handle(async (req, res) => {
  if (!configured) return res.status(503).json({ error: "no-database" });
  const started = Date.now();
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    /* Only the error code (e.g. ER_ACCESS_DENIED_ERROR, ETIMEDOUT): enough to
       tell what is wrong with the setup, never a host name or password. */
    console.error("Health check failed:", err.code || err.name, err.sqlMessage || err.message);
    return res.status(500).json({ error: "database-unreachable", code: err.code || "unknown" });
  }
  /* Where the API ran and how long one database round trip took: used to
     keep the serverless function close to the database (vercel.json). */
  res.json({ ok: true, region: process.env.VERCEL_REGION || "local", dbMs: Date.now() - started });
}));

/* The same rules the signup form checks, enforced again here. (Password
   strength is checked in the browser: the server only ever sees the key.) */
function signupErrors(b) {
  const errors = {};
  if (!b.firstName) errors.firstName = "required";
  if (!b.lastName) errors.lastName = "required";
  if (!b.email || !EMAIL_RE.test(b.email)) errors.email = "invalid";
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(b.username || "")) errors.username = "invalid";
  if (!KEY_RE.test(b.key || "")) errors.key = "invalid";
  return errors;
}

app.post("/api/signup", rateLimit, handle(async (req, res) => {
  const b = req.body || {};
  const errors = signupErrors(b);
  if (Object.keys(errors).length) return res.status(400).json({ error: "invalid", fields: errors });

  const [[recent]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE created_at >= NOW() - INTERVAL 1 HOUR");
  if (recent.n >= SIGNUPS_PER_HOUR) return res.status(429).json({ error: "too-many-signups" });

  const passwordHash = await bcrypt.hash(b.key, 10);
  try {
    const [result] = await pool.query(
      "INSERT INTO users (username, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?)",
      [b.username, String(b.firstName).slice(0, 60), String(b.lastName).slice(0, 60),
        String(b.email).slice(0, 255), passwordHash],
    );
    res.status(201).json({ token: await startSession(result.insertId) });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "username-taken" });
    throw err;
  }
}));

app.post("/api/login", rateLimit, handle(async (req, res) => {
  const { username, key, legacyKey } = req.body || {};
  if (!username || !KEY_RE.test(key || "")) return res.status(400).json({ error: "invalid" });

  const [rows] = await pool.query(
    "SELECT id, username, first_name, last_name, email, password_hash FROM users WHERE username = ?",
    [String(username)],
  );
  /* Two different answers so the app can tell "this browser has an account
     the database has never seen" (upload it) from "wrong password". The
     sign-in form still shows the same vague message for both. */
  if (!rows.length) return res.status(404).json({ error: "no-account" });

  const user = rows[0];
  if (!(await bcrypt.compare(key, user.password_hash))) {
    /* Accounts made before the stronger key: the sign-in form also sends the
       old key, and a match upgrades the stored hash to the new key. */
    const upgrade = KEY_RE.test(legacyKey || "") && (await bcrypt.compare(legacyKey, user.password_hash));
    if (!upgrade) return res.status(401).json({ error: "wrong-password" });
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(key, 10), user.id]);
  }

  const token = await startSession(user.id);
  const data = await loadCollections(pool, user.id);
  res.json({
    token,
    user: {
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
    },
    data,
  });
}));

/* The landing page's "Get in Touch" form. Stored for reading in MySQL
   Workbench (contact_messages); nothing is emailed. */
app.post("/api/contact", rateLimit, handle(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const phone = String(b.phone || "").trim();
  const message = String(b.message || "").trim();
  if (name.length < 2 || name.length > 100 || !EMAIL_RE.test(email) || email.length > 255 ||
      phone.length > 30 || message.length < 10 || message.length > 5000) {
    return res.status(400).json({ error: "invalid" });
  }
  try {
    await pool.query("INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)",
      [name, email, phone, message]);
  } catch (err) {
    /* schema.sql not re-run on this database yet */
    if (err.code === "ER_NO_SUCH_TABLE") return res.status(503).json({ error: "not-set-up" });
    throw err;
  }
  res.status(201).json({ ok: true });
}));

/* ---- Password & account ---- */

/* The stored hash matches `key`, or — for an account still on the older key
   — `legacyKey`. */
async function keyMatches(userId, key, legacyKey) {
  const [[u]] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
  if (!u) return false;
  if (KEY_RE.test(key || "") && (await bcrypt.compare(key, u.password_hash))) return true;
  return KEY_RE.test(legacyKey || "") && (await bcrypt.compare(legacyKey, u.password_hash));
}

app.post("/api/password", requireAuth, rateLimit, handle(async (req, res) => {
  const { currentKey, legacyKey, newKey } = req.body || {};
  if (!KEY_RE.test(newKey || "")) return res.status(400).json({ error: "invalid" });
  if (!(await keyMatches(req.userId, currentKey, legacyKey))) return res.status(401).json({ error: "wrong-password" });
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(newKey, 10), req.userId]);
  /* Every other browser signed in to this account is signed out. */
  await pool.query("DELETE FROM sessions WHERE user_id = ? AND token <> ?", [req.userId, req.token]);
  res.status(204).end();
}));

app.post("/api/account/delete", requireAuth, rateLimit, handle(async (req, res) => {
  const { key, legacyKey } = req.body || {};
  if (!(await keyMatches(req.userId, key, legacyKey))) return res.status(401).json({ error: "wrong-password" });
  /* ON DELETE CASCADE removes everything the account owns. */
  await pool.query("DELETE FROM users WHERE id = ?", [req.userId]);
  res.status(204).end();
}));

/* Password reset by email, through Brevo (set BREVO_API_KEY and MAIL_FROM,
   a sender address verified in Brevo). Only a SHA-256 of each token is
   stored; a link works once, for 30 minutes. The reply never says whether
   an account matched. */
const RESET_MINUTES = 30;
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const emailReady = () => !!(process.env.BREVO_API_KEY && process.env.MAIL_FROM);

async function sendResetEmail(user, link) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: "Synora" },
      to: [{ email: user.email, name: user.first_name + " " + user.last_name }],
      subject: "Reset your Synora password",
      textContent: "Hi " + user.first_name + ",\n\nSomeone (hopefully you) asked to reset the password for the Synora account " +
        user.username + ". Open this link within " + RESET_MINUTES + " minutes to choose a new one:\n\n" + link +
        "\n\nIf it wasn't you, ignore this email: your password stays as it is.\n\n— Synora",
      htmlContent: "<div style=\"font-family:Inter,Arial,sans-serif;font-size:15px;color:#22252B;line-height:1.6;max-width:480px\">" +
        "<p>Hi " + escapeHTML(user.first_name) + ",</p>" +
        "<p>Someone (hopefully you) asked to reset the password for the Synora account <strong>" + escapeHTML(user.username) + "</strong>.</p>" +
        "<p><a href=\"" + link + "\" style=\"display:inline-block;padding:12px 20px;border-radius:10px;background:#53655C;color:#fff;text-decoration:none;font-weight:600\">Choose a new password</a></p>" +
        "<p style=\"color:#5F6A70;font-size:13px\">The link works once, for " + RESET_MINUTES + " minutes. If it wasn't you, ignore this email: your password stays as it is.</p>" +
        "<p style=\"color:#5F6A70;font-size:13px\">— Synora</p></div>",
    }),
  });
  if (!res.ok) throw new Error("Brevo replied " + res.status);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

app.post("/api/password/forgot", rateLimit, handle(async (req, res) => {
  if (!emailReady()) return res.status(503).json({ error: "email-not-set-up" });
  const who = String((req.body || {}).who || "").trim();
  if (!who) return res.status(400).json({ error: "invalid" });
  const [users] = await pool.query(
    "SELECT id, username, first_name, last_name, email FROM users WHERE username = ? OR email = ? LIMIT 3",
    [who, who],
  );
  const base = process.env.APP_URL || "https://" + req.get("host");
  for (const user of users) {
    const token = crypto.randomBytes(32).toString("hex");
    await pool.query("DELETE FROM password_resets WHERE user_id = ? OR expires_at < NOW()", [user.id]);
    await pool.query("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL ? MINUTE)",
      [sha256(token), user.id, RESET_MINUTES]);
    const link = base + "/reset?u=" + encodeURIComponent(user.username) + "&token=" + token;
    try {
      await sendResetEmail(user, link);
    } catch (err) {
      console.error("Reset email failed:", err.message);
    }
  }
  res.json({ ok: true });
}));

app.post("/api/password/reset", rateLimit, handle(async (req, res) => {
  const { token, username, newKey } = req.body || {};
  if (!/^[0-9a-f]{64}$/.test(token || "") || !KEY_RE.test(newKey || "") || !username) {
    return res.status(400).json({ error: "invalid" });
  }
  const [rows] = await pool.query(
    `SELECT r.user_id FROM password_resets r JOIN users u ON u.id = r.user_id
     WHERE r.token_hash = ? AND r.expires_at > NOW() AND u.username = ?`,
    [sha256(token), String(username)],
  );
  if (!rows.length) return res.status(410).json({ error: "link-expired" });
  const userId = rows[0].user_id;
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(newKey, 10), userId]);
  await pool.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);
  await pool.query("DELETE FROM sessions WHERE user_id = ?", [userId]);   // sign out everywhere
  res.status(204).end();
}));

app.post("/api/logout", requireAuth, handle(async (req, res) => {
  await pool.query("DELETE FROM sessions WHERE token = ?", [req.token]);
  res.status(204).end();
}));

app.get("/api/data", requireAuth, handle(async (req, res) => {
  res.json({ data: await loadCollections(pool, req.userId) });
}));

app.put("/api/data", requireAuth, handle(async (req, res) => {
  /* The app says whose data this is. If that is not the token's owner, the
     browser has mixed up its sessions: refuse rather than overwrite another
     account. */
  const claimed = req.body && req.body.username;
  if (typeof claimed === "string" && claimed.toLowerCase() !== String(req.username).toLowerCase()) {
    return res.status(409).json({ error: "wrong-account" });
  }
  const body = req.body || {};
  const incoming = body.changes && typeof body.changes === "object" ? body.changes
    : changesFromCollections(body.collections || {});
  const changes = {};
  for (const name of COLLECTIONS) if (name in incoming) changes[name] = incoming[name] || {};
  await transaction((conn) => applyChanges(conn, req.userId, changes));
  res.status(204).end();
}));

/* ---- Attachments: photos, PDFs and documents on tasks and notes ----
   The bytes live in MySQL (MEDIUMBLOB); the task or note keeps only
   { id, name, mime, size }. Uploads are raw bytes (not base64) to stay
   under Vercel's 4.5 MB request limit. The shared demo account can't
   upload: anyone can sign in to it. */
const FILE_MAX = 3.5 * 1024 * 1024;
const USER_QUOTA = 50 * 1024 * 1024;
const FILE_TYPES = /^(image\/(png|jpeg|gif|webp|heic|heif)|application\/pdf|text\/plain|application\/msword|application\/vnd\.ms-(excel|powerpoint)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation))$/;
const FILE_ID = /^fil-[0-9a-f]{18}$/;
const isDemo = (username) => String(username).toLowerCase() === "arsh2309";

app.post("/api/files", requireAuth, express.raw({ type: () => true, limit: FILE_MAX + 1024 }), handle(async (req, res) => {
  if (isDemo(req.username)) return res.status(403).json({ error: "demo-read-only" });
  const owner = /^(task|note):([\w-]{1,40})$/.exec(String(req.query.owner || ""));
  const mime = String(req.query.type || "").toLowerCase();
  const name = String(req.query.name || "file").replace(/[\\/]/g, "").replace(/\p{Cc}/gu, "").slice(0, 200) || "file";
  const data = req.body;
  if (!owner || !Buffer.isBuffer(data) || !data.length) return res.status(400).json({ error: "invalid" });
  if (!FILE_TYPES.test(mime)) return res.status(415).json({ error: "file-type" });
  if (data.length > FILE_MAX) return res.status(413).json({ error: "too-large" });
  const [[{ used }]] = await pool.query("SELECT COALESCE(SUM(size), 0) AS used FROM attachments WHERE user_id = ?", [req.userId]);
  if (Number(used) + data.length > USER_QUOTA) return res.status(507).json({ error: "quota" });
  const id = "fil-" + crypto.randomBytes(9).toString("hex");
  await pool.query(
    "INSERT INTO attachments (user_id, id, owner_type, owner_id, name, mime, size, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [req.userId, id, owner[1], owner[2], name, mime, data.length, data],
  );
  res.status(201).json({ id, name, mime, size: data.length });
}));

app.get("/api/files/:id", requireAuth, handle(async (req, res) => {
  if (!FILE_ID.test(req.params.id)) return res.status(404).json({ error: "not-found" });
  const [rows] = await pool.query("SELECT name, mime, data FROM attachments WHERE user_id = ? AND id = ?", [req.userId, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "not-found" });
  const f = rows[0];
  res.set({
    "Content-Type": f.mime,
    "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(f.name),
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  res.send(f.data);
}));

app.delete("/api/files/:id", requireAuth, handle(async (req, res) => {
  if (!FILE_ID.test(req.params.id)) return res.status(404).json({ error: "not-found" });
  await pool.query("DELETE FROM attachments WHERE user_id = ? AND id = ?", [req.userId, req.params.id]);
  res.status(204).end();
}));

/* ---- Timetable from a photo or PDF ----
   The image goes to Claude (Anthropic's API) with instructions to list
   every class as JSON; the app then shows the result for checking before
   anything is saved. Needs ANTHROPIC_API_KEY in the server's environment
   (SCAN_MODEL picks the model). Each user gets 15 scans a day, per
   server instance. */
const SCAN_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SCAN_TYPES = /^(image\/(png|jpeg|gif|webp)|application\/pdf)$/;
const scans = new Map();

const SCAN_PROMPT = (subjects) => `This is a student's weekly class timetable (a photo, screenshot or PDF).
List every class in it.

Rules:
- One entry per class. If the same subject runs across consecutive periods (a lab, a double lecture), make ONE entry from the first start to the last end.
- Skip breaks, lunch, free periods and blank cells.
- Times in 24-hour HH:MM. If the timetable shows period numbers, use the period times printed on it.
- "day" is the full English day name (Monday … Sunday).
- "subject": the student already has these subjects: ${subjects.length ? subjects.map((s) => JSON.stringify(s)).join(", ") : "(none yet)"}. If a class clearly is one of them (same subject, abbreviated or written differently), use that exact name. Otherwise use the subject's name as printed, expanded if it's obvious.
- "room" and "teacher" if shown, else "".
- If the picture isn't a timetable, return no classes and say why in "note".

Answer with JSON only, no other text:
{"classes":[{"day":"Monday","start":"09:00","end":"10:00","subject":"DBMS","room":"LT-2","teacher":"Dr. Rao"}],"note":""}`;

function cleanClasses(list) {
  const hhmm = (t) => {
    const m = /^(\d{1,2})[:.](\d{2})/.exec(String(t || ""));
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
    return m[1].padStart(2, "0") + ":" + m[2];
  };
  return (Array.isArray(list) ? list : []).map((c) => {
    const day = SCAN_DAYS.find((d) => d.toLowerCase().startsWith(String(c.day || "").toLowerCase().slice(0, 3)));
    const start = hhmm(c.start), end = hhmm(c.end);
    const subject = String(c.subject || "").trim().slice(0, 100);
    if (!day || !start || !subject) return null;
    return { day, start, end: end && end > start ? end : "", subject,
      room: String(c.room || "").trim().slice(0, 100), teacher: String(c.teacher || "").trim().slice(0, 100) };
  }).filter(Boolean).slice(0, 120);
}

app.post("/api/timetable/scan", requireAuth, express.raw({ type: () => true, limit: FILE_MAX + 1024 }), handle(async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "scan-not-set-up" });
  const mime = String(req.query.type || "").toLowerCase();
  if (!SCAN_TYPES.test(mime)) return res.status(415).json({ error: "file-type" });
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "invalid" });
  const day = new Date().toISOString().slice(0, 10);
  const used = scans.get(req.userId);
  const count = used && used.day === day ? used.count : 0;
  if (count >= 15) return res.status(429).json({ error: "too-many" });
  scans.set(req.userId, { day, count: count + 1 });

  const subjects = String(req.query.subjects || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 40);
  const media = { type: "base64", media_type: mime, data: req.body.toString("base64") };
  const part = mime === "application/pdf" ? { type: "document", source: media } : { type: "image", source: media };
  let answer;
  try {
    const r = await fetch((process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.SCAN_MODEL || "claude-sonnet-5-5",
        max_tokens: 6000,
        messages: [{ role: "user", content: [part, { type: "text", text: SCAN_PROMPT(subjects) }] }],
      }),
      signal: AbortSignal.timeout(55000),
    });
    if (!r.ok) {
      console.error("Scan failed:", r.status, (await r.text()).slice(0, 300));
      return res.status(502).json({ error: "scan-failed" });
    }
    const body = await r.json();
    answer = (body.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  } catch (err) {
    console.error("Scan failed:", err.name, err.message);
    return res.status(502).json({ error: "scan-failed" });
  }
  let parsed = {};
  try { parsed = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1)); } catch { /* unreadable answer */ }
  res.json({ classes: cleanClasses(parsed.classes), note: String(parsed.note || "").slice(0, 300) });
}));

/* ---- Push reminders (server/push.js) ---- */
app.get("/api/push/key", (req, res) => {
  if (!pushReady()) return res.status(503).json({ error: "push-not-set-up" });
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

app.post("/api/push/subscribe", requireAuth, handle(async (req, res) => {
  if (!pushReady()) return res.status(503).json({ error: "push-not-set-up" });
  const { subscription, tz } = req.body || {};
  if (!(await subscribe(req.userId, subscription, tz))) return res.status(400).json({ error: "invalid" });
  res.status(204).end();
}));

app.post("/api/push/unsubscribe", requireAuth, handle(async (req, res) => {
  await unsubscribe(req.userId, (req.body || {}).endpoint);
  res.status(204).end();
}));

app.post("/api/push/test", requireAuth, handle(async (req, res) => {
  if (!pushReady()) return res.status(503).json({ error: "push-not-set-up" });
  const sent = await sendToUser(req.userId, {
    title: "Reminders are on", body: "This one came from the server: it works even with Synora closed.", tag: "test", url: "/settings",
  });
  res.json({ sent });
}));

/* Called by the schedulers only. Vercel cron sends "Authorization: Bearer
   <CRON_SECRET>" by itself; the GitHub Action sends the same header. */
app.get("/api/push/tick", handle(async (req, res) => {
  const secret = process.env.CRON_SECRET || "";
  const given = Buffer.from(String(req.get("authorization") || ""));
  const want = Buffer.from("Bearer " + secret);
  if (!secret || given.length !== want.length || !crypto.timingSafeEqual(given, want)) return res.status(401).json({ error: "unauthorised" });
  res.json(await tick());
}));

/* Four parameters, even though the last is unused: that is how Express
   recognises an error handler. */
app.use((err, req, res, _next) => {
  /* Bad requests (unreadable JSON, too large) say so instead of a 500. */
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.type || "bad-request" });
  }
  /* Log what went wrong but never the data: MySQL errors carry the whole
     SQL statement, values included. */
  console.error("API error:", err.code || err.name, err.sqlMessage || err.message);
  res.status(500).json({ error: "server-error" });
});

export default app;
