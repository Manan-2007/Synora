/* =========================================================
   Synora — CGPA

   Give each subject a grade; Synora works out the
   credit-weighted CGPA:

     CGPA = Σ(credits × grade point) / Σ(credits)

   Credits are NOT entered here. They belong to the subject
   record, alongside its name, so there is exactly one place
   that knows DBMS is worth 4 credits — and attendance, the
   timetable and this page all agree about which subjects
   exist in the first place.

   The grading system (Synora.GRADES, defined in app.js)

     PASSES                 FAILURES
     O  = 10                E1  failed the internals
     A+ =  9                E2  failed the end-term exam
     A  =  8                E3  failed both
     B+ =  7
     B  =  6

   One control, one result. There used to be a separate
   "Exam status" dropdown beside the grade, which meant two
   fields describing the same outcome — and nothing stopping
   them contradicting each other. The grade now carries the
   result on its own.

   EVERY subject appears here, including the ones with
   trackAttendance = false. Attendance is about registers;
   CGPA is about credits and grades. A subject can have no
   attendance record and still count fully towards the CGPA.

   Each row is { id, subjectId, grade }.
   Stored as: cgpa = { subjects: [...] }
   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  var GRADES = Synora.GRADES;
  var LADDER = Synora.GRADE_LADDER;        // ["B","B+","A","A+","O"] — upwards
  var FAILS = Synora.FAIL_LADDER;          // ["E1","E2","E3"]        — downwards
  var MAX = Synora.GRADE_MAX;              // 10

  function data() { return store.get("cgpa"); }
  function persist(d) { store.set("cgpa", d); }

  /* CGPA over every graded subject.

     A failing grade contributes 0 points but still carries its credits
     into the denominator — that is what makes a backlog pull the average
     down instead of quietly vanishing from it. Stated here because it is
     an assumption this project is making, not a universal rule. */
  function compute(d) {
    var totalCredits = 0, totalPoints = 0, counted = 0, failed = 0;

    (d.subjects || []).forEach(function (row) {
      var subject = store.subjects.byId(row.subjectId);
      if (!subject) return;
      var credits = Number(subject.credits);
      var point = Synora.gradePoint(row.grade);
      if (credits > 0 && point !== undefined) {
        totalCredits += credits;
        totalPoints += credits * point;
        counted++;
        if (Synora.isFailGrade(row.grade)) failed++;
      }
    });

    return {
      cgpa: totalCredits ? totalPoints / totalCredits : 0,
      totalCredits: totalCredits,
      totalPoints: totalPoints,
      counted: counted,
      failed: failed
    };
  }

  function ring(value, max) {
    var r = 46, C = 2 * Math.PI * r;
    var frac = util.clamp(value / max, 0, 1);
    return '<div class="ring-wrap">' +
      '<svg class="ring" width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">' +
        '<circle class="ring__track" cx="64" cy="64" r="' + r + '" stroke-width="12"></circle>' +
        '<circle class="ring__fill" cx="64" cy="64" r="' + r + '" stroke-width="12" ' +
          'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - frac)) + '"></circle>' +
      "</svg>" +
      '<span class="ring-wrap__center">' +
        '<span class="ring-wrap__value">' + value.toFixed(2) + "</span>" +
        '<span class="ring-wrap__label">of ' + max + "</span>" +
      "</span></div>";
  }

  function standing(cgpa, max) {
    var pct = cgpa / max;
    if (pct >= 0.9) return "Outstanding";
    if (pct >= 0.8) return "Excellent";
    if (pct >= 0.7) return "Very good";
    if (pct >= 0.6) return "Good";
    if (pct > 0) return "Keep going";
    return "—";
  }

  /* =======================================================
     Page.
     ======================================================= */

  function initPage() {
    var root = document.querySelector("[data-cgpa-page]");
    if (!root) return;

    /* minmax(0, 1fr) rather than 1fr: a grid track sized 1fr refuses to
       shrink below its content's minimum width, so the subject table
       would push the whole page wider on a phone instead of scrolling
       inside its own card. */
    root.innerHTML =
      '<div class="grid" style="grid-template-columns:minmax(0,1fr);gap:24px">' +
        '<div class="card"><div class="card__header">' +
          '<span class="card__title">Your subjects</span>' +
          '<span class="text-small muted">Every subject counts, tracked for attendance or not</span>' +
        '</div><div class="card__body" data-subjects style="padding:0"></div></div>' +

        '<div class="card card--pad" data-summary></div>' +

        '<div class="card"><div class="card__header">' +
          '<span class="card__title">Grades by subject</span>' +
        "</div>" +
        '<div class="card__body" data-chart></div></div>' +
      "</div>";

    var subjectsEl = root.querySelector("[data-subjects]");

    /* One row per subject in the central list — you cannot add a
       subject here, because a subject is not a grade. Grading a
       subject that doesn't exist is what let the CGPA page and the
       attendance page end up listing different things. */
    function rowFor(subject, dd) {
      var existing = null;
      (dd.subjects || []).forEach(function (r) {
        if (r.subjectId === subject.id) existing = r;
      });
      return existing;
    }

    function renderSubjects() {
      var dd = data();
      var subjects = store.subjects.all();

      if (!subjects.length) {
        subjectsEl.innerHTML =
          '<div class="empty" style="padding:40px 24px">' +
            '<span class="empty__icon">' + Synora.icon("chart", 26) + "</span>" +
            '<p class="empty__title">No subjects yet</p>' +
            '<p class="empty__text">Add your subjects and their credits, then come back to grade them.</p>' +
            '<a class="btn btn--primary" href="settings.html">Add subjects</a>' +
          "</div>";
        return;
      }

      subjectsEl.innerHTML =
        '<div class="table-wrap"><table class="table"><thead><tr>' +
          "<th>Subject</th>" +
          '<th style="width:90px">Credits</th>' +
          '<th style="width:220px">Grade</th>' +
          '<th style="width:110px">Points</th>' +
        "</tr></thead><tbody>" +
        subjects.map(function (s) {
          var row = rowFor(s, dd) || { grade: "" };
          var point = Synora.gradePoint(row.grade);
          var fail = Synora.isFailGrade(row.grade);
          return '<tr data-row="' + s.id + '">' +
            "<td><strong>" + util.escapeHTML(s.name) + "</strong>" +
              (s.trackAttendance ? "" :
                '<span class="text-small muted" style="display:block">not tracked for attendance</span>') +
            "</td>" +
            '<td class="muted">' + (s.credits || "—") + "</td>" +
            '<td><label class="visually-hidden" for="g-' + s.id + '">Grade for ' +
              util.escapeHTML(s.name) + "</label>" +
              '<select class="select select--sm" id="g-' + s.id + '" data-grade>' +
                gradeOptions(row.grade) + "</select></td>" +
            "<td>" + (point === undefined
              ? '<span class="muted">—</span>'
              : fail
                ? '<span class="badge badge--high">0.0</span>'
                : "<strong>" + (point * (Number(s.credits) || 0)).toFixed(1) + "</strong>") + "</td>" +
          "</tr>";
        }).join("") +
        "</tbody></table></div>";
    }

    /* Passes and failures in one dropdown, grouped so the two kinds
       stay visually distinct while remaining a single choice. */
    function gradeOptions(selected) {
      function opt(g) {
        var info = GRADES[g];
        var text = info.pass ? g + " · " + info.point + " points" : g + " · " + info.label;
        return '<option value="' + g + '"' + (g === selected ? " selected" : "") + ">" + text + "</option>";
      }
      return '<option value="">Not graded</option>' +
        '<optgroup label="Pass">' +
          LADDER.slice().reverse().map(opt).join("") +
        "</optgroup>" +
        '<optgroup label="Fail">' +
          FAILS.map(opt).join("") +
        "</optgroup>";
    }

    subjectsEl.addEventListener("change", function (e) {
      var tr = e.target.closest("[data-row]");
      if (!tr || !e.target.matches("[data-grade]")) return;
      var subjectId = tr.getAttribute("data-row");
      var dd = data();

      var row = null;
      (dd.subjects || []).forEach(function (r) { if (r.subjectId === subjectId) row = r; });
      if (!row) {
        row = { id: util.uid("grd"), subjectId: subjectId, grade: "" };
        dd.subjects.push(row);
      }
      row.grade = e.target.value;

      persist(dd);
      renderAll();
    });

    /* ---- Summary ---- */

    function renderSummary() {
      var r = compute(data());
      root.querySelector("[data-summary]").innerHTML =
        '<div class="summary-row">' +
          ring(r.cgpa, MAX) +
          '<div class="stat-grid" style="flex:1;min-width:220px">' +
            statBox("CGPA", r.cgpa.toFixed(2), standing(r.cgpa, MAX)) +
            statBox("Total credits", r.totalCredits, r.counted + " graded") +
            statBox("Grade points", r.totalPoints.toFixed(1),
              r.failed ? r.failed + " failed " + (r.failed === 1 ? "subject" : "subjects")
                       : "credits × grade") +
          "</div>" +
        "</div>";
    }

    function statBox(label, value, foot) {
      return '<div class="stat-card"><div class="stat-card__label">' + label + "</div>" +
        '<div class="stat-card__value">' + value + "</div>" +
        '<div class="stat-card__foot">' + foot + "</div></div>";
    }

    /* ---- Chart ----------------------------------------------
       One axis, two directions, because a result is one of two
       different kinds of thing.

       ABOVE the baseline — the passing grades, on a ladder of
       categories rather than a measured distance:

           O   = 10
           A+  =  9
           A   =  8
           B+  =  7
           B   =  6

       BELOW the baseline — the three failure states. E1, E2 and
       E3 are not small grades, they are separate results, so they
       hang below zero and are labelled individually. They are
       never merged into one "E1/E2/E3" row: which examination was
       failed is the whole point of the distinction.

       The internal numbers are only ever bar heights:
         B → 1 … O → 5        E1 → 1, E2 → 2, E3 → 3 downwards

       X axis is the subjects — all of them, tracked or not. */

    function renderChart() {
      var dd = data();
      var el = root.querySelector("[data-chart]");

      var rows = store.subjects.all().map(function (s) {
        var row = rowFor(s, dd);
        return { name: s.name, grade: row ? row.grade : "" };
      }).filter(function (r) { return GRADES[r.grade]; });

      if (!rows.length) {
        el.innerHTML = '<p class="muted text-small">Grade a subject to see the chart.</p>';
        return;
      }

      var steps = LADDER.length;

      var html = '<div class="chart chart--split" role="img" aria-label="' +
        util.escapeHTML(chartSummary(rows)) + '">';

      // Positive axis: the passing grades, highest at the top.
      html += '<div class="chart__y" aria-hidden="true">' +
        LADDER.slice().reverse().map(function (g) {
          return "<span>" + g + "</span>";
        }).join("") +
      "</div>";

      html += '<div class="chart__plot" aria-hidden="true">';
      html += '<div class="chart__grid">' +
        LADDER.map(function () { return "<i></i>"; }).join("") + "</div>";
      html += '<div class="chart__bars">' + rows.map(function (r) {
        var idx = LADDER.indexOf(r.grade);
        var h = idx >= 0 ? ((idx + 1) / steps) * 100 : 0;
        return '<div class="chart__col">' +
          '<span class="chart__value">' + (h ? r.grade : "") + "</span>" +
          (h ? '<div class="chart__bar" style="height:' + h + '%"></div>' : "") +
        "</div>";
      }).join("") + "</div>";
      html += "</div>";

      // Negative axis: the three failure states, deepening downwards.
      html += '<div class="chart__y-neg" aria-hidden="true">' +
        FAILS.map(function (e) { return "<span>" + e + "</span>"; }).join("") +
      "</div>";

      html += '<div class="chart__plot-neg" aria-hidden="true">';
      html += '<div class="chart__grid">' +
        FAILS.map(function () { return "<i></i>"; }).join("") + "</div>";
      html += '<div class="chart__bars-neg">' + rows.map(function (r) {
        var depth = FAILS.indexOf(r.grade) + 1;      // E1 → 1, E2 → 2, E3 → 3
        var h = depth > 0 ? (depth / FAILS.length) * 100 : 0;
        return '<div class="chart__col-neg">' +
          (h ? '<div class="chart__bar-neg" style="height:' + h + '%"></div>' : "") +
          '<span class="chart__exam">' + (h ? r.grade : "") + "</span>" +
        "</div>";
      }).join("") + "</div>";
      html += "</div>";

      html += '<div class="chart__corner" aria-hidden="true"></div>';
      html += '<div class="chart__x" aria-hidden="true">' + rows.map(function (r) {
        return '<span title="' + util.escapeHTML(r.name) + '">' + util.escapeHTML(r.name) + "</span>";
      }).join("") + "</div>";

      html += "</div>";

      html += '<p class="chart__caption">Subjects along the middle. Above the line, the passing ' +
              "grades (" + LADDER.join(" → ") + " reading upwards, worth " +
              LADDER.map(function (g) { return GRADES[g].point; }).join(" → ") + " points). " +
              "Below it, the three failure states: " +
              FAILS.map(function (f) { return f + " — " + GRADES[f].label.toLowerCase(); }).join("; ") +
              ". A failure scores 0 points.</p>";

      el.innerHTML = html;
    }

    function chartSummary(rows) {
      return "Grade by subject. " + rows.map(function (r) {
        var g = GRADES[r.grade];
        return r.name + ": " + r.grade + (g.pass ? " (" + g.point + " points)" : " — " + g.label);
      }).join(". ") + ".";
    }

    function renderAll() {
      renderSubjects();
      renderSummary();
      renderChart();
    }

    renderAll();
  }

  document.addEventListener("synora:ready", initPage);
})();
