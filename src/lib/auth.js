/* =========================================================
   Sign up & sign in.

   Accounts live in localStorage under "synora-users"; the
   signed-in person is remembered under "synora-session".

   When the MySQL API is reachable (server/), accounts are also
   created and checked there and signing in loads the workspace
   from the database. Without it everything below works from
   localStorage alone, and connect() links the account to the
   database by itself as soon as the API can be reached.

   The password never leaves the browser. hash() turns it into a
   key; the browser keeps that key to sign in on its own, and
   sends it to the API, which stores only a bcrypt hash of it.
   Holding the key is what lets connect() create or sign in to
   the database account later without asking for the password.
   ========================================================= */

import { KEYS, readJSON, writeJSON, session, profile } from "./storage.js";
import { fullName, EMAIL_RE } from "./util.js";
import { demo } from "./demo.js";
import { api } from "./api.js";
import { applyServerData, hasUnsynced, pushAll, withoutSync } from "./sync.js";

/* Tiny, dependency-free string hash (cyrb53): the password's "key".
   Not a strong hash on its own — the server bcrypt-hashes it again. */
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
  switching += 1;
  let refusedFields;
  try {
    refusedFields = await createAccountAs(v);
  } finally {
    switching -= 1;
  }
  connect();
  return refusedFields;
}

async function createAccountAs(v) {
  forgetApiSession();

  const key = hash(v.password);
  if (await api.available()) {
    try {
      const res = await api.signup({
        firstName: v.firstName, lastName: v.lastName, username: v.username, email: v.email, key,
      });
      if (res.status === 409) return { username: "That username is already taken." };
      if (res.ok) api.setToken(res.body.token);
    } catch {
      // The API went away mid-way: connect() links the account later.
    }
  }

  const users = getUsers();
  users.push({
    firstName: v.firstName,
    lastName: v.lastName,
    fullName: fullName(v.firstName, v.lastName),
    username: v.username,
    email: v.email,
    passHash: key,
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
   sign in here when the API is not reachable. */
function rememberAccount(user, key) {
  const users = getUsers();
  const record = {
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: fullName(user.firstName, user.lastName),
    username: user.username,
    email: user.email,
    passHash: key,
  };
  const existing = users.find((u) => u.username.toLowerCase() === user.username.toLowerCase());
  if (existing) Object.assign(existing, record);
  else users.push({ ...record, createdAt: new Date().toISOString() });
  writeJSON(KEYS.users, users);
}

/* A signed-in session from the database: keep its token and bring this
   browser's copy and the database's into step. Changes made here while
   the database was unreachable are newer than its copy, so they are
   uploaded; otherwise the database's copy is loaded. */
async function adoptServerSession(username, token, data) {
  api.setToken(token);
  if (hasUnsynced(username)) await pushAll();
  else applyServerData(username, data);
}

/* Returns the account on success, null on a mismatch (deliberately vague —
   the caller never says which half was wrong).

   When the database is reachable it decides: the right key loads the
   workspace from MySQL, a wrong one is refused. An account it has never
   seen is checked in this browser and then linked by connect(). */
export async function signIn(username, password) {
  switching += 1;
  let user;
  try {
    user = await signInAs(username, password);
  } finally {
    switching -= 1;
  }
  connect();   // links the account if this sign-in could not reach the database
  return user;
}

async function signInAs(username, password) {
  forgetApiSession();
  const key = hash(password);
  if (await api.available()) {
    let res = null;
    try {
      res = await api.login(username, key);
    } catch {
      // Unreachable after all: fall through to this browser's copy.
    }
    if (res && res.status === 401) return null;
    if (res && res.ok) {
      const { token, user, data } = res.body;
      rememberAccount(user, key);
      withoutSync(() => session.start(user.username));
      await adoptServerSession(user.username, token, data);
      return findUser(user.username);
    }
  }

  return localSignIn(username, password);
}

/* ---- Linking the signed-in account to the database ----

   Runs whenever someone is signed in here without a database session:
   the account was created or signed in while the API was unreachable,
   or its session expired. It signs in with the key this browser keeps
   (or creates the database account if there is none) and syncs, with no
   need to sign out and back in. Accounts the database refuses (taken
   username, different password) are left alone until the next page load. */

const refused = new Set();
let connecting = null;

/* While a sign-in or sign-up is switching accounts, the background link
   must stay out of the way: it could otherwise reconnect the account being
   left and hand its database session to the one taking over. */
let switching = 0;

export function connect() {
  if (!connecting) connecting = linkAccount().catch(() => {}).finally(() => { connecting = null; });
  return connecting;
}

async function linkAccount() {
  const username = session.username();
  if (switching || !username || api.token() || refused.has(username)) return;
  const account = findUser(username);
  if (!account || !account.passHash) return;
  if (!(await api.available())) return;
  if (switching || session.username() !== username || api.token()) return;   // changed while waiting

  const res = await api.login(username, account.passHash);
  if (switching || session.username() !== username) return;
  if (res.ok) {
    await adoptServerSession(username, res.body.token, res.body.data);
    return;
  }
  if (res.status === 401) { refused.add(username); return; }
  if (res.status !== 404) return;                                // try again later

  const p = profile.get();
  const created = await api.signup({
    firstName: account.firstName || p.firstName,
    lastName: account.lastName || p.lastName,
    username: account.username,
    email: account.email || p.email,
    key: account.passHash,
  });
  if (switching || session.username() !== username) return;
  if (created.status === 409 || created.status === 400) { refused.add(username); return; }
  if (!created.ok) return;
  api.setToken(created.body.token);
  /* The demo's first copy in the database is the shipped sample data, not
     whatever this one browser's copy had been edited into. */
  if (demo.isCurrent()) demo.seed();
  await pushAll();
}

/* Try on load, every 30 seconds, and whenever the tab comes back into
   view or the network returns. Each try is a no-op once connected. */
export function startAutoConnect() {
  connect();
  setInterval(connect, 30000);
  window.addEventListener("online", connect);
  window.addEventListener("focus", connect);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") connect();
  });
}
