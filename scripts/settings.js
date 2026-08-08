/* =========================================================
   Synora — Settings
   Profile details, appearance, defaults, and data controls.
   Everything writes through Synora.store, so changes show up
   across the app immediately (a reload refreshes the shell).

   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  function initPage() {
    var root = document.querySelector("[data-settings-page]");
    if (!root) return;

    var profile = store.get("profile");
    var cgpa = store.get("cgpa");
    var theme = document.documentElement.getAttribute("data-theme") || "light";

    root.innerHTML =
      '<div class="stack" style="gap:24px;max-width:720px">' +

        // Profile
        '<div class="card"><div class="card__header"><span class="card__title">Profile</span></div>' +
          '<div class="card__body"><form data-profile-form class="stack" style="gap:16px">' +
            '<div class="form-grid">' +
              field("Full name", "s-name", profile.fullName) +
              field("Program", "s-program", profile.program, "e.g. B.Tech CSE") +
            "</div>" +
            '<div class="form-grid">' +
              field("Semester", "s-sem", profile.semester, "e.g. 3") +
              numField("Target attendance %", "s-target", profile.targetAttendance, 0, 100) +
            "</div>" +
            '<div class="row"><button type="submit" class="btn btn--primary">Save profile</button></div>' +
          "</form></div></div>" +

        // Appearance
        '<div class="card"><div class="card__header"><span class="card__title">Appearance</span></div>' +
          '<div class="card__body"><div class="row row--wrap" style="gap:12px">' +
            themeChoice("light", "Light", theme) +
            themeChoice("dark", "Dark", theme) +
          "</div></div></div>" +

        // Defaults
        '<div class="card"><div class="card__header"><span class="card__title">Defaults</span></div>' +
          '<div class="card__body"><label class="field" style="margin:0;max-width:320px">' +
            '<span class="field__label">Default grade scale</span>' +
            '<select class="select" data-scale>' + Object.keys(Synora.GRADE_SCALES).map(function (k) {
              return '<option value="' + k + '"' + (k === cgpa.scaleId ? " selected" : "") + ">" + Synora.GRADE_SCALES[k].label + "</option>";
            }).join("") + "</select></label></div></div>" +

        // Data
        '<div class="card"><div class="card__header"><span class="card__title">Your data</span></div>' +
          '<div class="card__body stack" style="gap:16px">' +
            '<p class="text-small muted">Everything you add to Synora is stored only in this browser, on this device. Nothing is uploaded.</p>' +
            '<div class="row row--wrap" style="gap:12px">' +
              '<button type="button" class="btn btn--ghost" data-export>Export my data (JSON)</button>' +
              '<button type="button" class="btn btn--ghost" data-sample>Load sample data</button>' +
              '<button type="button" class="btn btn--danger" data-wipe>Delete all my data</button>' +
            "</div>" +
          "</div></div>" +

      "</div>";

    // Profile save
    root.querySelector("[data-profile-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      store.update("profile", function (p) {
        p.fullName = root.querySelector("#s-name").value.trim() || p.fullName;
        p.program = root.querySelector("#s-program").value.trim();
        p.semester = root.querySelector("#s-sem").value.trim();
        var target = parseInt(root.querySelector("#s-target").value, 10);
        p.targetAttendance = isNaN(target) ? p.targetAttendance : util.clamp(target, 0, 100);
        return p;
      });
      Synora.toast.success("Profile saved", "Refreshing your workspace…");
      window.setTimeout(function () { window.location.reload(); }, 700);
    });

    // Theme
    root.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-theme-choice");
        document.documentElement.setAttribute("data-theme", value);
        localStorage.setItem(Synora.keys.theme, value);
        root.querySelectorAll("[data-theme-choice]").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
      });
    });

    // Default grade scale
    root.querySelector("[data-scale]").addEventListener("change", function (e) {
      store.update("cgpa", function (c) { c.scaleId = e.target.value; return c; });
      Synora.toast("Default scale updated");
    });

    // Export
    root.querySelector("[data-export]").addEventListener("click", function () {
      var data = store.exportUserData();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "synora-" + (Synora.session.username() || "data") + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      Synora.toast.success("Exported", "Your data was downloaded as JSON.");
    });

    // Load sample data
    root.querySelector("[data-sample]").addEventListener("click", function () {
      Synora.confirm({ title: "Load sample data?", message: "This replaces your current tasks, notes, timetable, attendance and CGPA with a sample set.", confirmLabel: "Load sample" })
        .then(function (ok) {
          if (!ok) return;
          store.update("meta", function (m) { m.seeded = false; return m; });
          Synora.seedSampleData();
          window.location.href = "dashboard.html";
        });
    });

    // Wipe
    root.querySelector("[data-wipe]").addEventListener("click", function () {
      Synora.confirm({ title: "Delete all your data?", message: "Every task, note, class, attendance and CGPA record for this account will be permanently removed. Your account itself stays.", confirmLabel: "Delete everything", danger: true })
        .then(function (ok) {
          if (!ok) return;
          store.clearUserData();
          store.update("meta", function (m) { m.seeded = true; return m; }); // stay empty
          window.location.href = "dashboard.html";
        });
    });
  }

  function field(label, id, value, placeholder) {
    return '<label class="field" style="margin:0"><span class="field__label">' + label + "</span>" +
      '<input class="input" id="' + id + '" value="' + util.escapeHTML(value || "") + '" placeholder="' + (placeholder || "") + '"></label>';
  }
  function numField(label, id, value, min, max) {
    return '<label class="field" style="margin:0"><span class="field__label">' + label + "</span>" +
      '<input class="input" type="number" id="' + id + '" min="' + min + '" max="' + max + '" value="' + util.escapeHTML(String(value || "")) + '"></label>';
  }
  function themeChoice(value, label, current) {
    var icon = value === "dark" ? "moon" : "sun";
    return '<button type="button" class="btn btn--ghost' + (value === current ? " is-active" : "") + '" data-theme-choice="' + value + '" ' +
      'style="' + (value === current ? "border-color:var(--color-brand);color:var(--color-brand)" : "") + '">' +
      Synora.icon(icon, 16) + label + "</button>";
  }

  document.addEventListener("synora:ready", initPage);
})();
