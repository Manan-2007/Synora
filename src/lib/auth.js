/* =========================================================
   Sign up & sign in.

   Accounts live in localStorage under "synora-users"; the
   signed-in person is remembered under "synora-session".

   A note on security: this is a frontend-only project with
   no server. Passwords are stored hashed as a courtesy, but
   that is obfuscation, NOT real security — anyone with access
   to the browser can read localStorage.
   ========================================================= */

import { KEYS, readJSON, writeJSON, session, profile } from "./storage.js";
import { fullName, EMAIL_RE } from "./util.js";
import { demo } from "./demo.js";

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

/* A new account starts EMPTY: only the profile is written — no tasks,
   notes, subjects or attendance. Onboarding fills in the rest. */
export function createAccount(v) {
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
}

/* Returns the account on success, null on a mismatch (deliberately vague —
   the caller never says which half was wrong). */
export function signIn(username, password) {
  const user = findUser(username);
  if (!user || user.passHash !== hash(password)) return null;

  session.start(user.username);

  /* The one place sample data is ever written: tied to the demo account's
     identity, seeded on its first sign-in and re-seeded when the shipped
     fixture changes (SEED_VERSION in demo.js). */
  if (demo.isCurrent() && demo.needsSeed()) demo.seed();

  return user;
}
