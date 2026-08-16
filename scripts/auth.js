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
  var ONBOARDING = "./onboarding.html";

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

  /* Reveal the confirmation panel — and STOP there.

     This screen used to show itself for 900ms and then redirect on a
     timer. That is not a confirmation, it is a flash of text on the way
     to somewhere the app had already decided to go. Now it presents the
     two things a person might actually want next and waits for one of
     them to be clicked. Nothing here moves on by itself.

     Both destinations are real <a href> links in the markup, so they
     work as ordinary navigation — the buttons cannot go dead because
     no JavaScript is required to make them travel. */
  function finish(name) {
    var formView = document.getElementById("form-view");
    var doneView = document.getElementById("done-view");
    if (formView) formView.setAttribute("hidden", "");

    document.querySelectorAll("[data-done-name]").forEach(function (el) {
      el.textContent = name;
    });

    if (!doneView) return;

    /* Someone who has already set their workspace up doesn't need
       "Personalize my workspace" offered as the headline action — but
       it stays available, because Settings is not the only way back to
       it and a returning student may well want to change things. */
    var onboarded = Synora.profile.get().onboarded;
    var personalize = doneView.querySelector("[data-go-onboarding]");
    if (personalize && onboarded) {
      personalize.textContent = "Change my setup";
    }

    doneView.classList.add("is-shown");

    // Land keyboard focus on the choice, not back at the top of the page.
    var first = doneView.querySelector(".btn");
    if (first) first.focus();
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

  /* There is deliberately no "Signed in as … / Sign out" bar on these
     pages any more.

     The sign-in page is for signing in. Telling a visitor who is already
     signed in that they are, and offering to sign them out, is answering
     a question nobody standing on that page asked — and it leaked the
     current user's real name onto a screen that anyone can open.

     None of the session MACHINERY was removed: the session is still
     written on sign-in, still read by every app page, still what the
     sidebar, Settings and the profile menu display, and signing out
     still lives in the profile menu inside the app, which is where a
     signed-in person would look for it. */

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

  /* Deliberately permissive: something@something.something. Anything
     stricter starts rejecting addresses that are perfectly valid. */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function initSignup(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearAllErrors(form);

      var firstName = form.firstName.value.trim();
      var lastName = form.lastName.value.trim();
      var username = form.username.value.trim();
      var email = form.email.value.trim();
      var password = form.password.value;
      var confirm = form.confirm.value;
      var ok = true;

      if (!firstName) {
        setError(form, "firstName", "Please enter your first name.");
        ok = false;
      }

      if (!lastName) {
        setError(form, "lastName", "Please enter your last name.");
        ok = false;
      }

      if (!email) {
        setError(form, "email", "Please enter your email.");
        ok = false;
      } else if (!EMAIL_RE.test(email)) {
        setError(form, "email", "That doesn't look like an email address.");
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
        firstName: firstName,
        lastName: lastName,
        fullName: Synora.util.fullName(firstName, lastName),
        username: username,
        email: email,
        passHash: hash(password),
        createdAt: new Date().toISOString()
      });
      Synora.storage.writeJSON(USERS_KEY, users);

      startSession(username);

      /* A new account starts EMPTY. Only the profile is written here —
         no tasks, no notes, no subjects, no attendance. The dashboard
         should read 0 across the board until this person adds something
         themselves. The rest is filled in by onboarding. */
      Synora.profile.save({
        firstName: firstName,
        lastName: lastName,
        username: username,
        email: email,
        onboarded: false
      });

      finish(firstName);
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

      /* The one place sample data is ever written. It is tied to the
         demo account's identity, not to "somebody signed in" — which
         is what used to give every new account a fake four-task
         history. Seeded on first sign-in, and re-seeded when the shipped
         demo fixture changes (see SEED_VERSION in demo-data.js), so a
         browser that opened the demo before still picks up new data. */
      if (Synora.demo && Synora.demo.isCurrent() && Synora.demo.needsSeed()) {
        Synora.demo.seed();
      }

      var profile = Synora.profile.get();
      finish(profile.firstName || user.username);
    });
  }

  /* =======================================================
     Boot: pick the flow based on which form is present.
     ======================================================= */

  /* Make the demo account exist on this browser, so "Use the demo
     account" works on a machine that has never opened Synora before.
     auth.js owns the hashing, so it hands the hash function over. */
  function wireDemo() {
    if (!Synora.demo) return;
    Synora.demo.ensureAccount(hash);

    var fillBtn = document.getElementById("use-demo");
    var loginForm = document.getElementById("login-form");
    if (!fillBtn || !loginForm) return;

    fillBtn.addEventListener("click", function () {
      clearAllErrors(loginForm);
      loginForm.username.value = Synora.demo.username;
      loginForm.password.value = Synora.demo.password;
      loginForm.querySelector('button[type="submit"]').focus();
    });
  }

  var signupForm = document.getElementById("signup-form");
  var loginForm = document.getElementById("login-form");

  wireShowPassword();
  wireDemo();

  if (signupForm) {
    wireLiveClearing(signupForm);
    initSignup(signupForm);
  }
  if (loginForm) {
    wireLiveClearing(loginForm);
    initLogin(loginForm);
  }
})();
