/* =========================================================
   Synora — Quick Notes
   A lightweight notes system: create, edit, delete, search.
   Kept deliberately simple — this is "quick notes", not a
   full document editor.

   Note shape: { id, title, body, category, createdAt, updatedAt }
   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  function all() { return store.get("notes"); }
  function get(id) { return all().find(function (n) { return n.id === id; }) || null; }

  function save(note) {
    var list = all();
    var idx = list.findIndex(function (n) { return n.id === note.id; });
    if (idx >= 0) list[idx] = note; else list.push(note);
    store.set("notes", list);
    Synora.refresh();
  }

  function remove(id) {
    store.set("notes", all().filter(function (n) { return n.id !== id; }));
    Synora.refresh();
  }

  function openForm(existing, onDone) {
    var isEdit = !!existing;
    var n = existing || {
      id: util.uid("nte"), title: "", body: "", category: "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };

    var form = document.createElement("form");
    form.className = "stack";
    form.noValidate = true;
    form.innerHTML =
      '<div class="field" data-field="title" style="margin:0">' +
        '<label class="field__label" for="nf-title">Title</label>' +
        '<input class="input" id="nf-title" value="' + util.escapeHTML(n.title) + '" placeholder="Note title" required>' +
        '<p class="field__error"></p></div>' +
      '<div class="field" style="margin:0"><label class="field__label" for="nf-cat">Category</label>' +
        '<input class="input" id="nf-cat" value="' + util.escapeHTML(n.category) + '" placeholder="e.g. Networks (optional)"></div>' +
      '<div class="field" style="margin:0"><label class="field__label" for="nf-body">Note</label>' +
        '<textarea class="input" id="nf-body" style="min-height:140px" placeholder="Capture a thought…">' + util.escapeHTML(n.body) + "</textarea></div>";

    var modal = Synora.openModal({
      title: isEdit ? "Edit note" : "New note",
      content: form,
      footer: [
        { label: "Cancel", variant: "ghost" },
        { label: isEdit ? "Save" : "Add note", variant: "primary", close: false, onClick: submit }
      ]
    });

    function submit() {
      var titleEl = form.querySelector("#nf-title");
      var title = titleEl.value.trim();
      var field = form.querySelector('[data-field="title"]');
      if (!title) {
        field.classList.add("is-invalid");
        field.querySelector(".field__error").textContent = "Give the note a title.";
        titleEl.focus();
        return true;
      }
      n.title = title;
      n.category = form.querySelector("#nf-cat").value.trim();
      n.body = form.querySelector("#nf-body").value;
      n.updatedAt = new Date().toISOString();
      save(n);
      modal.close();
      Synora.toast.success(isEdit ? "Note updated" : "Note added", n.title);
      if (typeof onDone === "function") onDone();
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
  }

  Synora.notes = { all: all, get: get, save: save, remove: remove, openForm: openForm };

  /* ---- Page ---- */

  function initPage() {
    var root = document.querySelector("[data-notes-page]");
    if (!root) return;

    var query = "";
    root.innerHTML =
      '<div class="toolbar"><label class="search"><span class="visually-hidden">Search notes</span>' +
        Synora.icon("search", 16) +
        '<input class="input" type="search" data-search placeholder="Search notes…"></label></div>' +
      '<div data-notes-list></div>';

    var listEl = root.querySelector("[data-notes-list]");
    root.querySelector("[data-search]").addEventListener("input", function (e) {
      query = e.target.value.toLowerCase(); render();
    });

    var addBtn = document.querySelector("[data-add-note]");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null, render); });

    function render() {
      var items = all().slice().sort(function (a, b) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      if (query) {
        items = items.filter(function (n) {
          return (n.title + " " + n.body + " " + (n.category || "")).toLowerCase().indexOf(query) >= 0;
        });
      }

      if (!items.length) {
        listEl.innerHTML = '<div class="empty">' +
          '<span class="empty__icon">' + Synora.icon("note", 26) + "</span>" +
          '<p class="empty__title">' + (query ? "No matching notes" : "Nothing here yet") + "</p>" +
          '<p class="empty__text">' + (query ? "Try a different search." : "Capture a thought before it gets lost.") + "</p>" +
          (query ? "" : '<button class="btn btn--primary" data-empty-add>' + Synora.icon("plus", 16) + "New note</button>") +
          "</div>";
        var cta = listEl.querySelector("[data-empty-add]");
        if (cta) cta.addEventListener("click", function () { openForm(null, render); });
        return;
      }

      listEl.innerHTML = '<div class="notes-grid">' + items.map(noteCard).join("") + "</div>";
    }

    function noteCard(n) {
      var cat = n.category ? '<span class="badge badge--neutral">' + util.escapeHTML(n.category) + "</span>" : "";
      var when = util.formatDate(util.toISODate(new Date(n.updatedAt)));
      return '<article class="note-card" data-note="' + n.id + '">' +
        '<h3 class="note-card__title">' + util.escapeHTML(n.title) + "</h3>" +
        '<p class="note-card__body">' + util.escapeHTML(n.body || "") + "</p>" +
        '<div class="note-card__foot">' + (cat || '<span class="text-small muted">' + when + "</span>") +
          '<span class="note-card__actions">' +
            '<button type="button" class="icon-btn" data-edit="' + n.id + '" aria-label="Edit note">' + Synora.icon("edit", 15) + "</button>" +
            '<button type="button" class="icon-btn" data-del="' + n.id + '" aria-label="Delete note">' + Synora.icon("trash", 15) + "</button>" +
          "</span>" +
        "</div></article>";
    }

    listEl.addEventListener("click", function (e) {
      var edit = e.target.closest("[data-edit]");
      var del = e.target.closest("[data-del]");
      if (edit) { openForm(get(edit.getAttribute("data-edit")), render); return; }
      if (del) {
        var note = get(del.getAttribute("data-del"));
        Synora.confirm({
          title: "Delete note?",
          message: "“" + (note ? note.title : "This note") + "” will be removed.",
          confirmLabel: "Delete", danger: true
        }).then(function (ok) {
          if (ok) { remove(del.getAttribute("data-del")); Synora.toast("Note deleted"); render(); }
        });
      }
    });

    render();
  }

  document.addEventListener("synora:ready", initPage);
})();
