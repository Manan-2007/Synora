/* =========================================================
   Synora — Tasks
   Two jobs in one file:
     1. Synora.tasks — a small reusable API (add / edit /
        delete / complete / a shared task form) used by both
        this page and the dashboard's quick-add.
     2. If this is the Tasks page, render and wire it.

   Task shape:
     { id, title, subject, description, deadline (YYYY-MM-DD),
       priority: critical|high|medium|low,
       status:   not-started|in-progress|completed,
       createdAt, completedAt }

   Depends on: storage.js, app.js
   ========================================================= */

window.Synora = window.Synora || {};

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  var PRIORITY = {
    critical: { label: "Critical", badge: "badge--critical", order: 0 },
    high:     { label: "High",     badge: "badge--high",     order: 1 },
    medium:   { label: "Medium",   badge: "badge--medium",   order: 2 },
    low:      { label: "Low",      badge: "badge--low",       order: 3 }
  };

  var STATUS = {
    "not-started": { label: "Not started", badge: "badge--neutral" },
    "in-progress": { label: "In progress", badge: "badge--brand" },
    "completed":   { label: "Completed",   badge: "badge--done" }
  };

  /* ---- Data operations ---- */

  function all() { return store.get("tasks"); }
  function get(id) { return all().find(function (t) { return t.id === id; }) || null; }

  function save(task) {
    var list = all();
    var idx = list.findIndex(function (t) { return t.id === task.id; });
    if (idx >= 0) list[idx] = task;
    else list.push(task);
    store.set("tasks", list);
    Synora.refresh();
  }

  function remove(id) {
    store.set("tasks", all().filter(function (t) { return t.id !== id; }));
    Synora.refresh();
  }

  function toggleComplete(id) {
    var list = all();
    var t = list.find(function (x) { return x.id === id; });
    if (!t) return;
    if (t.status === "completed") {
      t.status = "not-started";
      t.completedAt = null;
    } else {
      t.status = "completed";
      t.completedAt = new Date().toISOString();
      Synora.streak.recordCompletion();
    }
    store.set("tasks", list);
    Synora.refresh();
    if (t.status === "completed") Synora.toast.success("Task completed", t.title);
  }

  /* ---- Shared task form (create / edit) ---- */

  function openForm(existing, onDone) {
    var isEdit = !!existing;
    var t = existing || {
      id: util.uid("tsk"), title: "", subject: "", description: "",
      deadline: "", priority: "medium", status: "not-started",
      createdAt: new Date().toISOString(), completedAt: null
    };

    var form = document.createElement("form");
    form.className = "stack";
    form.noValidate = true;
    form.innerHTML =
      '<div class="field" data-field="title" style="margin:0">' +
        '<label class="field__label" for="tf-title">Title</label>' +
        '<input class="input" id="tf-title" value="' + util.escapeHTML(t.title) + '" placeholder="e.g. Finish DBMS assignment" required>' +
        '<p class="field__error"></p>' +
      "</div>" +
      '<div class="form-grid">' +
        '<div class="field" style="margin:0"><label class="field__label" for="tf-subject">Subject</label>' +
          '<input class="input" id="tf-subject" value="' + util.escapeHTML(t.subject) + '" placeholder="e.g. DBMS"></div>' +
        '<div class="field" style="margin:0"><label class="field__label" for="tf-deadline">Deadline</label>' +
          '<input class="input" type="date" id="tf-deadline" value="' + util.escapeHTML(t.deadline || "") + '"></div>' +
      "</div>" +
      '<div class="form-grid">' +
        '<div class="field" style="margin:0"><label class="field__label" for="tf-priority">Priority</label>' +
          '<select class="select" id="tf-priority">' + priorityOptions(t.priority) + "</select></div>" +
        '<div class="field" style="margin:0"><label class="field__label" for="tf-status">Status</label>' +
          '<select class="select" id="tf-status">' + statusOptions(t.status) + "</select></div>" +
      "</div>" +
      '<div class="field" style="margin:0"><label class="field__label" for="tf-desc">Notes</label>' +
        '<textarea class="input" id="tf-desc" placeholder="Optional details">' + util.escapeHTML(t.description) + "</textarea></div>";

    var modal = Synora.openModal({
      title: isEdit ? "Edit task" : "New task",
      content: form,
      footer: [
        { label: "Cancel", variant: "ghost" },
        { label: isEdit ? "Save changes" : "Add task", variant: "primary", close: false, onClick: submit }
      ]
    });

    function submit() {
      var titleEl = form.querySelector("#tf-title");
      var field = form.querySelector('[data-field="title"]');
      var title = titleEl.value.trim();
      if (!title) {
        field.classList.add("is-invalid");
        field.querySelector(".field__error").textContent = "Give the task a title.";
        titleEl.focus();
        return true; // keep modal open
      }
      t.title = title;
      t.subject = form.querySelector("#tf-subject").value.trim();
      t.deadline = form.querySelector("#tf-deadline").value || "";
      t.priority = form.querySelector("#tf-priority").value;
      var newStatus = form.querySelector("#tf-status").value;
      // Keep completedAt consistent with status.
      if (newStatus === "completed" && t.status !== "completed") {
        t.completedAt = new Date().toISOString();
        Synora.streak.recordCompletion();
      } else if (newStatus !== "completed") {
        t.completedAt = null;
      }
      t.status = newStatus;
      t.description = form.querySelector("#tf-desc").value.trim();

      save(t);
      modal.close();
      Synora.toast.success(isEdit ? "Task updated" : "Task added", t.title);
      if (typeof onDone === "function") onDone(t);
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
    return modal;
  }

  function priorityOptions(sel) {
    return Object.keys(PRIORITY).map(function (k) {
      return '<option value="' + k + '"' + (k === sel ? " selected" : "") + ">" + PRIORITY[k].label + "</option>";
    }).join("");
  }
  function statusOptions(sel) {
    return Object.keys(STATUS).map(function (k) {
      return '<option value="' + k + '"' + (k === sel ? " selected" : "") + ">" + STATUS[k].label + "</option>";
    }).join("");
  }

  /* ---- A single task row (reused by dashboard) ---- */

  function rowHTML(t, opts) {
    opts = opts || {};
    var done = t.status === "completed";
    var meta = [];
    if (t.subject) meta.push('<span class="badge badge--neutral">' + util.escapeHTML(t.subject) + "</span>");
    var p = PRIORITY[t.priority] || PRIORITY.medium;
    meta.push('<span class="badge ' + p.badge + '"><span class="badge__dot"></span>' + p.label + "</span>");
    if (t.deadline && !done) {
      var days = util.daysUntil(t.deadline);
      var cls = days < 0 ? "due-over" : days <= 1 ? "due-soon" : "";
      meta.push('<span class="' + cls + '">' + util.relativeDay(t.deadline) + "</span>");
    }
    if (done && t.completedAt) meta.push("<span>Done</span>");

    var actions = opts.actions === false ? "" :
      '<span class="titem__actions">' +
        '<button type="button" class="icon-btn" data-edit="' + t.id + '" aria-label="Edit task">' + Synora.icon("edit", 15) + "</button>" +
        '<button type="button" class="icon-btn" data-del="' + t.id + '" aria-label="Delete task">' + Synora.icon("trash", 15) + "</button>" +
      "</span>";

    return '<div class="titem' + (done ? " is-done" : "") + '" data-task="' + t.id + '">' +
      '<button type="button" class="tcheck" data-toggle="' + t.id + '" aria-label="Toggle complete" aria-pressed="' + done + '">' + Synora.icon("check", 12) + "</button>" +
      '<span class="titem__main">' +
        '<span class="titem__title">' + util.escapeHTML(t.title) + "</span>" +
        '<span class="titem__meta">' + meta.join("") + "</span>" +
      "</span>" + actions + "</div>";
  }

  /* Wire the toggle/edit/delete buttons within a container using
     event delegation, then call rerender() after any change. */
  function wireList(container, rerender) {
    container.addEventListener("click", function (e) {
      var toggle = e.target.closest("[data-toggle]");
      var edit = e.target.closest("[data-edit]");
      var del = e.target.closest("[data-del]");
      if (toggle) { toggleComplete(toggle.getAttribute("data-toggle")); rerender(); }
      else if (edit) { openForm(get(edit.getAttribute("data-edit")), rerender); }
      else if (del) {
        var task = get(del.getAttribute("data-del"));
        Synora.confirm({
          title: "Delete task?",
          message: "“" + (task ? task.title : "This task") + "” will be removed. This can't be undone.",
          confirmLabel: "Delete", danger: true
        }).then(function (ok) {
          if (ok) { remove(del.getAttribute("data-del")); Synora.toast("Task deleted"); rerender(); }
        });
      }
    });
  }

  Synora.tasks = {
    PRIORITY: PRIORITY, STATUS: STATUS,
    all: all, get: get, save: save, remove: remove,
    toggleComplete: toggleComplete, openForm: openForm,
    rowHTML: rowHTML, wireList: wireList
  };

  /* =======================================================
     Tasks PAGE (only runs on tasks.html).
     ======================================================= */

  function initPage() {
    var root = document.querySelector("[data-tasks-page]");
    if (!root) return;

    var state = { view: "all", sort: "deadline", query: "" };

    root.innerHTML =
      '<div class="toolbar">' +
        '<label class="search"><span class="visually-hidden">Search tasks</span>' +
          Synora.icon("search", 16) +
          '<input class="input" type="search" data-search placeholder="Search tasks…"></label>' +
        '<select class="select select--sm" data-sort style="flex:0 0 auto;width:auto">' +
          '<option value="deadline">Sort: Deadline</option>' +
          '<option value="priority">Sort: Priority</option>' +
          '<option value="created">Sort: Newest</option>' +
        "</select>" +
      "</div>" +
      '<div class="segmented" role="tablist" data-views style="margin-bottom:16px">' +
        ["all", "today", "upcoming", "overdue", "completed"].map(function (v) {
          return '<button role="tab" data-view="' + v + '"' + (v === "all" ? ' class="is-active"' : "") + ">" +
            v.charAt(0).toUpperCase() + v.slice(1) + "</button>";
        }).join("") +
      "</div>" +
      '<div class="card"><div class="card__body" data-list style="padding:8px 24px"></div></div>';

    var listEl = root.querySelector("[data-list]");

    root.querySelector("[data-search]").addEventListener("input", function (e) {
      state.query = e.target.value.toLowerCase(); render();
    });
    root.querySelector("[data-sort]").addEventListener("change", function (e) {
      state.sort = e.target.value; render();
    });
    root.querySelector("[data-views]").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-view]");
      if (!btn) return;
      state.view = btn.getAttribute("data-view");
      root.querySelectorAll("[data-view]").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      render();
    });

    wireList(listEl, render);

    // "New task" button lives in the page header (built in HTML).
    var addBtn = document.querySelector("[data-add-task]");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null, render); });

    function filtered() {
      var items = all().slice();
      if (state.query) {
        items = items.filter(function (t) {
          return (t.title + " " + (t.subject || "")).toLowerCase().indexOf(state.query) >= 0;
        });
      }
      items = items.filter(function (t) {
        var days = t.deadline ? util.daysUntil(t.deadline) : null;
        switch (state.view) {
          case "today": return t.status !== "completed" && days === 0;
          case "upcoming": return t.status !== "completed" && days !== null && days > 0;
          case "overdue": return t.status !== "completed" && days !== null && days < 0;
          case "completed": return t.status === "completed";
          default: return true;
        }
      });
      items.sort(function (a, b) {
        if (state.sort === "priority") return PRIORITY[a.priority].order - PRIORITY[b.priority].order;
        if (state.sort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
        // deadline: tasks without a deadline sink to the bottom
        var da = a.deadline || "9999", db = b.deadline || "9999";
        return da < db ? -1 : da > db ? 1 : 0;
      });
      return items;
    }

    function render() {
      var items = filtered();
      if (!items.length) {
        listEl.innerHTML = emptyState(state.view);
        var cta = listEl.querySelector("[data-empty-add]");
        if (cta) cta.addEventListener("click", function () { openForm(null, render); });
        return;
      }
      listEl.innerHTML = '<div class="tlist">' + items.map(function (t) { return rowHTML(t); }).join("") + "</div>";
    }

    function emptyState(view) {
      var msg = {
        all: ["No tasks yet", "Add your first task and get your day organized."],
        today: ["Nothing due today", "Enjoy the breathing room — or plan ahead."],
        upcoming: ["Nothing upcoming", "Add a task with a deadline to see it here."],
        overdue: ["No overdue tasks", "You're on top of everything. Nice."],
        completed: ["Nothing completed yet", "Finished tasks will collect here."]
      }[view] || ["Nothing here", ""];
      var showAdd = view === "all";
      return '<div class="empty">' +
        '<span class="empty__icon">' + Synora.icon("check", 26) + "</span>" +
        '<p class="empty__title">' + msg[0] + "</p>" +
        '<p class="empty__text">' + msg[1] + "</p>" +
        (showAdd ? '<button class="btn btn--primary" data-empty-add>' + Synora.icon("plus", 16) + "Add a task</button>" : "") +
        "</div>";
    }

    render();
  }

  document.addEventListener("synora:ready", initPage);
})();
