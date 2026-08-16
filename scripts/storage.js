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
     synora:<username>:subjects       ← the academic source of truth
     synora:<username>:tasks
     synora:<username>:notes
     synora:<username>:timetable
     synora:<username>:attendance
     synora:<username>:cgpa
     synora:<username>:achievements
     synora:<username>:notifications
     synora:<username>:profile
     synora:<username>:meta

   Subjects are the source of truth
   -------------------------------
   The subject list a student enters during onboarding is stored
   once, under "subjects". Attendance, CGPA and the timetable all
   reference a subject by its id rather than repeating its name,
   so renaming a subject in one place renames it everywhere.

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
    /* The canonical academic subject list:
         [{ id, name, credits, trackAttendance }]

       trackAttendance is chosen per subject when it is added, and it
       decides ONE thing: whether the subject shows up in Attendance.
       Credits and grades are unaffected — a subject you don't take a
       register for still counts towards your CGPA. See the notes on
       subjects.tracked() below.

       Empty for every new account — students add their own during
       onboarding. Only the demo account ships with subjects. */
    subjects: [],

    tasks: [],
    notes: [],
    timetable: [],

    /* [{ id, subjectId, total, attended }] — the subject NAME is not
       copied in here; it is looked up from "subjects" when rendering. */
    attendance: [],

    /* subjects: [{ id, subjectId, grade }].

       grade is one value from the Synora grading system and carries the
       result on its own — O / A+ / A / B+ / B are passes, E1 / E2 / E3
       are the three failure states. There is deliberately no second
       "exam status" field: it used to sit beside the grade saying the
       same thing twice, and the two could disagree. */
    cgpa: { subjects: [] },

    achievements: { unlocked: {} },   // achievementId -> ISO date string
    notifications: [],

    profile: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",

      /* { type: "illustration", id: "avatar-03" }  — one of the twelve
         { type: "initials",     id: "sage" }       — initials on a colour
         null                                       — nothing chosen yet,
                                                      falls back to initials */
      avatar: null,
      program: "",
      semester: "",
      targetAttendance: 75,
      appearance: "light",     // "light" | "dark"
      onboarded: false         // has the person finished Personalize Synora?
    },

    meta: {
      streak: 0,               // consecutive days with a completed task
      lastCompletionDate: null,
      demo: false              // true only for the arsh2309 sample account
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
    var value = readJSON(namespacedKey(collection), defaultFor(collection));

    /* Object-shaped collections (profile, meta, cgpa) gain any keys that
       were added to DEFAULTS after the record was first written, so an
       account created by an older build keeps working. */
    var fallback = defaultFor(collection);
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback) &&
        value && typeof value === "object" && !Array.isArray(value)) {
      Object.keys(fallback).forEach(function (k) {
        if (!(k in value)) value[k] = fallback[k];
      });
    }
    return value;
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
    },

    /* ---- Names ------------------------------------------------
       ONE definition of how a person's initials are formed, used by
       the sidebar, topbar, dashboard, settings and onboarding so the
       answer can never disagree between two screens.

         initials("Manan", "Kochhar")   → "MK"
         initials("Arshpreet", "Kaur")  → "AK"
         initials("Manan")              → "M"
         initials("Aarav Sharma")       → "AS"   (single string form)

       Note it takes the FIRST letter of the first name and the FIRST
       letter of the last name — never the second letter of the first
       name, which is what produced "MA" for "Manan Kochhar" before. */
    initials: function (firstName, lastName) {
      var first = String(firstName == null ? "" : firstName).trim();
      var last = String(lastName == null ? "" : lastName).trim();

      // Called with one combined string ("Manan Kochhar")? Split it.
      if (!last && first.indexOf(" ") !== -1) {
        var parts = first.split(/\s+/);
        first = parts[0];
        last = parts[parts.length - 1];
      }

      var out = (first.charAt(0) || "") + (last.charAt(0) || "");
      return out.toUpperCase() || "S";
    },

    /* "Manan Kochhar" from the two stored halves. */
    fullName: function (firstName, lastName) {
      return [firstName, lastName]
        .map(function (s) { return String(s == null ? "" : s).trim(); })
        .filter(Boolean)
        .join(" ");
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

  /* =======================================================
     Subjects — the academic source of truth.
     Attendance, CGPA and the timetable all go through here
     instead of storing subject names of their own.
     ======================================================= */

  var subjects = {
    /* Every subject, normalised.

       Records written before trackAttendance existed have no such field.
       They are read as tracked, because that is what they were doing at
       the time — an upgrade should never silently empty someone's
       attendance page. Normalising on read means the rest of the app can
       treat the flag as always present instead of testing for undefined
       in a dozen places. */
    all: function () {
      return get("subjects").map(function (s) {
        return {
          id: s.id,
          name: s.name,
          credits: Number(s.credits) || 0,
          trackAttendance: s.trackAttendance !== false
        };
      });
    },

    /* The subjects Attendance is allowed to show. This is the ONLY
       question trackAttendance answers — CGPA, the timetable and the
       subject list itself all use all() and ignore the flag entirely. */
    tracked: function () {
      return subjects.all().filter(function (s) { return s.trackAttendance; });
    },

    byId: function (id) {
      var found = null;
      subjects.all().forEach(function (s) { if (s.id === id) found = s; });
      return found;
    },

    /* Display name for a subject id, with a safe fallback so a deleted
       subject never renders as "undefined". */
    nameOf: function (id) {
      var s = subjects.byId(id);
      return s ? s.name : "";
    },

    add: function (name, credits, trackAttendance) {
      var record = {
        id: util.uid("sub"),
        name: String(name || "").trim(),
        credits: Number(credits) || 0,
        trackAttendance: trackAttendance !== false
      };
      update("subjects", function (list) { list.push(record); return list; });
      return record;
    },

    /* Editing a subject keeps its id, so every attendance row, grade and
       timetable entry that points at it follows the change automatically. */
    save: function (subject) {
      var record = {
        id: subject.id,
        name: String(subject.name || "").trim(),
        credits: Number(subject.credits) || 0,
        trackAttendance: subject.trackAttendance !== false
      };
      update("subjects", function (list) {
        var idx = -1;
        list.forEach(function (s, i) { if (s.id === record.id) idx = i; });
        if (idx >= 0) list[idx] = record; else list.push(record);
        return list;
      });
      return record;
    },

    /* Removing a subject also removes what depends on it, so no module is
       left holding a reference to a subject that no longer exists. */
    remove: function (id) {
      update("subjects", function (list) {
        return list.filter(function (s) { return s.id !== id; });
      });
      update("attendance", function (list) {
        return list.filter(function (a) { return a.subjectId !== id; });
      });
      update("timetable", function (list) {
        return list.filter(function (c) { return c.subjectId !== id; });
      });
      update("cgpa", function (c) {
        c.subjects = (c.subjects || []).filter(function (s) { return s.subjectId !== id; });
        return c;
      });
    },

    /* Replace the whole list (used by onboarding). */
    setAll: function (list) {
      set("subjects", (list || []).map(function (s) {
        return {
          id: s.id || util.uid("sub"),
          name: String(s.name || "").trim(),
          credits: Number(s.credits) || 0,
          trackAttendance: s.trackAttendance !== false
        };
      }));
    }
  };

  /* =======================================================
     Profile — one normalised view of "who is signed in".

     The account record (in synora-users) and the profile record
     (per-user) both hold name fields: the account because sign-up
     writes it, the profile because Settings edits it. Reading them
     through here means no screen has to know which of the two won,
     and accounts created before first/last names existed still get
     a sensible answer.
     ======================================================= */

  /* The avatar used to be a bare id string ("a2"). It is now an object,
     because there are two KINDS of avatar and a string could only name
     one of them:

       { type: "illustration", id: "avatar-03" }
       { type: "initials",     id: "sage" }

     Anything stored by an older build is read as an illustration id. If
     that id is no longer in the set, avatarHTML falls back to initials —
     so an old profile degrades to a sensible avatar rather than a gap. */
  function normaliseAvatar(value) {
    if (!value) return null;
    if (typeof value === "string") {
      return { type: "illustration", id: value };
    }
    if (value.type === "initials" || value.type === "illustration") {
      return { type: value.type, id: String(value.id || "") };
    }
    return null;
  }

  function profile() {
    var p = get("profile");
    var account = currentUser() || {};

    var first = p.firstName || account.firstName || "";
    var last = p.lastName || account.lastName || "";

    // Older accounts stored a single "fullName" — split it once.
    if (!first && !last) {
      var whole = (p.fullName || account.fullName || "").trim();
      if (whole) {
        var parts = whole.split(/\s+/);
        first = parts[0];
        last = parts.length > 1 ? parts[parts.length - 1] : "";
      }
    }

    return {
      firstName: first,
      lastName: last,
      fullName: util.fullName(first, last),
      initials: util.initials(first, last),
      username: p.username || account.username || currentUsername() || "",
      email: p.email || account.email || "",
      avatar: normaliseAvatar(p.avatar),
      program: p.program || "",
      semester: p.semester || "",
      targetAttendance: Number(p.targetAttendance) || 75,
      appearance: p.appearance || "light",
      onboarded: !!p.onboarded
    };
  }

  /* Merge a patch into the stored profile. */
  function saveProfile(patch) {
    return update("profile", function (p) {
      Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
      return p;
    });
  }

  Synora.profile = { get: profile, save: saveProfile };

  Synora.store = {
    get: get,
    set: set,
    update: update,
    key: namespacedKey,
    defaults: DEFAULTS,
    subjects: subjects,
    clearUserData: clearUserData,
    exportUserData: exportUserData
  };

  Synora.util = util;
})();
