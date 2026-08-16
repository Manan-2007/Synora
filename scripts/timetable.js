/* =========================================================
   Synora — Timetable

   A weekly class schedule. Desktop shows a 7-day grid; on
   small screens the CSS stacks each day into its own card.

   An entry is:
     { id, subjectId, day, startTime, endTime, room, teacher }

   It stores the subject's ID, not its name. That means:
     • you pick a subject from a dropdown instead of typing it
       again — no "DBMS" here and "Dbms" in attendance
     • renaming a subject renames it on the timetable too
     • the dashboard can match today's classes to real subjects

   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;
  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function all() { return store.get("timetable"); }
  function get(id) { return all().find(function (c) { return c.id === id; }) || null; }

  function save(entry) {
    var list = all();
    var idx = list.findIndex(function (c) { return c.id === entry.id; });
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    store.set("timetable", list);
    Synora.refresh();
  }

  function remove(id) {
    store.set("timetable", all().filter(function (c) { return c.id !== id; }));
    Synora.refresh();
  }

  /* Times are stored as "HH:MM" strings, which sort correctly as
     text — so comparing them needs no date parsing. */
  function laterThan(a, b) { return a > b; }

  function timeLabel(entry) {
    if (!entry.startTime) return "";
    return entry.startTime + (entry.endTime ? "–" + entry.endTime : "");
  }

  /* =======================================================
     Add / edit one class.
     ======================================================= */

  function openForm(existing, presetDay, onDone) {
    var isEdit = !!existing;
    var subjects = store.subjects.all();

    if (!subjects.length) {
      Synora.toast.error("No subjects yet", "Add your subjects in Settings first.");
      return;
    }

    var c = existing || {
      id: util.uid("cls"),
      subjectId: subjects[0].id,
      day: presetDay || DAYS[(new Date().getDay() + 6) % 7],
      startTime: "09:00",
      endTime: "10:00",
      room: "",
      teacher: ""
    };

    var form = document.createElement("form");
    form.className = "stack";
    form.noValidate = true;
    form.innerHTML =
      '<div class="field" style="margin:0">' +
        '<label class="field__label" for="cf-subject">Subject</label>' +
        '<select class="select" id="cf-subject">' +
          subjects.map(function (s) {
            return '<option value="' + s.id + '"' +
              (s.id === c.subjectId ? " selected" : "") + ">" +
              util.escapeHTML(s.name) + "</option>";
          }).join("") +
        "</select>" +
        '<p class="field__hint">From your subject list — no need to type it again.</p>' +
      "</div>" +

      '<div class="field" style="margin:0">' +
        '<label class="field__label" for="cf-day">Day</label>' +
        '<select class="select" id="cf-day">' +
          DAYS.map(function (d) {
            return '<option value="' + d + '"' + (d === c.day ? " selected" : "") + ">" + d + "</option>";
          }).join("") +
        "</select></div>" +

      '<div class="form-grid" data-field="time">' +
        '<div class="field" style="margin:0"><label class="field__label" for="cf-start">Start time</label>' +
          '<input class="input" type="time" id="cf-start" value="' + util.escapeHTML(c.startTime) + '"></div>' +
        '<div class="field" style="margin:0"><label class="field__label" for="cf-end">End time</label>' +
          '<input class="input" type="time" id="cf-end" value="' + util.escapeHTML(c.endTime) + '"></div>' +
      "</div>" +
      '<p class="field__error" data-time-error style="margin:-8px 0 0"></p>' +

      /* Room and instructor are OPTIONAL EXTRAS, not fields.

         A class needs a subject, a day and a time; most students never
         fill in a room or a lecturer's name, and two permanently empty
         boxes made the form look longer and more demanding than it is.
         They now start as "+ Add" chips — the same idea as adding a
         second phone number to a contact — and a field only exists once
         it has been asked for.

         An extra that already HAS a value is shown open, so editing a
         class never hides something that was previously entered. */
      optionalField("room", "Room", "e.g. LT-2", c.room) +
      optionalField("teacher", "Instructor", "e.g. Dr. Menon", c.teacher) +
      '<div class="tt-extras" data-extras>' + extraButtons(c) + "</div>";

    /* One optional extra: hidden until asked for, removable again.
       The input is always in the DOM so submit() can read it without
       caring whether it is currently on screen. */
    function optionalField(key, label, placeholder, value) {
      var open = !!value;
      return '<div class="field tt-extra" data-extra="' + key + '"' +
               (open ? "" : " hidden") + ' style="margin:0">' +
        '<div class="tt-extra__head">' +
          '<label class="field__label" for="cf-' + key + '" style="margin:0">' + label + "</label>" +
          '<button type="button" class="tt-extra__remove" data-drop="' + key + '">Remove</button>' +
        "</div>" +
        '<input class="input" id="cf-' + key + '" value="' + util.escapeHTML(value || "") +
          '" placeholder="' + placeholder + '">' +
      "</div>";
    }

    /* The "+ Add room" / "+ Add instructor" chips. Only the extras that
       are still closed get a button. */
    function extraButtons(rec) {
      var out = "";
      if (!rec.room) out += '<button type="button" class="tt-extra__add" data-add="room">+ Add room</button>';
      if (!rec.teacher) out += '<button type="button" class="tt-extra__add" data-add="teacher">+ Add instructor</button>';
      return out;
    }

    /* Redraw the chip row from what is currently open on screen, so it
       stays correct however many times extras are added and removed. */
    function refreshExtras() {
      form.querySelector("[data-extras]").innerHTML = extraButtons({
        room: form.querySelector('[data-extra="room"]').hidden ? "" : "x",
        teacher: form.querySelector('[data-extra="teacher"]').hidden ? "" : "x"
      });
    }

    /* Delegated on the form, which survives every redraw of the chips. */
    form.addEventListener("click", function (e) {
      var add = e.target.closest("[data-add]");
      if (add) {
        var key = add.getAttribute("data-add");
        var field = form.querySelector('[data-extra="' + key + '"]');
        field.hidden = false;
        refreshExtras();
        field.querySelector("input").focus();
        return;
      }

      var drop = e.target.closest("[data-drop]");
      if (drop) {
        var k = drop.getAttribute("data-drop");
        var f = form.querySelector('[data-extra="' + k + '"]');
        f.querySelector("input").value = "";     // removing it clears it
        f.hidden = true;
        refreshExtras();
      }
    });

    var modal = Synora.openModal({
      title: isEdit ? "Edit class" : "Add a class",
      content: form,
      footer: isEdit ? [
        { label: "Delete", variant: "danger", close: false, onClick: function () {
          modal.close();
          Synora.confirm({
            title: "Delete this class?",
            message: store.subjects.nameOf(c.subjectId) + " on " + c.day + " will be removed.",
            confirmLabel: "Delete", danger: true
          }).then(function (ok) {
            if (!ok) return;
            remove(c.id);
            Synora.toast("Class deleted");
            if (onDone) onDone();
          });
        }},
        { label: "Save changes", variant: "primary", close: false, onClick: submit }
      ] : [
        { label: "Cancel", variant: "ghost" },
        { label: "Add class", variant: "primary", close: false, onClick: submit }
      ]
    });

    function submit() {
      var start = form.querySelector("#cf-start").value;
      var end = form.querySelector("#cf-end").value;
      var errorEl = form.querySelector("[data-time-error]");
      errorEl.textContent = "";

      if (!start) {
        errorEl.textContent = "Choose a start time.";
        form.querySelector("#cf-start").focus();
        return true;
      }
      if (end && !laterThan(end, start)) {
        errorEl.textContent = "The class has to end after it starts.";
        form.querySelector("#cf-end").focus();
        return true;
      }

      c.subjectId = form.querySelector("#cf-subject").value;
      c.day = form.querySelector("#cf-day").value;
      c.startTime = start;
      c.endTime = end;
      /* A closed extra contributes nothing, even if it once held text. */
      c.room = form.querySelector('[data-extra="room"]').hidden
        ? "" : form.querySelector("#cf-room").value.trim();
      c.teacher = form.querySelector('[data-extra="teacher"]').hidden
        ? "" : form.querySelector("#cf-teacher").value.trim();

      save(c);
      modal.close();
      Synora.toast.success(isEdit ? "Class updated" : "Class added",
        store.subjects.nameOf(c.subjectId) + " · " + c.day + " " + timeLabel(c));
      if (onDone) onDone();
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
  }

  /* =======================================================
     Set Timetable — the guided way in.

     Rather than opening the same one-class dialog over and
     over, this walks the week a day at a time and keeps the
     dialog open, so building a full schedule is one sitting
     instead of twenty separate decisions.
     ======================================================= */

  function openSetup(onDone) {
    var subjects = store.subjects.all();
    if (!subjects.length) {
      Synora.toast.error("No subjects yet", "Add your subjects in Settings first.");
      return;
    }

    var dayIndex = 0;

    var wrap = document.createElement("div");
    wrap.className = "stack";

    var modal = Synora.openModal({
      title: "Set your timetable",
      content: wrap,
      footer: [
        { label: "Previous day", variant: "ghost", close: false, onClick: function () {
          dayIndex = Math.max(0, dayIndex - 1);
          renderDay();
          return true;
        }},
        { label: "Next day", variant: "ghost", close: false, onClick: function () {
          if (dayIndex >= DAYS.length - 1) { modal.close(); return; }
          dayIndex++;
          renderDay();
          return true;
        }},
        { label: "Done", variant: "primary" }
      ]
    });

    function renderDay() {
      var day = DAYS[dayIndex];
      var classes = all()
        .filter(function (c) { return c.day === day; })
        .sort(function (a, b) { return a.startTime < b.startTime ? -1 : 1; });

      wrap.innerHTML =
        '<div class="setup-day">' +
          '<div class="setup-day__head">' +
            "<strong>" + day + "</strong>" +
            '<span class="text-small muted">Day ' + (dayIndex + 1) + " of " + DAYS.length + "</span>" +
          "</div>" +
          (classes.length
            ? '<div class="setup-list">' + classes.map(function (c) {
                return '<div class="setup-row">' +
                  "<time>" + util.escapeHTML(timeLabel(c)) + "</time>" +
                  "<span>" + util.escapeHTML(store.subjects.nameOf(c.subjectId)) +
                    (c.room ? '<span class="muted"> · ' + util.escapeHTML(c.room) + "</span>" : "") + "</span>" +
                  '<button type="button" class="icon-btn" data-remove="' + c.id + '" ' +
                    'aria-label="Remove this class">' + Synora.icon("trash", 15) + "</button>" +
                "</div>";
              }).join("") + "</div>"
            : '<p class="text-small muted setup-empty">No classes on ' + day + " yet.</p>") +
          '<button type="button" class="btn btn--ghost btn--sm" data-add-here>' +
            Synora.icon("plus", 15) + "Add a class on " + day + "</button>" +
        "</div>";

    }

    /* Delegated once, on the wrapper that survives every re-render —
       binding inside renderDay() would stack a new listener each time
       the day changed, and one click would then fire several times. */
    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-add-here]")) {
        openForm(null, DAYS[dayIndex], function () {
          renderDay();
          if (onDone) onDone();
        });
        return;
      }

      var btn = e.target.closest("[data-remove]");
      if (!btn) return;
      remove(btn.getAttribute("data-remove"));
      renderDay();
      if (onDone) onDone();
    });

    renderDay();
  }

  /* =======================================================
     Page.
     ======================================================= */

  function initPage() {
    var root = document.querySelector("[data-timetable-page]");
    if (!root) return;

    var todayName = DAYS[(new Date().getDay() + 6) % 7];   // JS Sun=0 → our Mon-first

    var setupBtn = document.querySelector("[data-set-timetable]");
    if (setupBtn) setupBtn.addEventListener("click", function () { openSetup(render); });

    var addBtn = document.querySelector("[data-add-class]");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null, null, render); });

    function render() {
      var list = all();

      if (!store.subjects.all().length) {
        root.innerHTML = '<div class="card"><div class="empty">' +
          '<span class="empty__icon">' + Synora.icon("clock", 26) + "</span>" +
          '<p class="empty__title">Add your subjects first</p>' +
          '<p class="empty__text">Your timetable is built from your subject list, so there is ' +
            "nothing to pick from yet.</p>" +
          '<a class="btn btn--primary" href="settings.html">Add subjects</a>' +
          "</div></div>";
        return;
      }

      if (!list.length) {
        root.innerHTML = '<div class="card"><div class="empty">' +
          '<span class="empty__icon">' + Synora.icon("clock", 26) + "</span>" +
          '<p class="empty__title">No classes yet</p>' +
          '<p class="empty__text">Walk through the week and add your classes — pick a subject, ' +
            "a day and a time.</p>" +
          '<button class="btn btn--primary" data-empty-setup>Set Timetable</button>' +
          "</div></div>";
        root.querySelector("[data-empty-setup]").addEventListener("click", function () {
          openSetup(render);
        });
        return;
      }

      root.innerHTML = '<div class="tt-grid">' + DAYS.map(function (day) {
        var classes = list
          .filter(function (c) { return c.day === day; })
          .sort(function (a, b) { return (a.startTime || "") < (b.startTime || "") ? -1 : 1; });

        var slots = classes.length ? classes.map(function (c) {
          var name = store.subjects.nameOf(c.subjectId);
          if (!name) return "";     // subject was deleted
          return '<button type="button" class="tt-slot" data-edit="' + c.id + '">' +
            '<span class="tt-slot__time">' + util.escapeHTML(timeLabel(c)) + "</span>" +
            '<span class="tt-slot__subject">' + util.escapeHTML(name) + "</span>" +
            (c.room || c.teacher
              ? '<span class="tt-slot__room">' +
                  util.escapeHTML([c.room, c.teacher].filter(Boolean).join(" · ")) + "</span>"
              : "") +
            "</button>";
        }).join("") : '<span class="tt-day__empty">—</span>';

        return '<div class="tt-day' + (day === todayName ? " tt-day--today" : "") + '">' +
          '<div class="tt-day__name">' + day.slice(0, 3) + "</div>" + slots + "</div>";
      }).join("") + "</div>";
    }

    root.addEventListener("click", function (e) {
      var edit = e.target.closest("[data-edit]");
      if (edit) openForm(get(edit.getAttribute("data-edit")), null, render);
    });

    render();
  }

  Synora.timetable = { all: all, openForm: openForm, openSetup: openSetup };
  document.addEventListener("synora:ready", initPage);
})();
