/* =========================================================
   Sign up & sign in.

   Accounts live in localStorage under "synora-users"; the
   signed-in person is remembered under "synora-session".

   When the MySQL API is reachable (server/), accounts are also
   created and checked there and signing in loads the workspace
   from the database. Without it everything below works from
   localStorage alone, and connect() links the account to the
   database by itself as soon as the API can be reached.

   The password never leaves the browser. deriveKey() turns it
   into a key (PBKDF2-SHA256, 210,000 rounds, salted with the
   username); the browser keeps that key while signed in and sends
   it to the API, which stores only a bcrypt hash of it. Holding
   the key is what lets connect() create or sign in to the
   database account later without asking for the password.
   Signing out of a database account takes the key off the
   browser (sync.js).
   ========================================================= */

import { KEYS, readJSON, writeJSON, session, profile } from "./storage.js";
import { fullName, EMAIL_RE } from "./util.js";
import { demo } from "./demo.js";
import { api } from "./api.js";
import { adoptSession, refresh, uploadAll, withoutSync } from "./sync.js";

/* The password's key: PBKDF2-SHA256 through the browser's own crypto, with
   the username as salt, so one key can't be reused across accounts and a
   leaked key is slow to turn back into a password. */
const KEY_ROUNDS = 210000;

export async function deriveKey(username, password) {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode("synora:v2:" + username.toLowerCase()), iterations: KEY_ROUNDS },
    material, 256,
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const isStrongKey = (k) => typeof k === "string" && k.length === 64;

/* The key earlier versions used (cyrb53: fast and short). Still needed to
   recognise, and upgrade, accounts created before deriveKey(). */
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
export async function ensureDemoAccount() {
  demo.ensureAccount(await deriveKey(demo.username, demo.password));
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
  const owner = api.session();
  if (!owner) return;
  api.clearToken();
  api.logout(owner.token).catch(() => {});
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

  const key = await deriveKey(v.username, v.password);
  if (await api.available()) {
    try {
      const res = await api.signup({
        firstName: v.firstName, lastName: v.lastName, username: v.username, email: v.email, key,
      });
      if (res.status === 409) return { username: "That username is already taken." };
      if (res.ok) api.setToken(res.body.token, v.username);
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
  /* A brand-new database account: its first save is the whole workspace,
     which also links it, so later saves are by change. */
  if (api.token()) await uploadAll();
  return {};
}

/* The browser-only check: compare against synora-users. An account
   still holding the old, weaker key is upgraded on the spot. */
async function localSignIn(username, password) {
  const user = findUser(username);
  if (!user || !user.passHash) return null;
  const key = await deriveKey(user.username, password);
  if (isStrongKey(user.passHash)) {
    if (user.passHash !== key) return null;
  } else {
    if (user.passHash !== hash(password)) return null;
    rememberAccount(user, key);
  }

  session.start(user.username);
  seedDemoIfNeeded();
  return findUser(user.username);
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
  if (username.toLowerCase() === demo.username) await ensureDemoAccount();
  const key = await deriveKey(username, password);
  if (await api.available()) {
    let res = null;
    try {
      /* The old key goes along too, so an account created before the
         stronger key can be upgraded by the server as it signs in. */
      res = await api.login(username, key, hash(password));
    } catch {
      // Unreachable after all: fall through to this browser's copy.
    }
    if (res && res.status === 401) return null;
    if (res && res.ok) {
      const { token, user, data } = res.body;
      rememberAccount(user, key);
      withoutSync(() => session.start(user.username));
      await adoptSession(user.username, token, data);
      seedDemoIfNeeded();
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

/* Linked already: re-read the database (at most every `gap` ms). Not yet:
   try to link. */
export function connect(gap) {
  if (switching) return Promise.resolve();
  if (api.token()) return refresh(gap ? { gap } : {});
  if (!connecting) connecting = linkAccount().catch(() => {}).finally(() => { connecting = null; });
  return connecting;
}

async function linkAccount() {
  const username = session.username();
  if (switching || !username || api.token() || refused.has(username)) return;
  /* A database session left over from another account must not be reused
     for this one (it would save this account's data into that one). */
  const leftover = api.session();
  if (leftover) {
    api.clearToken();
    api.logout(leftover.token).catch(() => {});
  }
  const account = findUser(username);
  if (!account || !account.passHash) return;
  if (!(await api.available())) return;
  if (switching || session.username() !== username || api.token()) return;   // changed while waiting

  const res = await api.login(username, account.passHash);
  if (switching || session.username() !== username) return;
  if (res.ok) {
    await adoptSession(username, res.body.token, res.body.data);
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
  api.setToken(created.body.token, username);
  /* The demo's first copy in the database is the shipped sample data, not
     whatever this one browser's copy had been edited into. */
  if (demo.isCurrent()) demo.seed();
  await uploadAll();
}

/* On load, when the tab comes back into view or the network returns, and
   on a timer: link the account if it isn't yet (every 30 seconds), or pick
   up changes made on other devices (every 2 minutes while visible). */
export function startAutoConnect() {
  connect();
  setInterval(() => {
    if (document.visibilityState === "visible") connect(api.token() ? 120000 : undefined);
  }, 30000);
  window.addEventListener("online", () => connect());
  window.addEventListener("focus", () => connect());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") connect();
  });
}
