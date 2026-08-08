/* =========================================================
   Synora — Calendar
   A month view that shares the task system: any task with a
   deadline shows up on its day. Clicking a day lists what's
   due and lets you add a task for that date.

   Depends on: storage.js, app.js, tasks.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;
  var MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function initPage() {
    var root = document.querySelector("[data-calendar-page]");
    if (!root) return;

    var now = new Date();
    var view = { year: now.getFullYear(), month: now.getMonth() };

    root.innerHTML =
      '<div class="card card--pad">' +
        '<div class="cal__head">' +
          '<span class="cal__month" data-cal-title></span>' +
          '<div class="cal__nav">' +
            '<button type="button" class="icon-btn" data-prev aria-label="Previous month">' + Synora.icon("chevronLeft", 18) + "</button>" +
            '<button type="button" class="btn btn--ghost btn--sm" data-today>Today</button>' +
            '<button type="button" class="icon-btn" data-next aria-label="Next month">' + Synora.icon("chevronRight", 18) + "</button>" +
          "</div>" +
        "</div>" +
        '<div class="cal-grid">' + DOW.map(function (d) { return '<span class="cal-dow">' + d + "</span>"; }).join("") + "</div>" +
        '<div class="cal-grid" data-cal-grid style="margin-top:6px"></div>' +
      "</div>";

    root.querySelector("[data-prev]").addEventListener("click", function () { shift(-1); });
    root.querySelector("[data-next]").addEventListener("click", function () { shift(1); });
    root.querySelector("[data-today]").addEventListener("click", function () {
      view.year = now.getFullYear(); view.month = now.getMonth(); render();
    });

    function shift(delta) {
      view.month += delta;
      if (view.month < 0) { view.month = 11; view.year--; }
      if (view.month > 11) { view.month = 0; view.year++; }
      render();
    }

    function tasksByDate() {
      var map = {};
      store.get("tasks").forEach(function (t) {
        if (!t.deadline) return;
        (map[t.deadline] = map[t.deadline] || []).push(t);
      });
      return map;
    }

    function render() {
      root.querySelector("[data-cal-title]").textContent = MONTHS[view.month] + " " + view.year;
      var grid = root.querySelector("[data-cal-grid]");
      var byDate = tasksByDate();
      var todayISO = util.todayISO();

      var firstDay = new Date(view.year, view.month, 1).getDay();
      var daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
      var daysPrev = new Date(view.year, view.month, 0).getDate();
      var cells = [];

      // Leading days from the previous month (muted)
      for (var i = firstDay - 1; i >= 0; i--) cells.push({ day: daysPrev - i, muted: true });
      // This month
      for (var d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false });
      // Trailing days to complete the last week
      while (cells.length % 7 !== 0) cells.push({ day: cells.length - (firstDay + daysInMonth) + 1, muted: true });

      grid.innerHTML = cells.map(function (c) {
        if (c.muted) return '<div class="cal-cell cal-cell--muted"><span class="cal-cell__num">' + c.day + "</span></div>";
        var iso = view.year + "-" + String(view.month + 1).padStart(2, "0") + "-" + String(c.day).padStart(2, "0");
        var items = byDate[iso] || [];
        var isToday = iso === todayISO;
        var chips = items.slice(0, 2).map(function (t) {
          var cls = t.status === "completed" ? "" :
                    t.priority === "critical" ? " cal-chip--critical" :
                    t.priority === "high" ? " cal-chip--high" : "";
          return '<span class="cal-chip' + cls + '">' + util.escapeHTML(t.title) + "</span>";
        }).join("");
        var more = items.length > 2 ? '<span class="cal-cell__more">+' + (items.length - 2) + " more</span>" : "";
        var hasClass = items.length ? " cal-cell--has" : "";
        return '<button type="button" class="cal-cell' + (isToday ? " cal-cell--today" : "") + hasClass + '" data-day="' + iso + '">' +
          '<span class="cal-cell__num">' + c.day + "</span>" + chips + more + "</button>";
      }).join("");
    }

    root.querySelector("[data-cal-grid]").addEventListener("click", function (e) {
      var cell = e.target.closest("[data-day]");
      if (!cell) return;
      openDay(cell.getAttribute("data-day"));
    });

    function openDay(iso) {
      var items = (tasksByDate()[iso] || []).sort(function (a, b) {
        return Synora.tasks.PRIORITY[a.priority].order - Synora.tasks.PRIORITY[b.priority].order;
      });
      var content = document.createElement("div");
      if (items.length) {
        content.innerHTML = '<div class="tlist">' + items.map(function (t) {
          return Synora.tasks.rowHTML(t, { actions: false });
        }).join("") + "</div>";
      } else {
        content.innerHTML = '<p class="muted">Nothing scheduled for this day.</p>';
      }

      var modal = Synora.openModal({
        title: util.formatDate(iso),
        content: content,
        footer: [
          { label: "Close", variant: "ghost" },
          { label: "Add task", variant: "primary", close: false, onClick: function () {
            modal.close();
            var t = { id: util.uid("tsk"), title: "", subject: "", description: "",
              deadline: iso, priority: "medium", status: "not-started",
              createdAt: new Date().toISOString(), completedAt: null };
            Synora.tasks.openForm(t, render);
          }}
        ]
      });

      content.addEventListener("click", function (e) {
        var toggle = e.target.closest("[data-toggle]");
        if (toggle) { Synora.tasks.toggleComplete(toggle.getAttribute("data-toggle")); modal.close(); render(); }
      });
    }

    render();
  }

  document.addEventListener("synora:ready", initPage);
})();
