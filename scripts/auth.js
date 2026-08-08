/* =========================================================
   Synora — Sign up & sign in
   One file serves both pages. It looks at which form id is
   present (#signup-form or #login-form) and runs that flow.

   Accounts live in localStorage under "synora-users"; the
   signed-in person is remembered under "synora-session".
   Both keys and the data helpers come from storage.js.

   A note on security (see also notes.html):
   This is a frontend-only project with no server. Passwords
   are stored hashed (not plaintext) as a courtesy, but this
   is obfuscation, NOT real security — anyone with access to
   the browser can read localStorage. Never reuse a real
   password here.
   ========================================================= */

(function () {
  "use strict";

  var USERS_KEY = Synora.keys.users;       // "synora-users"
  var SESSION_KEY = Synora.keys.session;   // "synora-session"
  var DASHBOARD = "./dashboard.html";

  /* ---- Tiny, dependency-free string hash (cyrb53) --------
     Good enough to avoid storing passwords in the clear.
     Not a substitute for a real, salted, server-side hash.  */
  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  /* =======================================================
     Small helpers shared by both flows.
     ======================================================= */

  function fieldEl(form, name) {
    return form.querySelector('[data-field="' + name + '"]');
  }

  function setError(form, name, message) {
    var field = fieldEl(form, name);
    if (!field) return;
    field.classList.add("is-invalid");
    var msg = field.querySelector(".field__error");
    if (msg) msg.textContent = message;
  }

  function clearError(field) {
    field.classList.remove("is-invalid");
    var msg = field.querySelector(".field__error");
    if (msg) msg.textContent = "";
  }

  function clearAllErrors(form) {
    form.querySelectorAll(".field.is-invalid").forEach(clearError);
    hideAlert(form);
  }

  function showAlert(form, message) {
    var alert = form.querySelector(".form-alert");
    if (!alert) return;
    var text = alert.querySelector("[data-alert-text]");
    if (text) text.textContent = message;
    alert.classList.add("is-shown");
  }

  function hideAlert(form) {
    var alert = form.querySelector(".form-alert");
    if (alert) alert.classList.remove("is-shown");
  }

  function getUsers() {
    return Synora.storage.readJSON(USERS_KEY, []);
  }

  function findUser(username) {
    var users = getUsers();
    var lower = username.toLowerCase();
    for (var i = 0; i < users.length; i++) {
      if (users[i].username.toLowerCase() === lower) return users[i];
    }
    return null;
  }

  function startSession(username) {
    Synora.storage.writeJSON(SESSION_KEY, { username: username });
  }

  /* Reveal the success panel and head to the dashboard. */
  function finish(name) {
    var formView = document.getElementById("form-view");
    var doneView = document.getElementById("done-view");
    if (formView) formView.setAttribute("hidden", "");

    document.querySelectorAll("[data-done-name]").forEach(function (el) {
      el.textContent = name;
    });

    // Point the panel's button at the dashboard now that it exists.
    if (doneView) {
      var btn = doneView.querySelector(".btn");
      if (btn) {
        btn.setAttribute("href", DASHBOARD);
        btn.textContent = "Go to your dashboard";
      }
      var note = doneView.querySelector(".auth-done__note");
      if (note) note.textContent = "Taking you to your workspace…";
      doneView.classList.add("is-shown");
    }

    // Give the panel a beat to render, then redirect.
    window.setTimeout(function () {
      window.location.href = DASHBOARD;
    }, 900);
  }

  /* Wire up the "Show password" checkbox on either page. */
  function wireShowPassword() {
    var toggle = document.getElementById("show-password");
    if (!toggle) return;
    toggle.addEventListener("change", function () {
      var type = toggle.checked ? "text" : "password";
      document.querySelectorAll("[data-password]").forEach(function (input) {
        input.type = type;
      });
    });
  }

  /* If someone's already signed in, show the "Signed in as…" bar. */
  function wireSessionBar() {
    var bar = document.getElementById("session-bar");
    if (!bar) return;
    var username = Synora.session.username();
    if (!username) return;

    var user = Synora.session.user();
    var nameEl = bar.querySelector("[data-session-name]");
    if (nameEl) nameEl.textContent = (user && user.fullName) || username;
    bar.removeAttribute("hidden");

    var signOutBtn = document.getElementById("sign-out");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () {
        Synora.session.signOut();
        window.location.reload();
      });
    }
  }

  /* Clear a field's error as soon as the user edits it. */
  function wireLiveClearing(form) {
    form.querySelectorAll(".field .input").forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field && field.classList.contains("is-invalid")) clearError(field);
        hideAlert(form);
      });
    });
  }

  /* =======================================================
     Sign-up flow.
     ======================================================= */

  function initSignup(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearAllErrors(form);

      var fullName = form.fullName.value.trim();
      var username = form.username.value.trim();
      var password = form.password.value;
      var confirm = form.confirm.value;
      var ok = true;

      if (!fullName) {
        setError(form, "fullName", "Please enter your name.");
        ok = false;
      }

      if (!username) {
        setError(form, "username", "Choose a username.");
        ok = false;
      } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        setError(form, "username", "3–20 characters: letters, numbers and underscores only.");
        ok = false;
      } else if (findUser(username)) {
        setError(form, "username", "That username is already taken.");
        ok = false;
      }

      if (!password) {
        setError(form, "password", "Choose a password.");
        ok = false;
      } else if (password.length < 8) {
        setError(form, "password", "Use at least 8 characters.");
        ok = false;
      } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError(form, "password", "Include at least one letter and one number.");
        ok = false;
      }

      if (confirm !== password) {
        setError(form, "confirm", "Passwords don't match.");
        ok = false;
      }

      if (!ok) return;

      // Create and store the account.
      var users = getUsers();
      users.push({
        fullName: fullName,
        username: username,
        passHash: hash(password),
        createdAt: new Date().toISOString()
      });
      Synora.storage.writeJSON(USERS_KEY, users);

      startSession(username);

      // Seed a small starter profile + optional sample data (app.js).
      Synora.store.update("profile", function (p) {
        p.fullName = fullName;
        return p;
      });
      if (typeof Synora.seedSampleData === "function") {
        Synora.seedSampleData();
      }

      finish(fullName);
    });
  }

  /* =======================================================
     Sign-in flow.
     ======================================================= */

  function initLogin(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearAllErrors(form);

      var username = form.username.value.trim();
      var password = form.password.value;

      if (!username) {
        setError(form, "username", "Enter your username.");
        return;
      }
      if (!password) {
        setError(form, "password", "Enter your password.");
        return;
      }

      var user = findUser(username);
      if (!user || user.passHash !== hash(password)) {
        // Deliberately vague — don't reveal which half was wrong.
        showAlert(form, "That username and password don't match an account.");
        return;
      }

      startSession(user.username);
      finish(user.fullName || user.username);
    });
  }

  /* =======================================================
     Boot: pick the flow based on which form is present.
     ======================================================= */

  var signupForm = document.getElementById("signup-form");
  var loginForm = document.getElementById("login-form");

  wireShowPassword();
  wireSessionBar();

  if (signupForm) {
    wireLiveClearing(signupForm);
    initSignup(signupForm);
  }
  if (loginForm) {
    wireLiveClearing(loginForm);
    initLogin(loginForm);
  }
})();
