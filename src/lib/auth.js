/* =========================================================
   Sign up & sign in.

   Accounts live in localStorage under "synora-users"; the
   signed-in person is remembered under "synora-session".

   When the local MySQL API is running (server/), accounts are
   also created and checked there, with bcrypt-hashed passwords,
   and signing in loads the workspace from the database. Without
   the API (e.g. on the deployed site) everything below works
   from localStorage alone.

   A note on security: the localStorage copy of the password is
   hashed as a courtesy, but that is obfuscation, NOT real
   security — anyone with access to the browser can read it.
   ========================================================= */

import { KEYS, readJSON, writeJSON, session, profile } from "./storage.js";
import { fullName, EMAIL_RE } from "./util.js";
import { demo } from "./demo.js";
import { api } from "./api.js";
import { applyServerData, hasUnsynced, pushAll, withoutSync } from "./sync.js";

/* Tiny, dependency-free string hash (cyrb53). Good enough to avoid
   storing passwords in the clear; not a real, salted, server-side hash. */
export function hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function getUsers() {
  return readJSON(KEYS.users, []);
}

function findUser(username) {
  const lower = username.toLowerCase();
  return getUsers().find((u) => u.username.toLowerCase() === lower) || null;
}

/* Make the demo account exist on this browser, so "Use the demo account"
   works on a machine that has never opened Synora before. */
export function ensureDemoAccount() {
  demo.ensureAccount(hash);
}

/* Returns { field: message } for everything wrong — empty when valid. */
export function validateSignup(v) {
  const errors = {};

  if (!v.firstName) errors.firstName = "Please enter your first name.";
  if (!v.lastName) errors.lastName = "Please enter your last name.";

  if (!v.email) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(v.email)) errors.email = "That doesn't look like an email address.";

  if (!v.username) errors.username = "Choose a username.";
  else if (!/^[a-zA-Z0-9_]{3,20}$/.test(v.username)) errors.username = "3–20 characters: letters, numbers and underscores only.";
  else if (findUser(v.username)) errors.username = "That username is already taken.";

  if (!v.password) errors.password = "Choose a password.";
  else if (v.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (!/[a-zA-Z]/.test(v.password) || !/[0-9]/.test(v.password)) errors.password = "Include at least one letter and one number.";

  if (v.confirm !== v.password) errors.confirm = "Passwords don't match.";

  return errors;
}

/* Any API session belongs to whoever signed in last; drop it before a
   different account takes over, so nothing syncs into the wrong account. */
function forgetApiSession() {
  const token = api.token();
  if (!token) return;
  api.clearToken();
  api.logout(token).catch(() => {});
}

/* A new account starts EMPTY: only the profile is written — no tasks,
   notes, subjects or attendance. Onboarding fills in the rest.
   Returns { field: message } when the database refuses the account
   (the username is taken there), otherwise {}. */
export async function createAccount(v) {
  forgetApiSession();

  if (await api.available()) {
    try {
      const res = await api.signup({
        firstName: v.firstName, lastName: v.lastName, username: v.username,
        email: v.email, password: v.password,
      });
      if (res.status === 409) return { username: "That username is already taken." };
      if (res.ok) api.setToken(res.body.token);
    } catch {
      // The API went away mid-way: the account still works in this browser.
    }
  }

  const users = getUsers();
  users.push({
    firstName: v.firstName,
    lastName: v.lastName,
    fullName: fullName(v.firstName, v.lastName),
    username: v.username,
    email: v.email,
    passHash: hash(v.password),
    createdAt: new Date().toISOString(),
  });
  writeJSON(KEYS.users, users);

  session.start(v.username);

  profile.save({
    firstName: v.firstName,
    lastName: v.lastName,
    username: v.username,
    email: v.email,
    onboarded: false,
  });
  return {};
}

/* The browser-only check: compare against synora-users. */
function localSignIn(username, password) {
  const user = findUser(username);
  if (!user || user.passHash !== hash(password)) return null;

  session.start(user.username);
  seedDemoIfNeeded();
  return user;
}

/* The one place sample data is ever written: tied to the demo account's
   identity, seeded on its first sign-in and re-seeded when the shipped
   fixture changes (SEED_VERSION in demo.js). */
function seedDemoIfNeeded() {
  if (demo.isCurrent() && demo.needsSeed()) demo.seed();
}

/* Keep a browser copy of an account the database knows, so it can still
   sign in here when the API is not running. */
function rememberAccount(user, password) {
  const users = getUsers();
  const record = {
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: fullName(user.firstName, user.lastName),
    username: user.username,
    email: user.email,
    passHash: hash(password),
  };
  const existing = users.find((u) => u.username.toLowerCase() === user.username.toLowerCase());
  if (existing) Object.assign(existing, record);
  else users.push({ ...record, createdAt: new Date().toISOString() });
  writeJSON(KEYS.users, users);
}

/* Returns the account on success, null on a mismatch (deliberately vague —
   the caller never says which half was wrong).

   With the API running, the database decides:
     • known account, right password → load its workspace from MySQL
     • wrong password                 → null
     • account the database has never seen but this browser has
       (created before the database existed, or while the API was
       off) → check it here, then upload the account and its data */
export async function signIn(username, password) {
  forgetApiSession();
  /* The demo is a sample workspace that every visitor gets their own copy
     of, in their own browser. It never touches the database, so one
     visitor's edits can't change what the next one sees. */
  if (username.toLowerCase() === demo.username) return localSignIn(username, password);
  if (!(await api.available())) return localSignIn(username, password);

  let res;
  try {
    res = await api.login(username, password);
  } catch {
    return localSignIn(username, password);
  }

  if (res.ok) {
    const { token, user, data } = res.body;
    rememberAccount(user, password);
    api.setToken(token);
    withoutSync(() => session.start(user.username));
    /* Changes made here while the database was unreachable are newer than
       the database's copy: upload them rather than overwrite them. */
    if (hasUnsynced(user.username)) await pushAll();
    else applyServerData(user.username, data);
    seedDemoIfNeeded();
    return findUser(user.username);
  }

  if (res.status === 401) return null;

  const user = localSignIn(username, password);
  if (user && res.status === 404) {
    try {
      const up = await api.signup({
        firstName: user.firstName || profile.get().firstName,
        lastName: user.lastName || profile.get().lastName,
        username: user.username,
        email: user.email || profile.get().email,
        password,
      });
      if (up.ok) {
        api.setToken(up.body.token);
        await pushAll();
      }
    } catch {
      // Upload failed: the account keeps working in this browser.
    }
  }
  return user;
}
