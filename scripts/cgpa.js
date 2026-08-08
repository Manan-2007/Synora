/* =========================================================
   Synora — CGPA calculator
   Enter each subject's credits and grade; Synora works out
   the credit-weighted CGPA:

     CGPA = Σ(credit × grade point) / Σ(credits)

   The grade → point mapping comes from the chosen scale
   (Synora.GRADE_SCALES). Everything persists as you type.

   Stored as: cgpa = { scaleId, subjects: [{id,name,credits,grade}] }
   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;
  var SCALES = Synora.GRADE_SCALES;

  function data() { return store.get("cgpa"); }
  function persist(d) { store.set("cgpa", d); }

  function compute(d) {
    var scale = SCALES[d.scaleId] || SCALES["10"];
    var totalCredits = 0, totalPoints = 0, counted = 0;
    d.subjects.forEach(function (s) {
      var credits = Number(s.credits);
      var point = scale.points[s.grade];
      if (credits > 0 && point !== undefined) {
        totalCredits += credits;
        totalPoints += credits * point;
        counted++;
      }
    });
    return {
      scale: scale,
      cgpa: totalCredits ? totalPoints / totalCredits : 0,
      totalCredits: totalCredits,
      totalPoints: totalPoints,
      counted: counted
    };
  }

  function ring(value, max) {
    var r = 46, C = 2 * Math.PI * r;
    var frac = util.clamp(value / max, 0, 1);
    var offset = C * (1 - frac);
    return '<div class="ring-wrap">' +
      '<svg class="ring" width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">' +
        '<circle class="ring__track" cx="64" cy="64" r="' + r + '" stroke-width="12"></circle>' +
        '<circle class="ring__fill" cx="64" cy="64" r="' + r + '" stroke-width="12" ' +
          'stroke-dasharray="' + C + '" stroke-dashoffset="' + offset + '"></circle>' +
      "</svg>" +
      '<span class="ring-wrap__center"><span class="ring-wrap__value">' + value.toFixed(2) + "</span>" +
      '<span class="ring-wrap__label">of ' + max + "</span></span></div>";
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

  function initPage() {
    var root = document.querySelector("[data-cgpa-page]");
    if (!root) return;

    // Ensure at least one blank row to start.
    var d = data();
    if (!d.subjects.length) {
      d.subjects.push({ id: util.uid("sub"), name: "", credits: "", grade: "" });
      persist(d);
    }

    root.innerHTML =
      '<div class="grid" style="grid-template-columns:1fr;gap:24px">' +
        '<div class="dash-cols" style="grid-template-columns:1fr">' +
          '<div class="card"><div class="card__header">' +
            '<span class="card__title">Your subjects</span>' +
            '<label class="row" style="gap:8px"><span class="text-small muted">Scale</span>' +
              '<select class="select select--sm" data-scale style="width:auto">' +
                Object.keys(SCALES).map(function (k) {
                  return '<option value="' + k + '"' + (k === d.scaleId ? " selected" : "") + ">" + SCALES[k].label + "</option>";
                }).join("") +
              "</select></label>" +
          '</div><div class="card__body" data-subjects></div>' +
          '<div class="card__body" style="border-top:1px solid var(--color-border);display:flex;gap:12px;flex-wrap:wrap">' +
            '<button type="button" class="btn btn--ghost" data-add>' + Synora.icon("plus", 16) + "Add subject</button>" +
            '<button type="button" class="btn btn--ghost" data-reset>Reset</button>' +
          "</div></div>" +
        "</div>" +
        '<div class="card card--pad" data-summary></div>' +
        '<div class="card"><div class="card__header"><span class="card__title">Grade points by subject</span></div>' +
          '<div class="card__body" data-bars></div></div>' +
      "</div>";

    root.querySelector("[data-scale]").addEventListener("change", function (e) {
      var dd = data(); dd.scaleId = e.target.value; persist(dd); renderSubjects(); renderSummary();
    });
    root.querySelector("[data-add]").addEventListener("click", function () {
      var dd = data();
      dd.subjects.push({ id: util.uid("sub"), name: "", credits: "", grade: "" });
      persist(dd); renderSubjects(); renderSummary();
    });
    root.querySelector("[data-reset]").addEventListener("click", function () {
      Synora.confirm({ title: "Reset CGPA?", message: "All subjects here will be cleared.", confirmLabel: "Reset", danger: true })
        .then(function (ok) {
          if (!ok) return;
          var dd = data();
          dd.subjects = [{ id: util.uid("sub"), name: "", credits: "", grade: "" }];
          persist(dd); renderSubjects(); renderSummary();
          Synora.toast("CGPA reset");
        });
    });

    var subjectsEl = root.querySelector("[data-subjects]");

    function gradeOptions(sel) {
      var scale = SCALES[data().scaleId] || SCALES["10"];
      return '<option value="">Grade</option>' + Object.keys(scale.points).map(function (g) {
        return '<option value="' + g + '"' + (g === sel ? " selected" : "") + ">" + g + "</option>";
      }).join("");
    }

    function renderSubjects() {
      var dd = data();
      subjectsEl.innerHTML =
        '<div class="table-wrap"><table class="table"><thead><tr>' +
          "<th>Subject</th><th style=\"width:110px\">Credits</th><th style=\"width:120px\">Grade</th><th style=\"width:44px\"></th>" +
        "</tr></thead><tbody>" +
        dd.subjects.map(function (s) {
          return '<tr data-row="' + s.id + '">' +
            '<td><input class="input input--sm" data-name value="' + util.escapeHTML(s.name) + '" placeholder="Subject name"></td>' +
            '<td><input class="input input--sm" data-credits type="number" min="0" step="0.5" value="' + util.escapeHTML(String(s.credits)) + '" placeholder="0"></td>' +
            '<td><select class="select select--sm" data-grade>' + gradeOptions(s.grade) + "</select></td>" +
            '<td><button type="button" class="icon-btn" data-del="' + s.id + '" aria-label="Remove subject">' + Synora.icon("trash", 15) + "</button></td>" +
          "</tr>";
        }).join("") +
        "</tbody></table></div>";
    }

    // Live-update the store as the user types (no re-render, keeps focus).
    subjectsEl.addEventListener("input", function (e) {
      var row = e.target.closest("[data-row]");
      if (!row) return;
      var id = row.getAttribute("data-row");
      var dd = data();
      var s = dd.subjects.find(function (x) { return x.id === id; });
      if (!s) return;
      if (e.target.matches("[data-name]")) s.name = e.target.value;
      if (e.target.matches("[data-credits]")) s.credits = e.target.value;
      if (e.target.matches("[data-grade]")) s.grade = e.target.value;
      persist(dd); renderSummary();
    });
    subjectsEl.addEventListener("change", function (e) {
      if (e.target.matches("[data-grade]")) {
        var row = e.target.closest("[data-row]");
        var dd = data();
        var s = dd.subjects.find(function (x) { return x.id === row.getAttribute("data-row"); });
        if (s) { s.grade = e.target.value; persist(dd); renderSummary(); }
      }
    });
    subjectsEl.addEventListener("click", function (e) {
      var del = e.target.closest("[data-del]");
      if (!del) return;
      var dd = data();
      dd.subjects = dd.subjects.filter(function (x) { return x.id !== del.getAttribute("data-del"); });
      if (!dd.subjects.length) dd.subjects.push({ id: util.uid("sub"), name: "", credits: "", grade: "" });
      persist(dd); renderSubjects(); renderSummary();
    });

    function renderSummary() {
      var r = compute(data());
      root.querySelector("[data-summary]").innerHTML =
        '<div style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;justify-content:center">' +
          ring(r.cgpa, r.scale.max) +
          '<div class="stat-grid" style="flex:1;min-width:220px">' +
            statBox("CGPA", r.cgpa.toFixed(2), standing(r.cgpa, r.scale.max)) +
            statBox("Total credits", r.totalCredits, r.counted + " subjects") +
            statBox("Grade points", r.totalPoints.toFixed(1), "credit × grade") +
          "</div>" +
        "</div>";
      renderBars(r);
    }

    function statBox(label, value, foot) {
      return '<div class="stat-card"><div class="stat-card__label">' + label + "</div>" +
        '<div class="stat-card__value">' + value + "</div>" +
        '<div class="stat-card__foot">' + foot + "</div></div>";
    }

    function renderBars(r) {
      var scale = r.scale;
      var subjects = data().subjects.filter(function (s) {
        return s.name && Number(s.credits) > 0 && scale.points[s.grade] !== undefined;
      });
      var barsEl = root.querySelector("[data-bars]");
      if (!subjects.length) {
        barsEl.innerHTML = '<p class="muted text-small">Add subjects with a grade to see the chart.</p>';
        return;
      }
      barsEl.innerHTML = '<div class="bars">' + subjects.map(function (s) {
        var pts = scale.points[s.grade];
        var h = (pts / scale.max) * 100;
        return '<div class="bar-col"><span class="bar-col__value">' + pts + "</span>" +
          '<div class="bar-track"><div class="bar" style="height:' + h + '%"></div></div>' +
          '<span class="bar-col__label">' + util.escapeHTML(s.name) + "</span></div>";
      }).join("") + "</div>";
    }

    renderSubjects();
    renderSummary();
  }

  document.addEventListener("synora:ready", initPage);
})();
