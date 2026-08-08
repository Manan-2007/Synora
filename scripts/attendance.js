/* =========================================================
   Synora — Attendance calculator
   For each subject: percentage attended, and the practical
   question students actually ask —

     • below target: how many classes must I attend in a row
       to reach it?
     • at/above target: how many can I safely miss?

     attendance % = attended / total × 100

   Stored as: attendance = [{id, subject, total, attended, target}]
   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  function all() { return store.get("attendance"); }
  function persist(list) { store.set("attendance", list); Synora.refresh(); }

  /* Core maths for one subject. */
  function analyse(a) {
    var total = Number(a.total) || 0;
    var attended = Number(a.attended) || 0;
    var target = Number(a.target) || 75;
    attended = Math.min(attended, total);          // can't attend more than held
    var pct = total ? (attended / total) * 100 : 0;
    var res = { pct: pct, target: target, total: total, attended: attended, status: "none", message: "" };

    if (!total) { res.message = "Add class counts to see your status."; return res; }

    if (pct >= target) {
      res.status = "safe";
      if (target >= 100) {
        res.canMiss = 0;
        res.message = "Perfect attendance required — don't miss any.";
      } else {
        // (attended)/(total + x) >= target/100  →  x <= attended*100/target - total
        var canMiss = Math.floor((attended * 100) / target - total);
        res.canMiss = Math.max(0, canMiss);
        res.message = res.canMiss === 0
          ? "Right on target — don't miss the next class."
          : "You can miss " + res.canMiss + " more " + plural(res.canMiss, "class") + " and stay above " + target + "%.";
      }
    } else {
      res.status = "danger";
      if (target >= 100) {
        res.message = "Can't reach 100% once a class is missed.";
      } else {
        // (attended + n)/(total + n) >= target/100
        var need = Math.ceil((target * total - 100 * attended) / (100 - target));
        res.need = Math.max(0, need);
        res.message = "Attend " + res.need + " " + plural(res.need, "class") + " in a row to reach " + target + "%.";
      }
    }
    return res;
  }

  function plural(n, w) { return n === 1 ? w : (w.slice(-1) === "s" ? w + "es" : w + "s"); }

  function initPage() {
    var root = document.querySelector("[data-attendance-page]");
    if (!root) return;

    var list = all();
    if (!list.length) {
      var defTarget = Number(store.get("profile").targetAttendance) || 75;
      list = [{ id: util.uid("att"), subject: "", total: "", attended: "", target: defTarget }];
      persist(list);
    }

    root.innerHTML =
      '<div class="card card--pad" data-summary style="margin-bottom:24px"></div>' +
      '<div class="card"><div class="card__header"><span class="card__title">Subjects</span></div>' +
        '<div class="card__body" data-subjects></div>' +
        '<div class="card__body" style="border-top:1px solid var(--color-border);display:flex;gap:12px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn--ghost" data-add>' + Synora.icon("plus", 16) + "Add subject</button>" +
        "</div></div>" +
      '<div class="card" style="margin-top:24px"><div class="card__header"><span class="card__title">Attendance by subject</span></div>' +
        '<div class="card__body" data-bars></div></div>';

    root.querySelector("[data-add]").addEventListener("click", function () {
      var l = all();
      l.push({ id: util.uid("att"), subject: "", total: "", attended: "", target: Number(store.get("profile").targetAttendance) || 75 });
      persist(l); renderSubjects(); renderSummary();
    });

    var subjectsEl = root.querySelector("[data-subjects]");

    function renderSubjects() {
      subjectsEl.innerHTML =
        '<div class="table-wrap"><table class="table"><thead><tr>' +
          '<th>Subject</th><th style="width:90px">Held</th><th style="width:90px">Attended</th>' +
          '<th style="width:90px">Target %</th><th style="width:70px">Now</th><th>Status</th><th style="width:44px"></th>' +
        "</tr></thead><tbody>" +
        all().map(function (a) {
          var r = analyse(a);
          return '<tr data-row="' + a.id + '">' +
            '<td><input class="input input--sm" data-subject value="' + util.escapeHTML(a.subject) + '" placeholder="Subject"></td>' +
            '<td><input class="input input--sm" data-total type="number" min="0" value="' + util.escapeHTML(String(a.total)) + '" placeholder="0"></td>' +
            '<td><input class="input input--sm" data-attended type="number" min="0" value="' + util.escapeHTML(String(a.attended)) + '" placeholder="0"></td>' +
            '<td><input class="input input--sm" data-target type="number" min="0" max="100" value="' + util.escapeHTML(String(a.target)) + '"></td>' +
            '<td data-pct>' + pctBadge(r) + "</td>" +
            '<td class="text-small muted" data-status>' + util.escapeHTML(r.message) + "</td>" +
            '<td><button type="button" class="icon-btn" data-del="' + a.id + '" aria-label="Remove">' + Synora.icon("trash", 15) + "</button></td>" +
          "</tr>";
        }).join("") +
        "</tbody></table></div>";
    }

    function pctBadge(r) {
      if (!r.total) return '<span class="muted">—</span>';
      var cls = r.status === "safe" ? "badge--low" : "badge--high";
      return '<span class="badge ' + cls + '">' + r.pct.toFixed(0) + "%</span>";
    }

    subjectsEl.addEventListener("input", function (e) {
      var row = e.target.closest("[data-row]");
      if (!row) return;
      var l = all();
      var a = l.find(function (x) { return x.id === row.getAttribute("data-row"); });
      if (!a) return;
      if (e.target.matches("[data-subject]")) a.subject = e.target.value;
      if (e.target.matches("[data-total]")) a.total = e.target.value;
      if (e.target.matches("[data-attended]")) a.attended = e.target.value;
      if (e.target.matches("[data-target]")) a.target = e.target.value;
      persist(l);
      // Update just this row's computed cells + summary (keeps input focus).
      var r = analyse(a);
      row.querySelector("[data-pct]").innerHTML = pctBadge(r);
      row.querySelector("[data-status]").textContent = r.message;
      renderSummary();
    });

    subjectsEl.addEventListener("click", function (e) {
      var del = e.target.closest("[data-del]");
      if (!del) return;
      var l = all().filter(function (x) { return x.id !== del.getAttribute("data-del"); });
      if (!l.length) l.push({ id: util.uid("att"), subject: "", total: "", attended: "", target: 75 });
      persist(l); renderSubjects(); renderSummary();
    });

    function renderSummary() {
      var overall = Synora.derive.attendance();
      var val = overall.overall;
      var below = val !== null && val < overall.target;
      var color = val === null ? "var(--color-secondary)" : below ? "var(--status-high)" : "var(--status-low)";
      var r = 46, C = 2 * Math.PI * r;
      var frac = val === null ? 0 : util.clamp(val / 100, 0, 1);
      root.querySelector("[data-summary]").innerHTML =
        '<div style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;justify-content:center">' +
          '<div class="ring-wrap"><svg class="ring" width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">' +
            '<circle class="ring__track" cx="64" cy="64" r="' + r + '" stroke-width="12"></circle>' +
            '<circle class="ring__fill" cx="64" cy="64" r="' + r + '" stroke-width="12" stroke="' + color + '" ' +
              'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - frac)) + '"></circle>' +
          "</svg><span class=\"ring-wrap__center\"><span class=\"ring-wrap__value\">" +
            (val === null ? "—" : val.toFixed(0) + "%") + '</span><span class="ring-wrap__label">overall</span></span></div>' +
          '<div style="flex:1;min-width:220px">' +
            '<p style="font-family:var(--font-heading);font-size:1.1rem;font-weight:700">' +
              (val === null ? "No data yet" : below ? "Below your " + overall.target + "% target" : "On track") + "</p>" +
            '<p class="muted text-small" style="margin-top:4px">' +
              (val === null ? "Add subjects and class counts to begin." :
               below ? "Attend upcoming classes to pull your average back up." :
               "Nice — you're keeping above target across your subjects.") + "</p>" +
          "</div>" +
        "</div>";
      renderBars();
    }

    function renderBars() {
      var subs = all().filter(function (a) { return a.subject && Number(a.total) > 0; });
      var el = root.querySelector("[data-bars]");
      if (!subs.length) { el.innerHTML = '<p class="muted text-small">Add subjects to see the chart.</p>'; return; }
      el.innerHTML = '<div class="bars">' + subs.map(function (a) {
        var r = analyse(a);
        var barCls = r.status === "safe" ? "" : "bar--danger";
        return '<div class="bar-col"><span class="bar-col__value">' + r.pct.toFixed(0) + "%</span>" +
          '<div class="bar-track"><div class="bar ' + barCls + '" style="height:' + util.clamp(r.pct, 0, 100) + '%"></div></div>' +
          '<span class="bar-col__label">' + util.escapeHTML(a.subject) + "</span></div>";
      }).join("") + "</div>";
    }

    renderSubjects();
    renderSummary();
  }

  document.addEventListener("synora:ready", initPage);
})();
