/* =========================================================
   Synora — Dashboard
   The command centre. Reads from every module and answers:
   who am I, what's due today, what's overdue, what's next,
   and how am I doing academically.

   Depends on: storage.js, app.js, tasks.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  /* A donut chart from weighted segments. Colours are CSS vars. */
  function donut(segments) {
    var total = segments.reduce(function (s, x) { return s + x.value; }, 0);
    var r = 52, cx = 66, cy = 66, C = 2 * Math.PI * r, sw = 16;
    var acc = 0;
    var arcs = segments.map(function (seg) {
      if (!seg.value || !total) return "";
      var frac = seg.value / total;
      var len = frac * C;
      var rot = (acc / total) * 360 - 90;
      acc += seg.value;
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + seg.color +
        '" stroke-width="' + sw + '" stroke-dasharray="' + len + " " + (C - len) +
        '" transform="rotate(' + rot + " " + cx + " " + cy + ')"></circle>';
    }).join("");
    var track = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--color-surface-sunken)" stroke-width="' + sw + '"></circle>';
    var pct = total ? Math.round((segments[0].value / total) * 100) : 0;
    return '<div class="ring-wrap">' +
        '<svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">' + track + arcs + "</svg>" +
        '<span class="ring-wrap__center"><span class="ring-wrap__value">' + pct + '%</span>' +
        '<span class="ring-wrap__label">done</span></span>' +
      "</div>";
  }

  function miniCalendar() {
    var now = new Date();
    var year = now.getFullYear(), month = now.getMonth();
    var first = new Date(year, month, 1);
    var startDay = first.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayNum = now.getDate();

    // Days that have a task deadline this month.
    var marked = {};
    store.get("tasks").forEach(function (t) {
      if (!t.deadline || t.status === "completed") return;
      var d = util.parseISODate(t.deadline);
      if (d && d.getFullYear() === year && d.getMonth() === month) marked[d.getDate()] = true;
    });

    var dows = ["S", "M", "T", "W", "T", "F", "S"];
    var html = '<div class="mini-cal">';
    dows.forEach(function (d) { html += '<span class="mini-cal__dow">' + d + "</span>"; });
    for (var i = 0; i < startDay; i++) html += "<span></span>";
    for (var day = 1; day <= daysInMonth; day++) {
      var cls = "mini-cal__day";
      if (day === todayNum) cls += " mini-cal__day--today";
      if (marked[day]) cls += " mini-cal__day--has";
      html += '<span class="' + cls + '">' + day + "</span>";
    }
    html += "</div>";
    return html;
  }

  function statCard(label, iconName, value, foot, valueClass) {
    return '<div class="stat-card">' +
      '<div class="stat-card__label">' + Synora.icon(iconName, 16) + label + "</div>" +
      '<div class="stat-card__value ' + (valueClass || "") + '">' + value + "</div>" +
      (foot ? '<div class="stat-card__foot">' + foot + "</div>" : "") +
      "</div>";
  }

  function render() {
    var root = document.querySelector("[data-dashboard]");
    if (!root) return;

    var profile = Synora.profile.get();
    var name = profile.firstName || profile.username || "there";
    var stats = Synora.derive.taskStats();
    var streak = Synora.streak.current();
    var classes = Synora.derive.todaysClasses();
    var upcoming = Synora.derive.upcomingDeadlines(5);
    var att = Synora.derive.attendance();
    var cgpa = Synora.derive.cgpa();

    var todayTasks = Synora.tasks.all().filter(function (t) {
      if (t.status === "completed") return false;
      var days = t.deadline ? util.daysUntil(t.deadline) : null;
      return days !== null && days <= 0;   // due today or overdue
    }).sort(function (a, b) { return (a.deadline || "") < (b.deadline || "") ? -1 : 1; });
    if (!todayTasks.length) {
      // fall back to the nearest upcoming tasks so the card isn't empty
      todayTasks = Synora.tasks.all().filter(function (t) { return t.status !== "completed"; })
        .sort(function (a, b) { return (a.deadline || "9999") < (b.deadline || "9999") ? -1 : 1; })
        .slice(0, 4);
    }

    var remaining = Math.max(0, stats.pending - stats.overdue);
    var pie = donut([
      { value: stats.completed, color: "var(--color-brand)" },
      { value: remaining, color: "var(--color-accent-bright)" },
      { value: stats.overdue, color: "var(--status-high)" }
    ]);

    var html = "";

    /* Unfinished setup is OFFERED here, not enforced by a redirect.

       The dashboard used to be unreachable until Personalize Synora was
       finished, which made "Go to dashboard" and "Skip for now" into
       buttons that bounced straight back. The guard is gone; this card
       takes its place — visible, dismissable by simply finishing, and
       gone the moment setup completes. */
    if (!profile.onboarded) {
      html += '<div class="card card--pad dash-setup">' +
          "<div>" +
            '<p class="dash-setup__title">Finish setting up your workspace</p>' +
            '<p class="dash-setup__text muted text-small">' +
              "Add your subjects, credits and attendance target and the pages below " +
              "start filling themselves in. It takes about a minute, and you can " +
              "leave halfway — your answers are kept." +
            "</p>" +
          "</div>" +
          '<a class="btn btn--primary" href="onboarding.html">Personalize Synora</a>' +
        "</div>";
    }

    /* Greeting hero — the first thing the dashboard says should be
       who this workspace belongs to, using what onboarding collected. */
    var course = [profile.program, profile.semester ? "Semester " + profile.semester : ""]
      .filter(Boolean).join(" · ");

    html += '<div class="dash-hero">' +
        Synora.avatarHTML(52, "avatar--lg") +
        "<div>" +
          '<div class="dash-hero__greet">' + greeting() + ", " + util.escapeHTML(name) + "</div>" +
          (course ? '<div class="dash-hero__course">' + util.escapeHTML(course) + "</div>" : "") +
          '<div class="dash-hero__sub">' + heroSub(stats) + "</div>" +
        "</div>" +
        '<div class="dash-hero__streak">' +
          '<span class="pill">' + Synora.icon("flame", 14) + "<strong>" + streak + '</strong> day streak</span>' +
        "</div>" +
      "</div>";

    /* Stat cards */
    html += '<div class="stat-grid" style="margin-top:24px">' +
      statCard("Total tasks", "check", stats.total, stats.completed + " completed") +
      statCard("Due today", "clock", stats.dueToday, "needs attention", stats.dueToday ? "stat-card__value--brand" : "") +
      statCard("Overdue", "alert", stats.overdue, stats.overdue ? "past deadline" : "all clear", stats.overdue ? "stat-card__value--accent" : "") +
      statCard("Upcoming", "calendar", stats.upcoming, "later this week") +
      "</div>";

    /* Two columns */
    html += '<div class="dash-cols" style="margin-top:24px">';

    /* ---- Left column ---- */
    html += '<div class="stack">';

    // Today's tasks
    html += '<div class="card"><div class="card__header">' +
        '<span class="card__title">Today’s tasks</span>' +
        '<a class="card__link" href="tasks.html">View all</a>' +
      '</div><div class="card__body" data-today-tasks style="padding:8px 24px">';
    if (todayTasks.length) {
      html += '<div class="tlist">' + todayTasks.map(function (t) { return Synora.tasks.rowHTML(t, { actions: false }); }).join("") + "</div>";
    } else {
      html += '<div class="empty" style="padding:32px 0"><span class="empty__icon">' + Synora.icon("check", 24) +
        '</span><p class="empty__title">Nothing due</p><p class="empty__text">Add a task to get your day organized.</p></div>';
    }
    html += "</div></div>";

    // Today's schedule
    html += '<div class="card"><div class="card__header">' +
        '<span class="card__title">Today’s schedule</span>' +
        '<a class="card__link" href="timetable.html">Timetable</a>' +
      '</div><div class="card__body">';
    if (classes.length) {
      html += '<div class="agenda-list">' + classes.map(function (c) {
        return '<div class="agenda-row"><time>' + util.escapeHTML(c.start || "") + "</time>" +
          '<span><span class="agenda-row__subject">' + util.escapeHTML(c.subject) + "</span>" +
          (c.room ? '<span class="agenda-row__room"> · ' + util.escapeHTML(c.room) + "</span>" : "") + "</span></div>";
      }).join("") + "</div>";
    } else {
      html += '<p class="muted text-small">No classes scheduled for today.</p>';
    }
    html += "</div></div>";

    // Quick actions
    html += '<div class="card"><div class="card__header"><span class="card__title">Quick actions</span></div>' +
      '<div class="card__body"><div class="quick-actions">' +
        quickAction("Add task", "plus", null, "task") +
        quickAction("Add note", "note", "notes.html") +
        quickAction("Calendar", "calendar", "calendar.html") +
        quickAction("Attendance", "users", "attendance.html") +
        quickAction("CGPA", "chart", "cgpa.html") +
        quickAction("Timetable", "clock", "timetable.html") +
      "</div></div></div>";

    html += "</div>"; // end left

    /* ---- Right column ---- */
    html += '<div class="stack">';

    // Progress
    html += '<div class="card"><div class="card__header"><span class="card__title">Progress</span></div>' +
      '<div class="card__body" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;justify-content:center">' +
        pie +
        '<ul class="legend">' +
          legendRow("var(--color-brand)", "Completed", stats.completed) +
          legendRow("var(--color-accent-bright)", "Pending", remaining) +
          legendRow("var(--status-high)", "Overdue", stats.overdue) +
        "</ul>" +
      "</div></div>";

    // Mini calendar
    html += '<div class="card"><div class="card__header">' +
        '<span class="card__title">' + new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }) + "</span>" +
        '<a class="card__link" href="calendar.html">Open</a>' +
      '</div><div class="card__body">' + miniCalendar() + "</div></div>";

    // Upcoming deadlines
    html += '<div class="card"><div class="card__header"><span class="card__title">Upcoming deadlines</span></div>' +
      '<div class="card__body">';
    if (upcoming.length) {
      html += '<div class="stack" style="gap:12px">' + upcoming.map(function (t) {
        var days = util.daysUntil(t.deadline);
        var cls = days < 0 ? "due-over" : days <= 1 ? "due-soon" : "muted";
        return '<div class="row" style="justify-content:space-between;gap:12px">' +
          '<span class="text-small">' + util.escapeHTML(t.title) + "</span>" +
          '<span class="text-small ' + cls + '" style="white-space:nowrap">' + util.relativeDay(t.deadline) + "</span></div>";
      }).join("") + "</div>";
    } else {
      html += '<p class="muted text-small">No deadlines coming up.</p>';
    }
    html += "</div></div>";

    // Academic snapshot
    html += '<div class="card"><div class="card__header"><span class="card__title">Academic snapshot</span></div>' +
      '<div class="card__body stack" style="gap:16px">';
    // attendance
    if (att.overall !== null) {
      var below = att.overall < att.target;
      var mcls = below ? "meter__fill--danger" : "";
      html += "<div><div class=\"row\" style=\"justify-content:space-between\"><span class=\"text-small muted\">Attendance</span>" +
        '<span class="text-small" style="font-weight:600">' + att.overall.toFixed(0) + "%</span></div>" +
        '<div class="meter" style="margin-top:6px"><span class="meter__fill ' + mcls + '" style="width:' + util.clamp(att.overall, 0, 100) + '%"></span></div></div>';
    } else {
      html += '<div class="row" style="justify-content:space-between"><span class="text-small muted">Attendance</span><a class="card__link" href="attendance.html">Add subjects</a></div>';
    }
    // cgpa
    if (cgpa) {
      html += '<div class="row" style="justify-content:space-between"><span class="text-small muted">CGPA</span>' +
        '<span style="font-family:var(--font-heading);font-weight:700;font-size:1.1rem">' + cgpa.value.toFixed(2) +
        '<span class="muted" style="font-size:.8rem;font-weight:500"> / ' + cgpa.max + "</span></span></div>";
    } else {
      html += '<div class="row" style="justify-content:space-between"><span class="text-small muted">CGPA</span><a class="card__link" href="cgpa.html">Calculate</a></div>';
    }
    html += "</div></div>";

    html += "</div>"; // end right
    html += "</div>"; // end cols

    root.innerHTML = html;
    wire(root);
  }

  function heroSub(stats) {
    if (stats.overdue > 0) return "You have " + stats.overdue + " overdue " + plural(stats.overdue, "task") + " to clear.";
    if (stats.dueToday > 0) return stats.dueToday + " " + plural(stats.dueToday, "task") + " due today. You've got this.";
    if (stats.pending > 0) return stats.pending + " " + plural(stats.pending, "task") + " on your plate. Nothing overdue.";
    return "Your list is clear. A good time to plan ahead.";
  }
  function plural(n, w) { return n === 1 ? w : w + "s"; }

  function legendRow(color, label, count) {
    return "<li><span class=\"legend__swatch\" style=\"background:" + color + "\"></span>" +
      label + ' <span class="muted" style="margin-left:auto;font-weight:600">' + count + "</span></li>";
  }

  function quickAction(label, iconName, href, action) {
    var tag = href ? "a" : "button";
    var attrs = href ? 'href="' + href + '"' : 'type="button" data-qa="' + action + '"';
    return "<" + tag + ' class="quick-action" ' + attrs + ">" +
      '<span class="quick-action__icon">' + Synora.icon(iconName, 18) + "</span>" +
      '<span class="quick-action__label">' + label + "</span></" + tag + ">";
  }

  function wire(root) {
    // Quick-add task
    var qaTask = root.querySelector('[data-qa="task"]');
    if (qaTask) qaTask.addEventListener("click", function () { Synora.tasks.openForm(null, render); });

    // Today's task toggles (no edit/delete here — view-only rows)
    var todayList = root.querySelector("[data-today-tasks]");
    if (todayList) {
      todayList.addEventListener("click", function (e) {
        var toggle = e.target.closest("[data-toggle]");
        if (toggle) { Synora.tasks.toggleComplete(toggle.getAttribute("data-toggle")); render(); }
      });
    }
  }

  function hideLoader() {
    var loader = document.getElementById("app-loader");
    if (!loader) return;
    loader.classList.add("is-hidden");
    window.setTimeout(function () { loader.remove(); }, 400);
  }

  document.addEventListener("synora:ready", function () {
    render();
    hideLoader();
  });
})();
