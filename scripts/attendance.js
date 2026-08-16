/* =========================================================
   Synora — Attendance

   For each subject being tracked: the percentage attended, and
   the question students actually ask —

     • below target: how many classes in a row must I attend
       to reach it?
     • at or above:  how many can I safely miss?

     attendance % = attended / held × 100

   What appears here
   -----------------
   The subjects with trackAttendance = true, and only those.
   That flag is set when the subject is added (in onboarding or
   Settings) and can be changed later with Edit. A subject with
   the flag off is absent from this page, from the chart and from
   the warnings — but keeps its credits and its grade, because
   CGPA and attendance are independent of each other.

   There is deliberately no "Track a subject" button. A subject
   is not something you add here; it is something you already
   have, which either takes a register or doesn't. Adding one
   here as well would have created a second list to disagree
   with the first.

   Storage holds counts only — { id, subjectId, total, attended } —
   and the subject list decides which of them are shown. A row is
   written the first time a count changes, so a fresh subject
   needs no set-up before its + button works.

   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  function counts() { return store.get("attendance"); }
  function target() { return Number(Synora.profile.get().targetAttendance) || 75; }

  /* ---- Writing counts ----------------------------------------
     One way in, so the two invariants are enforced in one place
     rather than at each button:

       held     >= 0
       attended >= 0  and  attended <= held

     A student cannot attend more classes than were held, so
     lowering held pulls attended down with it instead of leaving
     an impossible pair on screen.                              */

  function setCounts(subjectId, held, attended) {
    var h = Math.max(0, Math.round(Number(held) || 0));
    var a = util.clamp(Math.round(Number(attended) || 0), 0, h);

    store.update("attendance", function (list) {
      var row = null;
      list.forEach(function (r) { if (r.subjectId === subjectId) row = r; });
      if (!row) {
        row = { id: util.uid("att"), subjectId: subjectId, total: 0, attended: 0 };
        list.push(row);
      }
      row.total = h;
      row.attended = a;
      return list;
    });

    Synora.refresh();
    return { total: h, attended: a };
  }

  function rowFor(subjectId) {
    var found = null;
    counts().forEach(function (r) { if (r.subjectId === subjectId) found = r; });
    return found || { total: 0, attended: 0 };
  }

  /* ---- The maths for one subject ---------------------------- */

  function analyse(row) {
    var total = Math.max(0, Number(row.total) || 0);
    var attended = util.clamp(Number(row.attended) || 0, 0, total);
    var goal = target();

    var res = {
      total: total,
      attended: attended,
      target: goal,
      recorded: total > 0,
      /* Guarding the divide here is what keeps NaN and Infinity off
         the screen when a subject has no classes yet. */
      pct: total ? (attended / total) * 100 : 0,
      status: "none",
      message: ""
    };

    if (!total) {
      res.message = "No classes recorded yet.";
      return res;
    }

    if (res.pct >= goal) {
      res.status = "safe";
      if (goal >= 100) {
        res.canMiss = 0;
        res.message = "Perfect attendance required — don't miss any.";
      } else {
        // attended / (total + x) ≥ goal/100  →  x ≤ attended×100/goal − total
        res.canMiss = Math.max(0, Math.floor((attended * 100) / goal - total));
        res.message = res.canMiss === 0
          ? "Right on target — don't miss the next class."
          : "You can miss " + res.canMiss + " more " + plural(res.canMiss, "class") +
            " and stay above " + goal + "%.";
      }
    } else {
      res.status = "danger";
      if (goal >= 100) {
        res.message = "Can't reach 100% once a class is missed.";
      } else {
        // (attended + n) / (total + n) ≥ goal/100
        res.need = Math.max(0, Math.ceil((goal * total - 100 * attended) / (100 - goal)));
        res.message = "Attend " + res.need + " " + plural(res.need, "class") +
                      " in a row to reach " + goal + "%.";
      }
    }
    return res;
  }

  function plural(n, w) { return n === 1 ? w : w + "es"; }

  /* =======================================================
     Edit — the major changes.

     The + and − buttons handle the everyday correction of a
     count. This dialog is for everything else about the
     subject: its name, its credits, whether it takes a
     register at all, and a direct correction of both numbers
     at once. It edits the SUBJECT, so a rename made here
     shows up in CGPA and the timetable too.
     ======================================================= */

  function openEdit(subjectId, onDone) {
    var subject = store.subjects.byId(subjectId);
    if (!subject) return;
    var row = rowFor(subjectId);

    var form = document.createElement("form");
    form.className = "stack";
    form.noValidate = true;
    form.innerHTML =
      '<div class="field" data-field="name" style="margin:0">' +
        '<label class="field__label" for="ae-name">Subject name</label>' +
        '<input class="input" id="ae-name" value="' + util.escapeHTML(subject.name) + '">' +
        '<p class="field__hint">Renaming updates this subject everywhere — ' +
          "attendance, CGPA and your timetable.</p>" +
        '<p class="field__error"></p>' +
      "</div>" +
      '<div class="form-grid">' +
        '<div class="field" data-field="total" style="margin:0">' +
          '<label class="field__label" for="ae-total">Classes held</label>' +
          '<input class="input" type="number" min="0" id="ae-total" value="' + row.total + '">' +
          '<p class="field__error"></p></div>' +
        '<div class="field" data-field="attended" style="margin:0">' +
          '<label class="field__label" for="ae-attended">Classes attended</label>' +
          '<input class="input" type="number" min="0" id="ae-attended" value="' + row.attended + '">' +
          '<p class="field__error"></p></div>' +
      "</div>" +
      '<div class="field" data-field="credits" style="margin:0">' +
        '<label class="field__label" for="ae-credits">Credits</label>' +
        '<input class="input" type="number" min="0" max="20" id="ae-credits" ' +
          'value="' + (subject.credits || "") + '">' +
        '<p class="field__hint">Used by CGPA, not by attendance.</p>' +
        '<p class="field__error"></p>' +
      "</div>" +
      '<label class="check-row" style="align-items:flex-start">' +
        '<input type="checkbox" id="ae-track"' + (subject.trackAttendance ? " checked" : "") + ">" +
        "<span><strong>Record attendance for this subject</strong>" +
          '<span class="text-small muted" style="display:block">' +
            "Turn this off and the subject leaves this page and its chart. " +
            "It keeps its credits and grade for CGPA.</span></span>" +
      "</label>" +
      '<p class="text-small muted" style="margin:0">Your target is ' + target() +
        "% for every subject. Change it in Settings.</p>";

    var modal = Synora.openModal({
      title: "Edit " + subject.name,
      content: form,
      footer: [
        { label: "Cancel", variant: "ghost" },
        { label: "Save changes", variant: "primary", close: false, onClick: submit }
      ]
    });

    function fieldError(name, message) {
      var field = form.querySelector('[data-field="' + name + '"]');
      field.classList.add("is-invalid");
      field.querySelector(".field__error").textContent = message;
      return true;
    }

    function submit() {
      form.querySelectorAll(".field").forEach(function (f) {
        f.classList.remove("is-invalid");
        var e = f.querySelector(".field__error");
        if (e) e.textContent = "";
      });

      var name = form.querySelector("#ae-name").value.trim();
      var total = parseInt(form.querySelector("#ae-total").value, 10);
      var attended = parseInt(form.querySelector("#ae-attended").value, 10);
      var credits = parseInt(form.querySelector("#ae-credits").value, 10);
      var track = form.querySelector("#ae-track").checked;

      if (!name) return fieldError("name", "Give the subject a name.");

      var clash = store.subjects.all().some(function (other) {
        return other.id !== subject.id &&
               other.name.toLowerCase() === name.toLowerCase();
      });
      if (clash) return fieldError("name", "You already have a subject with that name.");

      if (isNaN(total) || total < 0) return fieldError("total", "Enter how many classes have been held.");
      if (isNaN(attended) || attended < 0) return fieldError("attended", "Enter how many you attended.");
      if (attended > total) return fieldError("attended", "You can't attend more classes than were held.");
      if (isNaN(credits) || credits < 0) return fieldError("credits", "Enter the subject's credit value.");

      store.subjects.save({
        id: subject.id, name: name, credits: credits, trackAttendance: track
      });
      setCounts(subject.id, total, attended);

      modal.close();
      Synora.toast.success("Subject updated", track
        ? name
        : name + " — attendance tracking is now off");
      if (onDone) onDone();
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
  }

  /* =======================================================
     Delete — removes the SUBJECT, not just its counts.

     Everything that points at a subject goes with it, so no
     module is left holding a reference to something that no
     longer exists. The dialog says exactly what will be lost
     rather than asking "are you sure?" about an unnamed
     amount of data.
     ======================================================= */

  function confirmDelete(subjectId, onDone) {
    var subject = store.subjects.byId(subjectId);
    if (!subject) return;

    var timetableCount = store.get("timetable").filter(function (c) {
      return c.subjectId === subjectId;
    }).length;
    var graded = (store.get("cgpa").subjects || []).some(function (g) {
      return g.subjectId === subjectId && g.grade;
    });

    var losing = ["its attendance record"];
    if (timetableCount) {
      losing.push(timetableCount + " timetable " + (timetableCount === 1 ? "entry" : "entries"));
    }
    if (graded) losing.push("its grade");

    Synora.confirm({
      title: "Delete " + subject.name + "?",
      message: "This removes the subject itself, along with " +
               listPhrase(losing) + ". This can't be undone.",
      confirmLabel: "Delete subject",
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      store.subjects.remove(subjectId);
      Synora.refresh();
      Synora.toast("Deleted " + subject.name);
      if (onDone) onDone();
    });
  }

  function listPhrase(items) {
    if (items.length === 1) return items[0];
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  /* =======================================================
     Page.
     ======================================================= */

  function initPage() {
    var root = document.querySelector("[data-attendance-page]");
    if (!root) return;

    root.innerHTML =
      '<div class="card card--pad" data-summary style="margin-bottom:24px"></div>' +
      '<div class="card"><div class="card__header">' +
        '<span class="card__title">Subjects</span>' +
        '<span class="text-small muted" data-subject-note></span>' +
      "</div>" +
      '<div class="card__body" data-subjects></div></div>' +
      '<div class="card" style="margin-top:24px"><div class="card__header">' +
        '<span class="card__title">Attendance by subject</span>' +
        '<span class="text-small muted" data-chart-note></span>' +
      "</div>" +
      '<div class="card__body" data-chart></div></div>';

    var subjectsEl = root.querySelector("[data-subjects]");

    /* ---- Subject cards ---------------------------------------
       A card per tracked subject, each carrying its own quick
       controls. Credits are deliberately not shown: they are a
       CGPA fact and say nothing about attendance.             */

    function renderSubjects() {
      var data = Synora.derive.attendance();
      var rows = data.subjects;
      var note = root.querySelector("[data-subject-note]");

      var untracked = store.subjects.all().length - rows.length;
      note.textContent = untracked > 0
        ? untracked + " more " + (untracked === 1 ? "subject is" : "subjects are") +
          " not tracked for attendance"
        : "";

      if (!rows.length) {
        subjectsEl.innerHTML =
          '<div class="empty" style="padding:40px 24px">' +
            '<span class="empty__icon">' + Synora.icon("users", 26) + "</span>" +
            '<p class="empty__title">No subjects are tracked for attendance</p>' +
            '<p class="empty__text">Attendance follows your subject list. Turn on ' +
              '"Record attendance" for a subject in Settings and it will appear here.</p>' +
            '<a class="btn btn--primary" href="settings.html">Open Settings</a>' +
          "</div>";
        return;
      }

      subjectsEl.innerHTML = '<div class="att-grid">' + rows.map(function (r) {
        var a = analyse(r);
        return '<article class="att-card' + (a.status === "danger" ? " att-card--danger" : "") +
                 '" data-subject="' + r.subjectId + '">' +
          '<header class="att-card__head">' +
            '<h3 class="att-card__name">' + util.escapeHTML(r.subject) + "</h3>" +
            '<div class="att-card__actions">' +
              '<button type="button" class="icon-btn" data-edit="' + r.subjectId + '" ' +
                'aria-label="Edit ' + util.escapeHTML(r.subject) + '">' +
                Synora.icon("edit", 15) + "</button>" +
              '<button type="button" class="icon-btn" data-del="' + r.subjectId + '" ' +
                'aria-label="Delete ' + util.escapeHTML(r.subject) + '">' +
                Synora.icon("trash", 15) + "</button>" +
            "</div>" +
          "</header>" +

          '<div class="att-card__counts">' +
            stepper(r.subjectId, "held", "Held", a.total, util.escapeHTML(r.subject)) +
            stepper(r.subjectId, "attended", "Attended", a.attended, util.escapeHTML(r.subject)) +
          "</div>" +

          '<div class="att-card__pct">' +
            '<span class="att-card__pct-label">Attendance</span>' +
            '<span class="att-card__pct-value' +
              (a.recorded ? (a.status === "danger" ? " is-danger" : " is-safe") : " is-none") + '">' +
              (a.recorded ? a.pct.toFixed(2) + "%" : "—") + "</span>" +
          "</div>" +

          '<p class="att-card__msg">' + util.escapeHTML(a.message) + "</p>" +
        "</article>";
      }).join("") + "</div>";
    }

    /* A labelled number with a − and a + either side of it. The
       buttons carry the subject id and which count they change, so
       one delegated listener on the grid serves every card. */
    function stepper(subjectId, which, label, value, subjectName) {
      return '<div class="att-step">' +
        '<span class="att-step__label" id="lbl-' + which + "-" + subjectId + '">' + label + "</span>" +
        '<div class="att-step__controls">' +
          '<button type="button" class="att-step__btn" data-step="-1" ' +
            'data-which="' + which + '" data-for="' + subjectId + '" ' +
            'aria-label="One fewer ' + label.toLowerCase() + ' for ' + subjectName + '">&minus;</button>' +
          '<output class="att-step__value" aria-labelledby="lbl-' + which + "-" + subjectId + '">' +
            value + "</output>" +
          '<button type="button" class="att-step__btn" data-step="1" ' +
            'data-which="' + which + '" data-for="' + subjectId + '" ' +
            'aria-label="One more ' + label.toLowerCase() + ' for ' + subjectName + '">+</button>' +
        "</div>" +
      "</div>";
    }

    /* ---- One delegated listener for the whole grid ------------
       The grid is re-rendered on every change, so listeners are
       bound to the container that survives, never to the buttons
       inside it.                                               */

    subjectsEl.addEventListener("click", function (e) {
      var step = e.target.closest("[data-step]");
      if (step) {
        applyStep(step.getAttribute("data-for"),
                  step.getAttribute("data-which"),
                  Number(step.getAttribute("data-step")));
        return;
      }

      var edit = e.target.closest("[data-edit]");
      if (edit) { openEdit(edit.getAttribute("data-edit"), renderAll); return; }

      var del = e.target.closest("[data-del]");
      if (del) { confirmDelete(del.getAttribute("data-del"), renderAll); }
    });

    function applyStep(subjectId, which, delta) {
      var row = rowFor(subjectId);
      var held = Math.max(0, Number(row.total) || 0);
      var attended = util.clamp(Number(row.attended) || 0, 0, held);

      if (which === "held") {
        held = Math.max(0, held + delta);
        /* Dropping held below attended would claim more classes were
           attended than happened, so attended follows it down. */
        attended = Math.min(attended, held);
      } else {
        // Never above held: you can't attend a class that wasn't held.
        attended = util.clamp(attended + delta, 0, held);
      }

      setCounts(subjectId, held, attended);
      renderAll();
    }

    /* ---- Summary ---- */

    function renderSummary() {
      var overall = Synora.derive.attendance();
      var val = overall.overall;
      var below = val !== null && val < overall.target;
      var color = val === null ? "var(--color-secondary)"
                : below ? "var(--status-high)" : "var(--status-low)";
      var r = 46, C = 2 * Math.PI * r;
      var frac = val === null ? 0 : util.clamp(val / 100, 0, 1);

      root.querySelector("[data-summary]").innerHTML =
        '<div class="summary-row">' +
          '<div class="ring-wrap"><svg class="ring" width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">' +
            '<circle class="ring__track" cx="64" cy="64" r="' + r + '" stroke-width="12"></circle>' +
            '<circle class="ring__fill" cx="64" cy="64" r="' + r + '" stroke-width="12" stroke="' + color + '" ' +
              'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - frac)) + '"></circle>' +
          '</svg><span class="ring-wrap__center"><span class="ring-wrap__value">' +
            (val === null ? "—" : val.toFixed(0) + "%") +
            '</span><span class="ring-wrap__label">overall</span></span></div>' +
          '<div style="flex:1;min-width:220px">' +
            '<p style="font-family:var(--font-heading);font-size:1.1rem;font-weight:700">' +
              (val === null ? "No classes recorded yet"
                : below ? "Below your " + overall.target + "% target"
                : "On track") + "</p>" +
            '<p class="muted text-small" style="margin-top:4px">' +
              (val === null ? "Use the + buttons below as classes happen."
                : below ? "Attend upcoming classes to pull your average back up."
                : "Nice — you're keeping above target across your subjects.") + "</p>" +
            '<p class="text-small muted" style="margin-top:12px">Target: <strong>' +
              overall.target + '%</strong> · <a class="card__link" href="settings.html">Change</a></p>' +
          "</div>" +
        "</div>";
    }

    /* ---- Chart ----
       The y-axis is fixed at 0–100%, never scaled to the data.
       A percentage has a real ceiling, and a chart that stretched
       to fit the highest bar would make 83% look like a full house.
       The dashed line is the target, read from the profile rather
       than assumed to be 75.

       Only tracked subjects reach this point — derive.attendance()
       has already excluded the rest. */

    function renderChart() {
      var data = Synora.derive.attendance();
      var el = root.querySelector("[data-chart]");
      var note = root.querySelector("[data-chart-note]");
      var goal = data.target;

      var subjects = data.subjects.filter(function (s) { return s.recorded; });

      if (!subjects.length) {
        note.textContent = "";
        el.innerHTML = '<p class="muted text-small">Record some classes to see the chart.</p>';
        return;
      }

      note.textContent = "Target " + goal + "%";

      var ticks = [100, 80, 60, 40, 20, 0];

      var html = '<div class="chart" role="img" aria-label="' +
        util.escapeHTML(chartSummary(subjects, goal)) + '">';

      html += '<div class="chart__y" aria-hidden="true">' +
        ticks.map(function (t) { return "<span>" + t + "%</span>"; }).join("") +
      "</div>";

      html += '<div class="chart__plot" aria-hidden="true">';
      html += '<div class="chart__grid">' + ticks.map(function () { return "<i></i>"; }).join("") + "</div>";
      html += '<div class="chart__target" style="bottom:' + goal + '%">' +
                '<span class="chart__target-tag">' + goal + "%</span></div>";
      html += '<div class="chart__bars">' + subjects.map(function (s) {
        var below = s.pct < goal;
        return '<div class="chart__col">' +
          '<span class="chart__value">' + s.pct.toFixed(0) + "%</span>" +
          '<div class="chart__bar' + (below ? " chart__bar--danger" : "") +
            '" style="height:' + util.clamp(s.pct, 0, 100) + '%"></div>' +
        "</div>";
      }).join("") + "</div>";
      html += "</div>";

      html += '<div class="chart__corner" aria-hidden="true"></div>';
      html += '<div class="chart__x" aria-hidden="true">' + subjects.map(function (s) {
        return '<span title="' + util.escapeHTML(s.subject) + '">' +
          util.escapeHTML(s.subject) + "</span>";
      }).join("") + "</div>";

      html += "</div>";

      html += '<p class="chart__caption">Subjects along the bottom, attendance from 0% to 100%. ' +
              "The dashed line is your " + goal + "% target.</p>";

      el.innerHTML = html;
    }

    /* The chart is a picture; this is the same information as a
       sentence, for anyone who can't see it. */
    function chartSummary(subjects, goal) {
      return "Attendance by subject against a " + goal + "% target. " +
        subjects.map(function (s) {
          return s.subject + " " + s.pct.toFixed(0) + "%";
        }).join(", ") + ".";
    }

    function renderAll() {
      renderSubjects();
      renderSummary();
      renderChart();
    }

    renderAll();
  }

  Synora.attendance = { setCounts: setCounts, openEdit: openEdit };
  document.addEventListener("synora:ready", initPage);
})();
