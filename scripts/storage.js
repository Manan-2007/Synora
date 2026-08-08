/* =========================================================
   Synora — Storage & data layer
   The single place that talks to localStorage. Every other
   script goes through Synora.store instead of touching
   localStorage directly, so the data shape stays consistent
   and each signed-in user gets their own private workspace.

   Data model
   ----------
   Global keys (shared by the whole browser):
     synora-users     array of accounts   (written by auth.js)
     synora-session   { username }         (the person signed in)
     synora-theme     "light" | "dark"     (owned by theme.js)

   Per-user keys are namespaced so two accounts on the same
   browser never see each other's data:
     synora:<username>:tasks
     synora:<username>:notes
     synora:<username>:timetable
     synora:<username>:attendance
     synora:<username>:cgpa
     synora:<username>:achievements
     synora:<username>:notifications
     synora:<username>:profile
     synora:<username>:meta

   Everything is stored as JSON via JSON.stringify / JSON.parse.
   ========================================================= */

window.Synora = window.Synora || {};

(function () {
  "use strict";

  /* ---- Global (non-namespaced) keys ---- */
  var GLOBAL_KEYS = {
    users: "synora-users",
    session: "synora-session",
    theme: "synora-theme"
  };

  /* ---- Default value for each per-user collection ----
     get() returns a deep-ish copy of these when nothing is
     stored yet, so callers always get the right shape.      */
  var DEFAULTS = {
    tasks: [],
    notes: [],
    timetable: [],
    attendance: [],
    cgpa: { scaleId: "10", subjects: [] },
    achievements: { unlocked: {} },   // achievementId -> ISO date string
    notifications: [],
    profile: {
      fullName: "",
      program: "",
      semester: "",
      targetAttendance: 75
    },
    meta: {
      streak: 0,          // consecutive days with a completed task
      lastCompletionDate: null,
      seeded: false       // whether the one-time sample data was added
    }
  };

  /* =======================================================
     Low-level helpers: safe read / write of raw keys.
     ======================================================= */

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      // Corrupted or non-JSON value — fall back rather than crash.
      console.warn("Synora: could not parse", key, err);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      // Most likely the storage quota is full.
      console.error("Synora: could not save", key, err);
      return false;
    }
  }

  function removeKey(key) {
    localStorage.removeItem(key);
  }

  /* =======================================================
     Session — who is signed in.
     auth.js writes these; the rest of the app reads them.
     ======================================================= */

  function getSession() {
    return readJSON(GLOBAL_KEYS.session, null);
  }

  function currentUsername() {
    var s = getSession();
    return s && s.username ? s.username : null;
  }

  function getUsers() {
    return readJSON(GLOBAL_KEYS.users, []);
  }

  function currentUser() {
    var username = currentUsername();
    if (!username) return null;
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username) return users[i];
    }
    return null;
  }

  function isAuthed() {
    return currentUsername() !== null;
  }

  /* Sign out clears the session pointer only — the account and
     its data stay in the browser for next time. */
  function signOut() {
    removeKey(GLOBAL_KEYS.session);
  }

  /* =======================================================
     Per-user collections.
     ======================================================= */

  function namespacedKey(collection, username) {
    var who = username || currentUsername();
    return "synora:" + who + ":" + collection;
  }

  function defaultFor(collection) {
    // Return a fresh copy so callers can't mutate the shared default.
    return JSON.parse(JSON.stringify(DEFAULTS[collection]));
  }

  function get(collection) {
    if (!(collection in DEFAULTS)) {
      console.warn("Synora: unknown collection", collection);
    }
    if (!currentUsername()) return defaultFor(collection);
    return readJSON(namespacedKey(collection), defaultFor(collection));
  }

  function set(collection, value) {
    if (!currentUsername()) return false;
    return writeJSON(namespacedKey(collection), value);
  }

  /* update(collection, fn): read, transform, write in one step.
     The callback receives the current value and returns the new one. */
  function update(collection, fn) {
    var current = get(collection);
    var next = fn(current);
    if (next === undefined) next = current;
    set(collection, next);
    return next;
  }

  /* Remove every per-user key for the given (or current) account. */
  function clearUserData(username) {
    var who = username || currentUsername();
    if (!who) return;
    Object.keys(DEFAULTS).forEach(function (collection) {
      removeKey(namespacedKey(collection, who));
    });
  }

  /* Export the current user's whole workspace as one object
     (used by Settings → export). */
  function exportUserData() {
    var out = {};
    Object.keys(DEFAULTS).forEach(function (collection) {
      out[collection] = get(collection);
    });
    return out;
  }

  /* =======================================================
     Small shared utilities (no DOM, safe to use anywhere).
     ======================================================= */

  var util = {
    /* Reasonably-unique id without any external library. */
    uid: function (prefix) {
      return (prefix || "id") + "-" +
        Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2, 8);
    },

    /* Local (not UTC) YYYY-MM-DD for a Date — the format our
       <input type="date"> fields and deadline comparisons use. */
    toISODate: function (date) {
      var d = date || new Date();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return d.getFullYear() + "-" + m + "-" + day;
    },

    todayISO: function () {
      return util.toISODate(new Date());
    },

    /* Parse a YYYY-MM-DD string as a LOCAL date at midnight. */
    parseISODate: function (iso) {
      if (!iso) return null;
      var parts = String(iso).split("-");
      if (parts.length !== 3) return null;
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    },

    /* Whole-day difference: target - today. Negative = in the past. */
    daysUntil: function (iso) {
      var target = util.parseISODate(iso);
      if (!target) return null;
      var today = util.parseISODate(util.todayISO());
      var ms = target - today;
      return Math.round(ms / 86400000);
    },

    /* Friendly relative label for a deadline. */
    relativeDay: function (iso) {
      var n = util.daysUntil(iso);
      if (n === null) return "";
      if (n === 0) return "Today";
      if (n === 1) return "Tomorrow";
      if (n === -1) return "Yesterday";
      if (n < 0) return Math.abs(n) + " days ago";
      return "In " + n + " days";
    },

    /* e.g. "9 Aug 2026" */
    formatDate: function (iso) {
      var d = util.parseISODate(iso);
      if (!d) return "";
      return d.toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric"
      });
    },

    /* Escape user text before putting it in innerHTML. */
    escapeHTML: function (str) {
      return String(str == null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    /* Clamp a number into [min, max]. */
    clamp: function (n, min, max) {
      return Math.max(min, Math.min(max, n));
    }
  };

  /* =======================================================
     Public API.
     ======================================================= */

  Synora.keys = GLOBAL_KEYS;

  Synora.storage = {
    readJSON: readJSON,
    writeJSON: writeJSON,
    remove: removeKey
  };

  Synora.session = {
    get: getSession,
    username: currentUsername,
    user: currentUser,
    isAuthed: isAuthed,
    signOut: signOut
  };

  Synora.store = {
    get: get,
    set: set,
    update: update,
    key: namespacedKey,
    defaults: DEFAULTS,
    clearUserData: clearUserData,
    exportUserData: exportUserData
  };

  Synora.util = util;
})();
