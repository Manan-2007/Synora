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
     PUT  /api/data     save some collections: { collections: { tasks: [...], ... } }

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
import { COLLECTIONS, saveCollections, loadCollections } from "./collections.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_RE = /^[0-9a-f]{1,32}$/;


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
    "SELECT user_id FROM sessions WHERE token = ? AND created_at >= NOW() - INTERVAL ? DAY",
    [match[1], SESSION_DAYS],
  );
  if (!rows.length) return res.status(401).json({ error: "signed-out" });
  req.userId = rows[0].user_id;
  req.token = match[1];
  next();
});

/* The app asks this before using the API at all. Any answer but { ok: true }
   (no database configured yet, or MySQL unreachable) keeps it on browser
   storage. */
app.get("/api/health", handle(async (req, res) => {
  if (!configured) return res.status(503).json({ error: "no-database" });
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    /* Only the error code (e.g. ER_ACCESS_DENIED_ERROR, ETIMEDOUT): enough to
       tell what is wrong with the setup, never a host name or password. */
    console.error(err);
    return res.status(500).json({ error: "database-unreachable", code: err.code || "unknown" });
  }
  res.json({ ok: true });
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
  const { username, key } = req.body || {};
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
    return res.status(401).json({ error: "wrong-password" });
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

app.post("/api/logout", requireAuth, handle(async (req, res) => {
  await pool.query("DELETE FROM sessions WHERE token = ?", [req.token]);
  res.status(204).end();
}));

app.get("/api/data", requireAuth, handle(async (req, res) => {
  res.json({ data: await loadCollections(pool, req.userId) });
}));

app.put("/api/data", requireAuth, handle(async (req, res) => {
  const incoming = (req.body && req.body.collections) || {};
  const data = {};
  for (const name of COLLECTIONS) if (name in incoming) data[name] = incoming[name];
  await transaction((conn) => saveCollections(conn, req.userId, data));
  res.status(204).end();
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "server-error" });
});

export default app;
