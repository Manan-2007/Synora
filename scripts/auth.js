/* =========================================================
   Synora — Sign up / Sign in

   Shared by app/signup.html and app/login.html. The page
   decides which flow runs by which <form id> is present.

   There is no server. Accounts are kept in the browser's
   own localStorage, under two keys:

     "synora-users"    an array of user objects
     "synora-session"  the account that is currently signed in

   A user object looks like:
     { name, username, passwordHash, createdAt }
   ========================================================= */

(function () {
  "use strict";

  var USERS_KEY = "synora-users";
  var SESSION_KEY = "synora-session";

  /* Once app/index.html (the dashboard) exists, set this to
     "./index.html" and both forms will redirect there instead
     of showing the success panel. */
  var DASHBOARD_URL = null;

  /* Letters, numbers and underscores only, 3 to 20 characters. */
  var USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

  /* ---------------------------------------------------------
     1. Storage helpers
     --------------------------------------------------------- */

  function readUsers() {
    var raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];

    /* If the stored text is not valid JSON, start clean rather
       than letting the whole script crash. */
    try {
      return JSON.parse(raw);
    } catch (err) {
      return [];
    }
  }

  function saveUsers(users) {
    /* localStorage only stores strings, so objects and arrays
       must be converted with JSON.stringify on the way in. */
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findUser(username) {
    var users = readUsers();

    for (var i = 0; i < users.length; i++) {
      /* Usernames are compared case-insensitively, so "Manan"
         and "manan" are treated as the same account. */
      if (users[i].username.toLowerCase() === username.toLowerCase()) {
        return users[i];
      }
    }
    return null;
  }

  function startSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      username: user.username,
      name: user.name,
      since: new Date().toISOString()
    }));
  }

  function readSession() {
    var raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  /* ---------------------------------------------------------
     2. Password handling

     We never store the password itself. It is run through a
     hash first — a one-way function, so the stored value
     cannot be turned back into the original text.

     Honest caveat for the viva: this is a small 32-bit hash
     with no salt. It is enough to show the principle, but a
     real product would hash on a server with bcrypt or
     Argon2. Browser-only storage can never be truly secure,
     because anyone with the device can read localStorage.
     --------------------------------------------------------- */

  function hashPassword(password) {
    var hash = 5381;                       // djb2's starting value

    for (var i = 0; i < password.length; i++) {
      /* Multiply, then mix in the next character's code.
         >>> 0 forces the result back to an unsigned 32-bit
         integer so it never turns negative. */
      hash = ((hash * 33) ^ password.charCodeAt(i)) >>> 0;
    }

    return hash.toString(16);              // store it as hex
  }

  /* ---------------------------------------------------------
     3. Showing and clearing errors

     JavaScript only adds or removes a class. All the visual
     work — red border, hiding the hint, revealing the error
     text — is done by CSS in components.css.
     --------------------------------------------------------- */

  function fieldFor(form, inputName) {
    return form.querySelector('[data-field="' + inputName + '"]');
  }

  function setError(form, inputName, message) {
    var field = fieldFor(form, inputName);
    if (!field) return;

    field.classList.add("is-invalid");
    field.querySelector(".field__error").textContent = message;
  }

  function clearErrors(form) {
    var fields = form.querySelectorAll(".field");

    for (var i = 0; i < fields.length; i++) {
      fields[i].classList.remove("is-invalid");
    }

    form.querySelector(".form-alert").classList.remove("is-shown");
  }

  function showAlert(form, message) {
    var alert = form.querySelector(".form-alert");
    alert.querySelector("[data-alert-text]").textContent = message;

    /* Restart the shake animation. Removing and re-adding the
       class in the same tick does nothing on its own, because
       the browser batches style changes — reading offsetWidth
       forces a reflow in between, which resets the animation. */
    alert.classList.remove("is-shown");
    void alert.offsetWidth;
    alert.classList.add("is-shown");
  }

  /* ---------------------------------------------------------
     4. The success panel
     --------------------------------------------------------- */

  function showDone(user, heading) {
    if (DASHBOARD_URL) {
      window.location.href = DASHBOARD_URL;
      return;
    }

    var formView = document.getElementById("form-view");
    var doneView = document.getElementById("done-view");

    doneView.querySelector("[data-done-heading]").textContent = heading;
    doneView.querySelector("[data-done-name]").textContent = user.name;

    formView.hidden = true;
    doneView.classList.add("is-shown");
  }

  /* ---------------------------------------------------------
     5. Sign up
     --------------------------------------------------------- */

  function handleSignup(event) {
    /* Stop the browser submitting the form and reloading the
       page — there is no server to submit to. */
    event.preventDefault();

    var form = event.target;
    clearErrors(form);

    var name = form.elements.fullName.value.trim();
    var username = form.elements.username.value.trim();
    var password = form.elements.password.value;
    var confirm = form.elements.confirm.value;

    var valid = true;

    if (name.length < 2) {
      setError(form, "fullName", "Please enter your name.");
      valid = false;
    }

    if (!USERNAME_PATTERN.test(username)) {
      setError(form, "username", "3–20 characters: letters, numbers or _ only.");
      valid = false;
    } else if (findUser(username)) {
      setError(form, "username", "That username is already taken.");
      valid = false;
    }

    if (password.length < 8) {
      setError(form, "password", "Use at least 8 characters.");
      valid = false;
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(form, "password", "Include at least one letter and one number.");
      valid = false;
    }

    if (confirm !== password) {
      setError(form, "confirm", "The two passwords don't match.");
      valid = false;
    }

    if (!valid) {
      showAlert(form, "Please fix the highlighted fields and try again.");
      return;
    }

    var user = {
      name: name,
      username: username,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };

    var users = readUsers();
    users.push(user);
    saveUsers(users);
    startSession(user);

    showDone(user, "Account created");
  }

  /* ---------------------------------------------------------
     6. Sign in
     --------------------------------------------------------- */

  function handleLogin(event) {
    event.preventDefault();

    var form = event.target;
    clearErrors(form);

    var username = form.elements.username.value.trim();
    var password = form.elements.password.value;

    if (!username) {
      setError(form, "username", "Enter your username.");
    }
    if (!password) {
      setError(form, "password", "Enter your password.");
    }
    if (!username || !password) {
      showAlert(form, "Please fill in both fields.");
      return;
    }

    var user = findUser(username);

    /* Deliberately the same message for "no such user" and
       "wrong password". Saying which one was wrong would tell
       an attacker that a username exists. */
    if (!user || user.passwordHash !== hashPassword(password)) {
      showAlert(form, "That username and password don't match an account.");
      return;
    }

    startSession(user);
    showDone(user, "Welcome back");
  }

  /* ---------------------------------------------------------
     7. Wiring it up
     --------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", function () {

    /* Only one of these exists on any given page. */
    var signupForm = document.getElementById("signup-form");
    var loginForm = document.getElementById("login-form");

    if (signupForm) signupForm.addEventListener("submit", handleSignup);
    if (loginForm) loginForm.addEventListener("submit", handleLogin);

    /* ---- "Show password" checkbox ---- */
    var showPassword = document.getElementById("show-password");

    if (showPassword) {
      showPassword.addEventListener("change", function () {
        var inputs = document.querySelectorAll("[data-password]");

        for (var i = 0; i < inputs.length; i++) {
          /* Swapping the type attribute is the whole trick —
             CSS cannot do this, because the masking is done by
             the browser, not by a style. */
          inputs[i].type = showPassword.checked ? "text" : "password";
        }
      });
    }

    /* ---- Existing session banner ---- */
    var sessionBar = document.getElementById("session-bar");
    var session = readSession();

    if (sessionBar && session) {
      sessionBar.querySelector("[data-session-name]").textContent =
        session.name || session.username;
      sessionBar.hidden = false;
    }

    var signOut = document.getElementById("sign-out");

    if (signOut) {
      signOut.addEventListener("click", function () {
        localStorage.removeItem(SESSION_KEY);
        window.location.reload();
      });
    }
  });
})();
