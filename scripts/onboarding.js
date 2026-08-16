/* =========================================================
   Synora — Personalize Synora (onboarding)

   Sits between "account created" and the dashboard, and is
   entirely optional — the confirmation screen offers it, it is
   never forced. A brand-new workspace is empty by design, and
   an empty dashboard is not a good first impression, so instead
   of dropping someone into nothing we ask six short questions
   and hand them a dashboard that already knows who they are and
   what they study.

     Avatar → Academic → Subjects → Attendance goal
            → Appearance → Finish

   One question per step on purpose. The same six fields in one
   long form reads as paperwork; split up, it reads as setup.

   What it writes
   --------------
     profile.avatar, program, semester, targetAttendance,
     appearance, onboarded = true
     subjects  → the canonical academic list every other module
                 (attendance, CGPA, timetable) reads from, each
                 carrying its own trackAttendance choice

   Nothing else is touched: tasks, notes, attendance counts and
   grades all stay empty until the person adds their own.

   State
   -----
   The answers live in `draft`, an explicit object — not in
   whichever inputs happen to still be in the DOM. The rendered
   step is a VIEW of that object, so moving back and forth, or
   reloading the page halfway through, cannot lose an answer.
   The draft is mirrored into localStorage on every change and
   cleared once setup finishes.

   Depends on: storage.js, avatars.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  var DASHBOARD = "./dashboard.html";

  /* ---- Guard: you must be signed in to set up a workspace ---- */
  if (!Synora.session.isAuthed()) {
    window.location.href = "./login.html";
    return;
  }

  var profile = Synora.profile.get();

  /* Per-user, so two accounts on one browser can each have an
     unfinished setup without overwriting the other's. */
  var DRAFT_KEY = "synora:" + Synora.session.username() + ":onboarding";

  /* =======================================================
     Working state.
     ======================================================= */

  function freshDraft() {
    return {
      step: 0,
      avatar: profile.avatar || null,
      program: profile.program || "",
      semester: profile.semester || "",
      subjects: store.get("subjects").map(function (s) {
        return {
          id: s.id,
          name: s.name,
          credits: s.credits,
          trackAttendance: s.trackAttendance !== false
        };
      }),
      targetAttendance: profile.targetAttendance || 75,
      appearance: document.documentElement.getAttribute("data-theme") || "light"
    };
  }

  /* A reload mid-setup should not cost the person their answers. The
     saved draft is merged over a fresh one so a field added to Synora
     after the draft was written still has a sensible default. */
  function loadDraft() {
    var base = freshDraft();
    var saved = Synora.storage.readJSON(DRAFT_KEY, null);
    if (!saved || typeof saved !== "object") return base;
    Object.keys(base).forEach(function (k) {
      if (saved[k] !== undefined && saved[k] !== null) base[k] = saved[k];
    });
    if (!Array.isArray(base.subjects)) base.subjects = [];
    return base;
  }

  function saveDraft() {
    draft.step = index;
    Synora.storage.writeJSON(DRAFT_KEY, draft);
  }

  function clearDraft() {
    Synora.storage.remove(DRAFT_KEY);
  }

  var draft = loadDraft();

  var PROGRAMS = [
    "B.E CSE AIML", "B.E CSE", "B.E CSE (Data Science)", "B.E ECE",
    "B.E Mechanical", "B.E Civil", "B.Tech IT", "B.Sc Computer Science",
    "BCA", "MCA", "B.Com", "BBA"
  ];

  var SEMESTERS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

  /* =======================================================
     Steps.
     required(): return an error string to block Continue,
     or null when the step is satisfied.
     ======================================================= */

  var steps = [
    { id: "avatar",     label: "Profile",    skippable: true,  render: renderAvatar,     required: null },
    { id: "academic",   label: "Academic",   skippable: false, render: renderAcademic,   required: checkAcademic },
    { id: "subjects",   label: "Subjects",   skippable: false, render: renderSubjects,   required: checkSubjects },
    { id: "attendance", label: "Attendance", skippable: false, render: renderAttendance, required: null },
    { id: "appearance", label: "Appearance", skippable: false, render: renderAppearance, required: null },
    { id: "finish",     label: "Finish",     skippable: false, render: renderFinish,     required: null }
  ];

  var index = util.clamp(Number(draft.step) || 0, 0, steps.length - 1);

  var panel = document.querySelector("[data-ob-panel]");
  var stepsEl = document.querySelector("[data-ob-steps]");
  var backBtn = document.querySelector("[data-ob-back]");
  var nextBtn = document.querySelector("[data-ob-next]");
  var skipBtn = document.querySelector("[data-ob-skip]");
  var doneEl = document.querySelector("[data-ob-done]");

  /* The name typed at sign-up drives the initials preview. */
  function currentInitials() {
    return util.initials(profile.firstName, profile.lastName);
  }

  /* =======================================================
     Shell rendering.
     ======================================================= */

  function renderSteps() {
    stepsEl.innerHTML = steps.map(function (s, i) {
      var state = i < index ? " is-done" : i === index ? " is-current" : "";
      return '<li class="ob-step' + state + '"' +
             (i === index ? ' aria-current="step"' : "") + ">" +
               '<span class="ob-step__dot">' + (i < index ? "&#10003;" : (i + 1)) + "</span>" +
               '<span class="ob-step__label">' + s.label + "</span>" +
             "</li>";
    }).join("");
  }

  function render() {
    var step = steps[index];
    renderSteps();
    panel.innerHTML = step.render();

    backBtn.disabled = index === 0;
    skipBtn.hidden = !step.skippable;
    nextBtn.textContent = index === steps.length - 1 ? "Finish setup" : "Continue";

    wireStep(step);
    saveDraft();

    // Move focus to the step heading so keyboard users land in the right place.
    var heading = panel.querySelector(".ob-card__title");
    if (heading) heading.focus();
  }

  function stepHead(title, sub) {
    return '<h2 class="ob-card__title" tabindex="-1">' + title + "</h2>" +
           (sub ? '<p class="ob-card__sub">' + sub + "</p>" : "");
  }

  function showError(message) {
    var existing = panel.querySelector(".ob-error");
    if (existing) existing.remove();
    if (!message) return;
    var p = document.createElement("p");
    p.className = "ob-error";
    p.setAttribute("role", "alert");
    p.textContent = message;
    panel.appendChild(p);
  }

  /* =======================================================
     Step 1 — Avatar

     Two ways to have a face, presented as ONE radio group:
     twelve illustrations, or your initials on one of six
     colours. A single group is what makes them mutually
     exclusive for free — the browser will not let two radios
     with the same name both be checked, so "exactly one avatar
     mode" is enforced by the markup rather than by a flag
     somebody has to remember to clear.

     Real radio inputs, not clickable <div>s: arrow-key
     navigation, a proper checked state and a label association
     all come with them.
     ======================================================= */

  function renderAvatar() {
    var initials = currentInitials();

    var illustrations = Synora.avatars.list().map(function (a) {
      var checked = isAvatar("illustration", a.id);
      return '<label class="avatar-option' + (checked ? " is-selected" : "") + '">' +
               '<input type="radio" name="avatar-choice" value="illustration:' + a.id + '"' +
                 (checked ? " checked" : "") + ">" +
               '<span class="avatar-option__art">' +
                 Synora.avatars.illustrationHTML(a.id, 72, "") + "</span>" +
               '<span class="avatar-option__check" aria-hidden="true">&#10003;</span>' +
               '<span class="visually-hidden">' + util.escapeHTML(a.label) + "</span>" +
             "</label>";
    }).join("");

    var colors = Synora.avatars.colors().map(function (c) {
      var checked = isAvatar("initials", c.id);
      return '<label class="avatar-swatch' + (checked ? " is-selected" : "") + '">' +
               '<input type="radio" name="avatar-choice" value="initials:' + c.id + '"' +
                 (checked ? " checked" : "") + ">" +
               '<span class="avatar-swatch__art">' +
                 Synora.avatars.initialsHTML(c.id, 56, initials) + "</span>" +
               '<span class="avatar-swatch__check" aria-hidden="true">&#10003;</span>' +
               '<span class="visually-hidden">Your initials on ' +
                 util.escapeHTML(c.label) + "</span>" +
             "</label>";
    }).join("");

    return stepHead("Choose your avatar",
             "It shows up in your sidebar and on your dashboard. " +
             "Pick an illustration, or use your initials.") +

           '<fieldset class="ob-fieldset">' +
             '<legend class="picker-legend">Illustrations</legend>' +
             '<div class="avatar-grid">' + illustrations + "</div>" +

             '<div class="picker-or"><span>or</span></div>' +

             '<legend class="picker-legend">Use your initials</legend>' +
             '<p class="picker-legend__note">Taken from your first and last name — ' +
               "change your name in Settings and this follows it.</p>" +
             '<div class="avatar-swatches">' + colors + "</div>" +
           "</fieldset>" +

           '<div class="ob-preview" data-avatar-preview>' + avatarPreview() + "</div>";
  }

  function isAvatar(type, id) {
    return !!draft.avatar && draft.avatar.type === type && draft.avatar.id === id;
  }

  function avatarPreview() {
    return '<span class="ob-preview__label">Selected</span>' +
           '<span class="ob-preview__art">' +
             Synora.avatars.html(draft.avatar, 72, currentInitials()) + "</span>" +
           '<span class="ob-preview__name">' +
             util.escapeHTML(profile.fullName || profile.username) + "</span>";
  }

  /* =======================================================
     Step 2 — Academic
     ======================================================= */

  function renderAcademic() {
    return stepHead("Your course",
             "This is what your dashboard greets you with, and it keeps " +
             "your grades in the right context.") +
           '<div class="ob-fields">' +
             '<div class="field">' +
               '<label class="field__label" for="ob-program">What program are you in?</label>' +
               '<input class="input" id="ob-program" list="ob-programs" ' +
                 'placeholder="e.g. B.E CSE AIML" autocomplete="off" ' +
                 'value="' + util.escapeHTML(draft.program) + '">' +
               '<datalist id="ob-programs">' +
                 PROGRAMS.map(function (p) { return '<option value="' + p + '"></option>'; }).join("") +
               "</datalist>" +
               '<p class="field__hint">Pick one from the list or type your own.</p>' +
             "</div>" +
             '<div class="field">' +
               '<label class="field__label" for="ob-semester">Which semester are you in?</label>' +
               '<select class="select" id="ob-semester">' +
                 '<option value="">Choose a semester</option>' +
                 SEMESTERS.map(function (s, i) {
                   var value = String(i + 1);
                   return '<option value="' + value + '"' +
                     (draft.semester === value ? " selected" : "") + ">" + s + "</option>";
                 }).join("") +
               "</select>" +
             "</div>" +
           "</div>";
  }

  function readAcademic() {
    var program = (panel.querySelector("#ob-program") || {}).value;
    var semester = (panel.querySelector("#ob-semester") || {}).value;
    if (program !== undefined) draft.program = String(program).trim();
    if (semester !== undefined) draft.semester = semester;
  }

  function checkAcademic() {
    readAcademic();
    if (!draft.program) return "Add your program so your dashboard knows what you study.";
    if (!draft.semester) return "Choose the semester you're in.";
    return null;
  }

  /* =======================================================
     Step 3 — Subjects, credits and attendance tracking

     This is the step that matters most: the list built here
     becomes the source of truth for attendance, CGPA and the
     timetable, so none of those ever asks for a subject name
     again.

     Each subject also answers "record attendance for this
     subject?". Some subjects genuinely don't take a register —
     a one-credit elective, an audit — and forcing them onto
     the attendance page produces a permanent 0% for a class
     nobody is counting. The answer is stored ON the subject,
     so it applies to every user rather than being special-
     cased for any one of them.

     Saying no affects attendance ONLY. Credits and grades are
     untouched, and the subject still counts fully towards CGPA.
     ======================================================= */

  function renderSubjects() {
    return stepHead("Add your subjects",
             "Attendance, CGPA and your timetable all read from this list — " +
             "add them once here and pick them from a dropdown everywhere else.") +
           '<div class="ob-subjects" data-subject-list>' + subjectRows() + "</div>" +
           '<button type="button" class="btn btn--ghost btn--sm ob-add" data-subject-add>' +
             "+ Add subject</button>";
  }

  function subjectRows() {
    if (!draft.subjects.length) {
      return '<p class="ob-empty">No subjects yet. Add your first one below.</p>';
    }
    return draft.subjects.map(function (s, i) {
      var n = i + 1;
      return '<div class="ob-subject" data-subject="' + s.id + '">' +
        '<div class="ob-subject__main">' +
          '<div class="ob-subject__field">' +
            '<label class="ob-subject__label" for="ob-sub-' + s.id + '">Subject ' + n + "</label>" +
            '<input class="input input--sm" id="ob-sub-' + s.id + '" data-sub-name ' +
              'value="' + util.escapeHTML(s.name) + '" placeholder="e.g. DBMS">' +
          "</div>" +
          '<div class="ob-subject__field ob-subject__field--credits">' +
            '<label class="ob-subject__label" for="ob-cr-' + s.id + '">Credits</label>' +
            '<input class="input input--sm" id="ob-cr-' + s.id + '" data-sub-credits type="number" ' +
              'min="0" max="20" step="1" value="' +
              util.escapeHTML(String(s.credits || "")) + '" placeholder="4">' +
          "</div>" +
          '<button type="button" class="icon-btn ob-subject__remove" data-sub-remove="' + s.id + '" ' +
            'aria-label="Remove ' + util.escapeHTML(s.name || "subject " + n) + '">&times;</button>' +
        "</div>" +

        '<fieldset class="ob-track">' +
          '<legend class="ob-track__legend">Record attendance for this subject?</legend>' +
          '<div class="ob-track__options">' +
            trackOption(s, true, "Yes") +
            trackOption(s, false, "No") +
          "</div>" +
        "</fieldset>" +
      "</div>";
    }).join("");
  }

  function trackOption(subject, value, label) {
    var checked = subject.trackAttendance === value;
    return '<label class="ob-track__option' + (checked ? " is-selected" : "") + '">' +
             '<input type="radio" name="track-' + subject.id + '" ' +
               'data-sub-track="' + subject.id + '" value="' + (value ? "yes" : "no") + '"' +
               (checked ? " checked" : "") + ">" +
             "<span>" + label + "</span>" +
           "</label>";
  }

  /* Copy what is on screen back into the draft. Called before any
     re-render, so nothing typed is lost when the list redraws. */
  function readSubjects() {
    panel.querySelectorAll("[data-subject]").forEach(function (row) {
      var id = row.getAttribute("data-subject");
      draft.subjects.forEach(function (s) {
        if (s.id !== id) return;
        var name = row.querySelector("[data-sub-name]");
        var credits = row.querySelector("[data-sub-credits]");
        var track = row.querySelector("[data-sub-track]:checked");
        if (name) s.name = name.value.trim();
        if (credits) s.credits = credits.value === "" ? "" : Number(credits.value) || 0;
        if (track) s.trackAttendance = track.value === "yes";
      });
    });
    saveDraft();
  }

  function checkSubjects() {
    readSubjects();
    var named = draft.subjects.filter(function (s) { return s.name; });
    if (!named.length) return "Add at least one subject — the rest of Synora is built around them.";

    var missingCredits = named.some(function (s) { return !s.credits; });
    if (missingCredits) return "Give every subject its credit value so your CGPA can be worked out.";

    var seen = {};
    var duplicate = named.some(function (s) {
      var key = s.name.toLowerCase();
      if (seen[key]) return true;
      seen[key] = true;
      return false;
    });
    if (duplicate) return "Two subjects share a name — give each one its own.";

    // Drop any blank rows the person left behind.
    draft.subjects = named;
    saveDraft();
    return null;
  }

  /* =======================================================
     Step 4 — Attendance goal
     ======================================================= */

  function renderAttendance() {
    var tracked = draft.subjects.filter(function (s) {
      return s.name && s.trackAttendance;
    }).length;

    return stepHead("What's your target attendance?",
             "Synora warns you when a subject slips below this, and works out " +
             "how many classes you can still afford to miss.") +
           '<div class="ob-target">' +
             '<output class="ob-target__value" data-target-out>' + draft.targetAttendance + "%</output>" +
             '<label class="visually-hidden" for="ob-target">Target attendance percentage</label>' +
             '<input class="ob-target__range" type="range" id="ob-target" min="50" max="100" step="1" ' +
               'value="' + draft.targetAttendance + '">' +
             '<div class="ob-target__scale" aria-hidden="true">' +
               "<span>50%</span><span>75%</span><span>100%</span></div>" +
             '<p class="ob-target__note">Most colleges require 75%. ' +
               "This applies to the " + tracked + " subject" + (tracked === 1 ? "" : "s") +
               " you're recording attendance for.</p>" +
           "</div>";
  }

  /* =======================================================
     Step 5 — Appearance
     Applied the moment it is picked, so the preview is the
     real thing rather than a picture of it.
     ======================================================= */

  function renderAppearance() {
    return stepHead("Choose your appearance",
             "You can change this any time from the header or Settings.") +
           '<fieldset class="ob-fieldset">' +
             '<legend class="visually-hidden">Appearance</legend>' +
             '<div class="ob-themes">' +
               themeOption("light", "Light", "Warm paper white") +
               themeOption("dark", "Dark", "Easy on late nights") +
             "</div>" +
           "</fieldset>";
  }

  function themeOption(value, label, note) {
    var checked = draft.appearance === value;
    return '<label class="ob-theme ob-theme--' + value + (checked ? " is-selected" : "") + '">' +
             '<input type="radio" name="ob-theme" value="' + value + '"' + (checked ? " checked" : "") + ">" +
             '<span class="ob-theme__preview" aria-hidden="true">' +
               '<span class="ob-theme__bar"></span>' +
               '<span class="ob-theme__body">' +
                 '<span class="ob-theme__side"></span>' +
                 '<span class="ob-theme__main"><i></i><i></i><i></i></span>' +
               "</span>" +
             "</span>" +
             '<span class="ob-theme__meta">' +
               '<span class="ob-theme__label">' + label + "</span>" +
               '<span class="ob-theme__note">' + note + "</span>" +
             "</span>" +
             '<span class="ob-theme__check" aria-hidden="true">&#10003;</span>' +
           "</label>";
  }

  /* =======================================================
     Step 6 — Review
     ======================================================= */

  function renderFinish() {
    var kept = draft.subjects.filter(function (s) { return s.name; });

    var subjectList = kept.map(function (s) {
      return "<li><span>" + util.escapeHTML(s.name) + "</span>" +
             '<span class="muted">' + s.credits + " credit" + (s.credits === 1 ? "" : "s") +
               (s.trackAttendance ? "" : " · no attendance") + "</span></li>";
    }).join("");

    var totalCredits = kept.reduce(function (n, s) { return n + (Number(s.credits) || 0); }, 0);
    var tracked = kept.filter(function (s) { return s.trackAttendance; }).length;

    return stepHead("Ready when you are",
             "Here's your workspace. Everything below can be changed later in Settings.") +
           '<div class="ob-summary">' +
             '<div class="ob-summary__who">' +
               '<span class="ob-summary__art">' +
                 Synora.avatars.html(draft.avatar, 64, currentInitials()) + "</span>" +
               "<span>" +
                 "<strong>" + util.escapeHTML(profile.fullName || profile.username) + "</strong>" +
                 '<span class="muted">@' + util.escapeHTML(profile.username) + "</span>" +
               "</span>" +
             "</div>" +
             '<dl class="ob-summary__grid">' +
               summaryRow("Program", draft.program) +
               summaryRow("Semester", "Semester " + draft.semester) +
               summaryRow("Subjects", kept.length + " · " + totalCredits + " credits") +
               summaryRow("Attendance", tracked + " of " + kept.length +
                 " tracked · target " + draft.targetAttendance + "%") +
               summaryRow("Appearance", draft.appearance === "dark" ? "Dark" : "Light") +
             "</dl>" +
             '<ul class="ob-summary__subjects">' + subjectList + "</ul>" +
           "</div>";
  }

  function summaryRow(label, value) {
    return "<div><dt>" + label + "</dt><dd>" + util.escapeHTML(String(value)) + "</dd></div>";
  }

  /* =======================================================
     Per-step wiring.

     Every listener is bound to `panel`'s CURRENT contents, which
     render() replaces wholesale each time — so a handler is
     attached to the element it will act on, and lists that
     re-render themselves delegate from the wrapper that survives
     rather than from the rows that don't.
     ======================================================= */

  function wireStep(step) {
    if (step.id === "avatar") {
      var fieldset = panel.querySelector(".ob-fieldset");
      fieldset.addEventListener("change", function (e) {
        if (!e.target.matches('input[name="avatar-choice"]')) return;

        // "illustration:avatar-03" / "initials:sage"
        var parts = e.target.value.split(":");
        draft.avatar = { type: parts[0], id: parts[1] };
        saveDraft();

        fieldset.querySelectorAll(".avatar-option, .avatar-swatch").forEach(function (l) {
          var input = l.querySelector("input");
          l.classList.toggle("is-selected", !!input && input.checked);
        });
        panel.querySelector("[data-avatar-preview]").innerHTML = avatarPreview();
      });
    }

    if (step.id === "academic") {
      panel.addEventListener("change", readAcademic);
      panel.addEventListener("input", readAcademic);
    }

    if (step.id === "subjects") {
      var list = panel.querySelector("[data-subject-list]");

      panel.querySelector("[data-subject-add]").addEventListener("click", function () {
        readSubjects();
        draft.subjects.push({
          id: util.uid("sub"), name: "", credits: "", trackAttendance: true
        });
        list.innerHTML = subjectRows();
        var inputs = panel.querySelectorAll("[data-sub-name]");
        if (inputs.length) inputs[inputs.length - 1].focus();
        saveDraft();
      });

      list.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-sub-remove]");
        if (!btn) return;
        readSubjects();
        var id = btn.getAttribute("data-sub-remove");
        draft.subjects = draft.subjects.filter(function (s) { return s.id !== id; });
        list.innerHTML = subjectRows();
        showError(null);
        saveDraft();
      });

      /* Yes / No highlights its own row without redrawing the list —
         redrawing here would pull focus out from under the click. */
      list.addEventListener("change", function (e) {
        var radio = e.target.closest("[data-sub-track]");
        if (!radio) return;
        readSubjects();
        var group = radio.closest(".ob-track__options");
        group.querySelectorAll(".ob-track__option").forEach(function (l) {
          var input = l.querySelector("input");
          l.classList.toggle("is-selected", !!input && input.checked);
        });
      });

      list.addEventListener("input", readSubjects);

      // Enter in a subject field adds the next row rather than doing nothing.
      list.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        panel.querySelector("[data-subject-add]").click();
      });
    }

    if (step.id === "attendance") {
      var range = panel.querySelector("#ob-target");
      var out = panel.querySelector("[data-target-out]");
      range.addEventListener("input", function () {
        draft.targetAttendance = Number(range.value);
        out.textContent = range.value + "%";
        saveDraft();
      });
    }

    if (step.id === "appearance") {
      var themes = panel.querySelector(".ob-themes");
      themes.addEventListener("change", function (e) {
        if (!e.target.matches('input[name="ob-theme"]')) return;
        draft.appearance = e.target.value;
        // Apply immediately — the preview should be the real thing.
        document.documentElement.setAttribute("data-theme", draft.appearance);
        localStorage.setItem(Synora.keys.theme, draft.appearance);
        themes.querySelectorAll(".ob-theme").forEach(function (l) {
          var input = l.querySelector("input");
          l.classList.toggle("is-selected", !!input && input.checked);
        });
        saveDraft();
      });
    }
  }

  /* =======================================================
     Navigation.
     ======================================================= */

  function readCurrentStep() {
    var step = steps[index];
    if (step.id === "academic") readAcademic();
    if (step.id === "subjects") readSubjects();
  }

  function goNext() {
    var step = steps[index];

    if (typeof step.required === "function") {
      var error = step.required();
      if (error) { showError(error); return; }
    } else {
      // Steps without a validator still need their values read back.
      readCurrentStep();
    }

    showError(null);

    if (index === steps.length - 1) { finish(); return; }
    index++;
    render();
  }

  function goBack() {
    if (index === 0) return;
    // Keep whatever has been typed on the way back — no validation.
    readCurrentStep();
    showError(null);
    index--;
    render();
  }

  /* Skip moves past an optional step. It does not abandon setup. */
  function skip() {
    showError(null);
    if (index === steps.length - 1) { finish(); return; }
    index++;
    render();
  }

  /* =======================================================
     Saving.
     ======================================================= */

  /* Write whatever has been answered so far. `complete` decides
     whether this also marks setup as finished. */
  function persist(complete) {
    Synora.profile.save({
      avatar: draft.avatar,
      program: draft.program,
      semester: draft.semester,
      targetAttendance: draft.targetAttendance,
      appearance: draft.appearance,
      onboarded: complete ? true : Synora.profile.get().onboarded
    });

    store.subjects.setAll(draft.subjects
      .filter(function (s) { return s.name; })
      .map(function (s) {
        return {
          id: s.id,
          name: s.name,
          credits: Number(s.credits) || 0,
          trackAttendance: s.trackAttendance !== false
        };
      }));

    localStorage.setItem(Synora.keys.theme, draft.appearance);
  }

  function finish() {
    readCurrentStep();
    persist(true);
    clearDraft();

    // Reveal "You're all set." and let it land before moving on, so the
    // dashboard arrives as an ending rather than an interruption.
    doneEl.hidden = false;
    requestAnimationFrame(function () { doneEl.classList.add("is-shown"); });

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(function () {
      window.location.href = DASHBOARD;
    }, reduced ? 200 : 1400);
  }

  /* "Save & finish later" — keeps everything entered so far and opens
     the dashboard, WITHOUT marking setup as done. The draft is left in
     place, so coming back lands on the same step with the same answers,
     and the dashboard offers the way back in. */
  function exitEarly() {
    readCurrentStep();
    persist(false);
    saveDraft();
    window.location.href = DASHBOARD;
  }

  /* =======================================================
     Boot.
     ======================================================= */

  backBtn.addEventListener("click", goBack);
  nextBtn.addEventListener("click", goNext);
  skipBtn.addEventListener("click", skip);

  var exitBtn = document.querySelector("[data-ob-exit]");
  if (exitBtn) exitBtn.addEventListener("click", exitEarly);

  // Enter anywhere in the panel moves forward, except inside the
  // subject list, which uses Enter to add another row.
  panel.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (e.target.closest("[data-subject-list]")) return;
    if (e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    goNext();
  });

  // Start with one empty subject row so the step isn't a blank slate.
  if (!draft.subjects.length) {
    draft.subjects.push({
      id: util.uid("sub"), name: "", credits: "", trackAttendance: true
    });
  }

  render();
})();
