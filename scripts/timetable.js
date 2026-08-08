/* =========================================================
   Synora — Timetable
   A weekly class schedule. Desktop shows a 7-day grid; on
   small screens the CSS stacks each day into its own card.

   Class shape: { id, day, start, end, subject, room, teacher, note }
   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;
  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function all() { return store.get("timetable"); }
  function get(id) { return all().find(function (c) { return c.id === id; }) || null; }
  function save(cls) {
    var list = all();
    var idx = list.findIndex(function (c) { return c.id === cls.id; });
    if (idx >= 0) list[idx] = cls; else list.push(cls);
    store.set("timetable", list);
    Synora.refresh();
  }
  function remove(id) {
    store.set("timetable", all().filter(function (c) { return c.id !== id; }));
    Synora.refresh();
  }

  function openForm(existing, presetDay, onDone) {
    var isEdit = !!existing;
    var c = existing || {
      id: util.uid("cls"), day: presetDay || "Monday", start: "09:00", end: "10:00",
      subject: "", room: "", teacher: "", note: ""
    };

    var form = document.createElement("form");
    form.className = "stack";
    form.noValidate = true;
    form.innerHTML =
      '<div class="field" data-field="subject" style="margin:0"><label class="field__label" for="cf-subject">Subject</label>' +
        '<input class="input" id="cf-subject" value="' + util.escapeHTML(c.subject) + '" placeholder="e.g. Computer Networks" required>' +
        '<p class="field__error"></p></div>' +
      '<div class="form-grid">' +
        '<div class="field" style="margin:0"><label class="field__label" for="cf-day">Day</label>' +
          '<select class="select" id="cf-day">' + DAYS.map(function (d) {
            return '<option' + (d === c.day ? " selected" : "") + ">" + d + "</option>";
          }).join("") + "</select></div>" +
        '<div class="field" style="margin:0"><label class="field__label" for="cf-room">Room</label>' +
          '<input class="input" id="cf-room" value="' + util.escapeHTML(c.room) + '" placeholder="e.g. LT-3"></div>' +
      "</div>" +
      '<div class="form-grid">' +
        '<div class="field" style="margin:0"><label class="field__label" for="cf-start">Start</label>' +
          '<input class="input" type="time" id="cf-start" value="' + util.escapeHTML(c.start) + '"></div>' +
        '<div class="field" style="margin:0"><label class="field__label" for="cf-end">End</label>' +
          '<input class="input" type="time" id="cf-end" value="' + util.escapeHTML(c.end) + '"></div>' +
      "</div>" +
      '<div class="field" style="margin:0"><label class="field__label" for="cf-teacher">Instructor</label>' +
        '<input class="input" id="cf-teacher" value="' + util.escapeHTML(c.teacher) + '" placeholder="Optional"></div>';

    var modal = Synora.openModal({
      title: isEdit ? "Edit class" : "Add class",
      content: form,
      footer: isEdit ? [
        { label: "Delete", variant: "danger", close: false, onClick: function () {
          modal.close();
          Synora.confirm({ title: "Delete class?", message: c.subject + " will be removed.", confirmLabel: "Delete", danger: true })
            .then(function (ok) { if (ok) { remove(c.id); Synora.toast("Class deleted"); if (onDone) onDone(); } });
        }},
        { label: "Save", variant: "primary", close: false, onClick: submit }
      ] : [
        { label: "Cancel", variant: "ghost" },
        { label: "Add class", variant: "primary", close: false, onClick: submit }
      ]
    });

    function submit() {
      var subjEl = form.querySelector("#cf-subject");
      var subject = subjEl.value.trim();
      var field = form.querySelector('[data-field="subject"]');
      if (!subject) {
        field.classList.add("is-invalid");
        field.querySelector(".field__error").textContent = "Enter a subject.";
        subjEl.focus();
        return true;
      }
      c.subject = subject;
      c.day = form.querySelector("#cf-day").value;
      c.room = form.querySelector("#cf-room").value.trim();
      c.start = form.querySelector("#cf-start").value;
      c.end = form.querySelector("#cf-end").value;
      c.teacher = form.querySelector("#cf-teacher").value.trim();
      save(c);
      modal.close();
      Synora.toast.success(isEdit ? "Class updated" : "Class added", c.subject);
      if (onDone) onDone();
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
  }

  function initPage() {
    var root = document.querySelector("[data-timetable-page]");
    if (!root) return;

    var addBtn = document.querySelector("[data-add-class]");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null, null, render); });

    var todayName = DAYS[(new Date().getDay() + 6) % 7]; // JS Sun=0 -> our Mon-first

    function render() {
      var list = all();
      if (!list.length) {
        root.innerHTML = '<div class="card"><div class="empty">' +
          '<span class="empty__icon">' + Synora.icon("clock", 26) + "</span>" +
          '<p class="empty__title">No classes yet</p>' +
          '<p class="empty__text">Add your weekly classes to see your schedule take shape.</p>' +
          '<button class="btn btn--primary" data-empty-add>' + Synora.icon("plus", 16) + "Add a class</button>" +
          "</div></div>";
        root.querySelector("[data-empty-add]").addEventListener("click", function () { openForm(null, null, render); });
        return;
      }

      root.innerHTML = '<div class="tt-grid">' + DAYS.map(function (day) {
        var classes = list.filter(function (c) { return c.day === day; })
          .sort(function (a, b) { return (a.start || "") < (b.start || "") ? -1 : 1; });
        var slots = classes.length ? classes.map(function (c) {
          return '<button type="button" class="tt-slot" data-edit="' + c.id + '">' +
            '<span class="tt-slot__time">' + util.escapeHTML(c.start) + (c.end ? "–" + util.escapeHTML(c.end) : "") + "</span>" +
            '<span class="tt-slot__subject">' + util.escapeHTML(c.subject) + "</span>" +
            (c.room ? '<span class="tt-slot__room">' + util.escapeHTML(c.room) + (c.teacher ? " · " + util.escapeHTML(c.teacher) : "") + "</span>" : "") +
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

  Synora.timetable = { all: all, openForm: openForm };
  document.addEventListener("synora:ready", initPage);
})();
