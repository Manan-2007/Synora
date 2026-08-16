/* =========================================================
   Synora — Settings

   Four cards: who you are, what you study, how it looks, and
   the account itself. Everything writes through Synora.store,
   so a change here shows up across the app.

   Subjects live here because this is where the rest of the app
   gets them from. Editing one keeps its id, so the attendance
   row, timetable entries and grade attached to that subject all
   follow the change rather than being orphaned by it.

   The old "Your data" card (export / load sample / delete all)
   is gone. Loading sample data into a real account was the same
   mechanism that made new accounts look pre-used, and the demo
   workspace covers that job properly now.

   Depends on: storage.js, avatars.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  function initPage() {
    var root = document.querySelector("[data-settings-page]");
    if (!root) return;

    render();

    function render() {
      var profile = Synora.profile.get();
      var cgpa = store.get("cgpa");
      var theme = document.documentElement.getAttribute("data-theme") || "light";

      root.innerHTML =
        '<div class="stack" style="gap:24px;max-width:760px">' +

          /* ---- Profile ---- */
          '<div class="card"><div class="card__header"><span class="card__title">Profile</span></div>' +
            '<div class="card__body stack" style="gap:24px">' +

              '<div class="settings-identity">' +
                Synora.avatarHTML(64) +
                "<div>" +
                  '<p class="settings-identity__name">' + util.escapeHTML(profile.fullName || profile.username) + "</p>" +
                  '<p class="settings-identity__handle">@' + util.escapeHTML(profile.username) + "</p>" +
                "</div>" +
                '<button type="button" class="btn btn--ghost btn--sm" data-change-avatar ' +
                  'style="margin-left:auto">Change avatar</button>' +
              "</div>" +

              '<form data-profile-form class="stack" style="gap:16px">' +
                '<div class="form-grid">' +
                  field("First name", "s-first", profile.firstName) +
                  field("Last name", "s-last", profile.lastName) +
                "</div>" +
                '<div class="form-grid">' +
                  readOnlyField("Username", profile.username,
                    "Your username identifies your workspace and can't be changed.") +
                  field("Email", "s-email", profile.email, "you@example.com", "email") +
                "</div>" +
                '<div class="form-grid">' +
                  field("Program", "s-program", profile.program, "e.g. B.E CSE AIML") +
                  semesterField(profile.semester) +
                "</div>" +
                '<div class="form-grid">' +
                  numField("Target attendance %", "s-target", profile.targetAttendance, 0, 100) +
                  "<span></span>" +
                "</div>" +
                '<p class="field__error" data-profile-error style="margin:0"></p>' +
                '<div class="row"><button type="submit" class="btn btn--primary">Save profile</button></div>' +
              "</form>" +

            "</div></div>" +

          /* ---- Subjects ---- */
          '<div class="card"><div class="card__header">' +
            '<span class="card__title">Subjects</span>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-add-subject>' +
              Synora.icon("plus", 15) + "Add subject</button>" +
          "</div>" +
            '<div class="card__body" style="padding:0" data-subjects></div>' +
            '<div class="card__body" style="border-top:1px solid var(--color-border)">' +
              '<p class="text-small muted" style="margin:0">' +
                "Attendance, CGPA and your timetable all read from this list. Renaming a subject " +
                "here renames it everywhere; deleting one also removes its attendance, grade and classes." +
              "</p>" +
            "</div>" +
          "</div>" +

          /* ---- Appearance ---- */
          '<div class="card"><div class="card__header"><span class="card__title">Appearance</span></div>' +
            '<div class="card__body"><div class="row row--wrap" style="gap:12px">' +
              themeChoice("light", "Light", theme) +
              themeChoice("dark", "Dark", theme) +
            "</div></div></div>" +

          /* ---- Grading ----
             There is no scale to choose any more. Synora has ONE grading
             system, because E1/E2/E3 are specific to it — offering a 4.0
             US scale alongside them produced combinations that meant
             nothing. This card documents the system instead. */
          '<div class="card"><div class="card__header">' +
            '<span class="card__title">Grading system</span></div>' +
            '<div class="card__body">' +
              '<p class="text-small muted" style="margin:0 0 12px">' +
                "Grades are on a 10-point scale. A grade carries the result on its own — " +
                "there is no separate pass/fail field to disagree with it." +
              "</p>" +
              '<div class="table-wrap"><table class="table"><thead><tr>' +
                "<th>Grade</th><th>Meaning</th><th>Points</th>" +
              "</tr></thead><tbody>" +
                Object.keys(Synora.GRADES).map(function (g) {
                  var info = Synora.GRADES[g];
                  return "<tr><td><strong>" + g + "</strong></td>" +
                    '<td class="muted">' + info.label + "</td>" +
                    "<td>" + (info.pass ? info.point : '<span class="badge badge--high">0</span>') +
                    "</td></tr>";
                }).join("") +
              "</tbody></table></div>" +
              '<p class="text-small muted" style="margin:12px 0 0">' +
                "A failed subject scores 0 points but still contributes its credits, " +
                "which is what pulls the CGPA down." +
              "</p>" +
            "</div></div>" +

          /* ---- Account ---- */
          '<div class="card"><div class="card__header"><span class="card__title">Account</span></div>' +
            '<div class="card__body stack" style="gap:16px">' +
              '<p class="text-small muted" style="margin:0">' +
                "Everything in Synora is stored in this browser, on this device. Nothing is uploaded, " +
                "and signing out leaves your workspace here for next time." +
              "</p>" +
              '<div class="row row--wrap" style="gap:12px">' +
                '<button type="button" class="btn btn--ghost" data-signout-page>Sign out</button>' +
              "</div>" +
            "</div></div>" +

        "</div>";

      renderSubjects();
      wire();
    }

    /* =====================================================
       Subjects
       ===================================================== */

    function renderSubjects() {
      var host = root.querySelector("[data-subjects]");
      var subjects = store.subjects.all();

      if (!subjects.length) {
        host.innerHTML =
          '<div class="empty" style="padding:40px 24px">' +
            '<span class="empty__icon">' + Synora.icon("note", 26) + "</span>" +
            '<p class="empty__title">No subjects yet</p>' +
            '<p class="empty__text">Add the subjects you\'re taking this semester, with their credits.</p>' +
            '<button class="btn btn--primary" data-empty-add>' + Synora.icon("plus", 16) + "Add subject</button>" +
          "</div>";
        host.querySelector("[data-empty-add]").addEventListener("click", function () {
          openSubjectForm(null);
        });
        return;
      }

      host.innerHTML =
        '<div class="table-wrap"><table class="table"><thead><tr>' +
          "<th>Subject</th><th style=\"width:100px\">Credits</th>" +
          '<th style="width:130px">Attendance</th>' +
          '<th style="width:96px"><span class="visually-hidden">Actions</span></th>' +
        "</tr></thead><tbody>" +
        subjects.map(function (s) {
          return '<tr><td><strong>' + util.escapeHTML(s.name) + "</strong></td>" +
            '<td class="muted">' + (s.credits || "—") + "</td>" +
            "<td>" + (s.trackAttendance
              ? '<span class="badge badge--low">Tracked</span>'
              : '<span class="badge">Not tracked</span>') + "</td>" +
            '<td><div class="row" style="gap:2px">' +
              '<button type="button" class="icon-btn" data-edit-subject="' + s.id + '" ' +
                'aria-label="Edit ' + util.escapeHTML(s.name) + '">' + Synora.icon("edit", 15) + "</button>" +
              '<button type="button" class="icon-btn" data-del-subject="' + s.id + '" ' +
                'aria-label="Delete ' + util.escapeHTML(s.name) + '">' + Synora.icon("trash", 15) + "</button>" +
            "</div></td></tr>";
        }).join("") +
        "</tbody></table></div>";
    }

    function openSubjectForm(existing) {
      var isEdit = !!existing;
      var s = existing || { id: null, name: "", credits: "", trackAttendance: true };

      var form = document.createElement("form");
      form.className = "stack";
      form.noValidate = true;
      form.innerHTML =
        '<div class="field" data-field="name" style="margin:0">' +
          '<label class="field__label" for="sf-name">Subject name</label>' +
          '<input class="input" id="sf-name" value="' + util.escapeHTML(s.name) + '" placeholder="e.g. DBMS">' +
          '<p class="field__error"></p></div>' +
        '<div class="field" data-field="credits" style="margin:0">' +
          '<label class="field__label" for="sf-credits">Credits</label>' +
          '<input class="input" type="number" min="0" max="20" id="sf-credits" ' +
            'value="' + util.escapeHTML(String(s.credits)) + '" placeholder="4">' +
          '<p class="field__error"></p></div>' +
        '<label class="check-row" style="align-items:flex-start">' +
          '<input type="checkbox" id="sf-track"' + (s.trackAttendance !== false ? " checked" : "") + ">" +
          "<span><strong>Record attendance for this subject</strong>" +
            '<span class="text-small muted" style="display:block">' +
              "Off means it never appears on the Attendance page or its chart, and " +
              "never raises an attendance warning. It keeps its credits and grade " +
              "for CGPA either way.</span></span>" +
        "</label>" +
        (isEdit ? '<p class="text-small muted" style="margin:0">Renaming keeps this subject\'s ' +
          "attendance, grade and timetable entries attached to it.</p>" : "");

      var modal = Synora.openModal({
        title: isEdit ? "Edit subject" : "Add subject",
        content: form,
        size: "sm",
        footer: [
          { label: "Cancel", variant: "ghost" },
          { label: isEdit ? "Save changes" : "Add subject", variant: "primary",
            close: false, onClick: submit }
        ]
      });

      function fieldError(name, message) {
        var f = form.querySelector('[data-field="' + name + '"]');
        f.classList.add("is-invalid");
        f.querySelector(".field__error").textContent = message;
      }

      function submit() {
        form.querySelectorAll(".field").forEach(function (f) {
          f.classList.remove("is-invalid");
          f.querySelector(".field__error").textContent = "";
        });

        var name = form.querySelector("#sf-name").value.trim();
        var credits = parseFloat(form.querySelector("#sf-credits").value);

        if (!name) { fieldError("name", "Give the subject a name."); return true; }

        var clash = store.subjects.all().some(function (other) {
          return other.id !== s.id && other.name.toLowerCase() === name.toLowerCase();
        });
        if (clash) { fieldError("name", "You already have a subject with that name."); return true; }

        if (isNaN(credits) || credits < 0) {
          fieldError("credits", "Enter the subject's credit value.");
          return true;
        }

        var track = form.querySelector("#sf-track").checked;

        if (isEdit) {
          store.subjects.save({ id: s.id, name: name, credits: credits, trackAttendance: track });
        } else {
          store.subjects.add(name, credits, track);
        }

        modal.close();
        Synora.refresh();
        render();
        Synora.toast.success(isEdit ? "Subject updated" : "Subject added", name);
      }

      form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
    }

    /* =====================================================
       Avatar picker
       ===================================================== */

    function openAvatarPicker() {
      var profile = Synora.profile.get();
      var initials = profile.initials;

      /* One radio group covering BOTH kinds of avatar, exactly as in
         onboarding — that is what makes them mutually exclusive without
         any extra state to keep in step. */
      function valueOf(a) {
        return a ? a.type + ":" + a.id : "";
      }
      var picked = valueOf(profile.avatar);

      var wrap = document.createElement("div");
      wrap.innerHTML =
        '<fieldset style="border:0;padding:0;margin:0">' +
          '<legend class="picker-legend">Illustrations</legend>' +
          '<div class="avatar-grid">' +
            Synora.avatars.list().map(function (a) {
              var v = "illustration:" + a.id;
              var checked = picked === v;
              return '<label class="avatar-option' + (checked ? " is-selected" : "") + '">' +
                '<input type="radio" name="set-avatar" value="' + v + '"' +
                  (checked ? " checked" : "") + ">" +
                '<span class="avatar-option__art">' +
                  Synora.avatars.illustrationHTML(a.id, 56, "") + "</span>" +
                '<span class="avatar-option__check" aria-hidden="true">&#10003;</span>' +
                '<span class="visually-hidden">' + util.escapeHTML(a.label) + "</span>" +
              "</label>";
            }).join("") +
          "</div>" +

          '<div class="picker-or"><span>or</span></div>' +

          '<legend class="picker-legend">Use your initials</legend>' +
          '<div class="avatar-swatches">' +
            Synora.avatars.colors().map(function (c) {
              var v = "initials:" + c.id;
              var checked = picked === v;
              return '<label class="avatar-swatch' + (checked ? " is-selected" : "") + '">' +
                '<input type="radio" name="set-avatar" value="' + v + '"' +
                  (checked ? " checked" : "") + ">" +
                '<span class="avatar-swatch__art">' +
                  Synora.avatars.initialsHTML(c.id, 56, initials) + "</span>" +
                '<span class="avatar-swatch__check" aria-hidden="true">&#10003;</span>' +
                '<span class="visually-hidden">Your initials on ' +
                  util.escapeHTML(c.label) + "</span>" +
              "</label>";
            }).join("") +
          "</div>" +
        "</fieldset>";

      wrap.addEventListener("change", function (e) {
        if (!e.target.matches('input[name="set-avatar"]')) return;
        picked = e.target.value;
        wrap.querySelectorAll(".avatar-option, .avatar-swatch").forEach(function (l) {
          var input = l.querySelector("input");
          l.classList.toggle("is-selected", !!input && input.checked);
        });
      });

      Synora.openModal({
        title: "Choose your avatar",
        content: wrap,
        footer: [
          { label: "Cancel", variant: "ghost" },
          { label: "Save", variant: "primary", onClick: function () {
            var parts = picked.split(":");
            Synora.profile.save({
              avatar: parts[1] ? { type: parts[0], id: parts[1] } : null
            });
            render();
            rebuildShell();
            Synora.toast.success("Avatar updated");
          }}
        ]
      });
    }

    /* The sidebar and topbar were built at page load; a reload is the
       simplest honest way to show the change everywhere at once. */
    function rebuildShell() {
      window.setTimeout(function () { window.location.reload(); }, 600);
    }

    /* =====================================================
       Wiring
       ===================================================== */

    function wire() {
      root.querySelector("[data-change-avatar]").addEventListener("click", openAvatarPicker);

      root.querySelector("[data-add-subject]").addEventListener("click", function () {
        openSubjectForm(null);
      });

      root.querySelector("[data-subjects]").addEventListener("click", function (e) {
        var edit = e.target.closest("[data-edit-subject]");
        if (edit) {
          openSubjectForm(store.subjects.byId(edit.getAttribute("data-edit-subject")));
          return;
        }

        var del = e.target.closest("[data-del-subject]");
        if (!del) return;
        var id = del.getAttribute("data-del-subject");
        var subject = store.subjects.byId(id);
        if (!subject) return;

        Synora.confirm({
          title: "Delete " + subject.name + "?",
          message: "Its attendance record, grade and timetable entries will be removed too. " +
                   "Tasks and notes that mention it are left alone.",
          confirmLabel: "Delete subject",
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          store.subjects.remove(id);
          Synora.refresh();
          render();
          Synora.toast("Deleted " + subject.name);
        });
      });

      /* ---- Profile save ---- */
      root.querySelector("[data-profile-form]").addEventListener("submit", function (e) {
        e.preventDefault();
        var errorEl = root.querySelector("[data-profile-error]");
        errorEl.textContent = "";

        var first = root.querySelector("#s-first").value.trim();
        var last = root.querySelector("#s-last").value.trim();
        var email = root.querySelector("#s-email").value.trim();

        if (!first) { errorEl.textContent = "Your first name can't be empty."; return; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          errorEl.textContent = "That doesn't look like an email address.";
          return;
        }

        var target = parseInt(root.querySelector("#s-target").value, 10);

        Synora.profile.save({
          firstName: first,
          lastName: last,
          email: email,
          program: root.querySelector("#s-program").value.trim(),
          semester: root.querySelector("#s-sem").value,
          targetAttendance: isNaN(target) ? 75 : util.clamp(target, 0, 100)
        });

        Synora.refresh();
        Synora.toast.success("Profile saved", "Refreshing your workspace…");
        rebuildShell();
      });

      /* ---- Theme ---- */
      root.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var value = btn.getAttribute("data-theme-choice");
          document.documentElement.setAttribute("data-theme", value);
          localStorage.setItem(Synora.keys.theme, value);
          Synora.profile.save({ appearance: value });
          root.querySelectorAll("[data-theme-choice]").forEach(function (b) {
            var on = b === btn;
            b.classList.toggle("is-active", on);
            b.style.borderColor = on ? "var(--color-brand)" : "";
            b.style.color = on ? "var(--color-brand)" : "";
          });
        });
      });

      /* ---- Sign out ---- */
      root.querySelector("[data-signout-page]").addEventListener("click", function () {
        Synora.confirm({
          title: "Sign out?",
          message: "Your workspace stays in this browser and will be here when you sign back in.",
          confirmLabel: "Sign out"
        }).then(function (ok) {
          if (!ok) return;
          Synora.session.signOut();
          window.location.href = "./login.html";
        });
      });
    }
  }

  /* =======================================================
     Small field builders.
     ======================================================= */

  function field(label, id, value, placeholder, type) {
    return '<label class="field" style="margin:0"><span class="field__label">' + label + "</span>" +
      '<input class="input" type="' + (type || "text") + '" id="' + id + '" ' +
        'value="' + util.escapeHTML(value || "") + '" placeholder="' + (placeholder || "") + '"></label>';
  }

  function readOnlyField(label, value, hint) {
    return '<div class="field" style="margin:0"><span class="field__label">' + label + "</span>" +
      '<p class="settings-static">' + util.escapeHTML(value || "—") + "</p>" +
      (hint ? '<p class="field__hint">' + hint + "</p>" : "") + "</div>";
  }

  function numField(label, id, value, min, max) {
    return '<label class="field" style="margin:0"><span class="field__label">' + label + "</span>" +
      '<input class="input" type="number" id="' + id + '" min="' + min + '" max="' + max + '" ' +
        'value="' + util.escapeHTML(String(value || "")) + '"></label>';
  }

  function semesterField(current) {
    var options = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
    return '<label class="field" style="margin:0"><span class="field__label">Semester</span>' +
      '<select class="select" id="s-sem"><option value="">Not set</option>' +
      options.map(function (label, i) {
        var value = String(i + 1);
        return '<option value="' + value + '"' + (String(current) === value ? " selected" : "") + ">" +
          label + "</option>";
      }).join("") + "</select></label>";
  }

  function themeChoice(value, label, current) {
    var iconName = value === "dark" ? "moon" : "sun";
    var on = value === current;
    return '<button type="button" class="btn btn--ghost' + (on ? " is-active" : "") + '" ' +
      'data-theme-choice="' + value + '" ' +
      'style="' + (on ? "border-color:var(--color-brand);color:var(--color-brand)" : "") + '">' +
      Synora.icon(iconName, 16) + label + "</button>";
  }

  document.addEventListener("synora:ready", initPage);
})();
