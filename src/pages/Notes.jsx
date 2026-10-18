import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import Icon from "../components/Icon.jsx";
import Markdown from "../components/Markdown.jsx";
import { useModal, useModalClose } from "../components/modal/ModalProvider.jsx";
import useStore from "../hooks/useStore.js";
import { allNotes, getNote, saveNote, removeNote, toggleNoteTask } from "../lib/notes.js";
import { uid, formatDate, toISODate } from "../lib/util.js";
import { toast } from "../lib/toast.js";
import EmptyArt from "../components/EmptyArt.jsx";

/* Quick notes: create, edit, delete, search — "quick notes", not a
   full document editor. Bodies are Markdown (components/Markdown.jsx);
   checklist boxes tick straight from the card. */

function NoteForm({ note, isEdit }) {
  const close = useModalClose();
  const titleRef = useRef(null);
  const [title, setTitle] = useState(note.title || "");
  const [category, setCategory] = useState(note.category || "");
  const [body, setBody] = useState(note.body || "");
  const [titleError, setTitleError] = useState("");
  const [preview, setPreview] = useState(false);

  function submit() {
    const t = title.trim();
    if (!t) {
      setTitleError("Give the note a title.");
      titleRef.current.focus();
      return;
    }
    const saved = { ...note, title: t, category: category.trim(), body, updatedAt: new Date().toISOString() };
    saveNote(saved);
    close();
    toast.success(isEdit ? "Note updated" : "Note added", saved.title);
  }

  return (
    <>
      <div className="modal__body">
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className={"field" + (titleError ? " is-invalid" : "")} style={{ margin: 0 }}>
            <label className="field__label" htmlFor="nf-title">Title</label>
            <input className="input" id="nf-title" maxLength={200} ref={titleRef} value={title} placeholder="Note title" required
              onChange={(e) => setTitle(e.target.value)} />
            <p className="field__error">{titleError}</p>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" htmlFor="nf-cat">Category</label>
            <input className="input" id="nf-cat" maxLength={60} value={category} placeholder="e.g. Networks (optional)"
              onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <div className="nf-body__head">
              <label className="field__label" htmlFor="nf-body" style={{ margin: 0 }}>Note</label>
              <div className="segmented segmented--sm" role="group" aria-label="Editor view">
                <button type="button" className={preview ? "" : "is-active"} aria-pressed={!preview} onClick={() => setPreview(false)}>Write</button>
                <button type="button" className={preview ? "is-active" : ""} aria-pressed={preview} onClick={() => setPreview(true)}>Preview</button>
              </div>
            </div>
            {preview ? (
              <div className="nf-preview">
                {body.trim() ? <Markdown text={body} /> : <p className="muted text-small" style={{ margin: 0 }}>Nothing to preview yet.</p>}
              </div>
            ) : (
              <textarea className="input" id="nf-body" maxLength={20000} style={{ minHeight: 160 }}
                placeholder={"Capture a thought…\n\n- [ ] a checklist item\n**bold**, *italic*, # heading"}
                value={body} onChange={(e) => setBody(e.target.value)} />
            )}
            <p className="nf-hint">
              Markdown works: <code>**bold**</code> <code>*italic*</code> <code># heading</code> <code>- list</code>{" "}
              <code>- [ ] checklist</code> <code>`code`</code> <code>[link](https://…)</code>
            </p>
          </div>
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={submit}>{isEdit ? "Save" : "Add note"}</button>
      </div>
    </>
  );
}

/* The whole note, rendered; its checklist ticks right here. */
function NoteView({ id, onEdit }) {
  useStore();
  const close = useModalClose();
  const note = getNote(id);
  useEffect(() => { if (!note) close(); }, [note, close]);
  if (!note) return null;
  return (
    <>
      <div className="modal__body">
        <div className="note-view__meta">
          {note.category && <span className="badge badge--neutral">{note.category}</span>}
          <span className="text-small muted">Updated {formatDate(toISODate(new Date(note.updatedAt)))}</span>
        </div>
        {note.body.trim()
          ? <Markdown text={note.body} onToggle={(line) => toggleNoteTask(note.id, line)} className="note-view__body" />
          : <p className="muted">This note has no text yet.</p>}
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Close</button>
        <button type="button" className="btn btn--primary" onClick={() => { close(); onEdit(note); }}>
          <Icon name="edit" size={16} />Edit
        </button>
      </div>
    </>
  );
}

export default function Notes() {
  useStore();
  const modal = useModal();
  const [query, setQuery] = useState("");

  const openForm = useCallback((existing) => {
    const now = new Date().toISOString();
    modal.open({
      title: existing ? "Edit note" : "New note",
      content: <NoteForm isEdit={!!existing}
        note={existing || { id: uid("nte"), title: "", body: "", category: "", createdAt: now, updatedAt: now }} />,
    });
  }, [modal]);

  const openView = useCallback((note) => {
    modal.open({ title: note.title, content: <NoteView id={note.id} onEdit={openForm} /> });
  }, [modal, openForm]);

  /* Links from the ⌘K search: /notes?open=<id> or /notes?new=1 */
  const [params, setParams] = useSearchParams();
  const handledLink = useRef("");
  useEffect(() => {
    const open = params.get("open");
    const isNew = params.get("new");
    if (!open && !isNew) return;
    if (handledLink.current === params.toString()) return;   // once per link, even when effects run twice
    handledLink.current = params.toString();
    setParams({}, { replace: true });
    if (isNew) openForm(null);
    else if (getNote(open)) openView(getNote(open));
  }, [params, setParams, openForm, openView]);

  async function confirmDelete(note) {
    const ok = await modal.confirm({
      title: "Delete note?",
      message: "“" + (note ? note.title : "This note") + "” will be removed.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) {
      removeNote(note.id);
      toast("Note deleted");
    }
  }

  let items = allNotes().slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (query) {
    items = items.filter((n) => (n.title + " " + n.body + " " + (n.category || "")).toLowerCase().indexOf(query) >= 0);
  }

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Jot ideas and lecture notes without breaking your flow.</p>
        <div className="page__actions">
          <button type="button" className="btn btn--primary" onClick={() => openForm(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            New note
          </button>
        </div>
      </div>

      <div>
        <div className="toolbar">
          <label className="search">
            <span className="visually-hidden">Search notes</span>
            <Icon name="search" size={16} />
            <input className="input" type="search" placeholder="Search notes…"
              onChange={(e) => setQuery(e.target.value.toLowerCase())} />
          </label>
        </div>

        <div>
          {items.length ? (
            <div className="notes-grid">
              {items.map((n) => (
                <article className="note-card" key={n.id}
                  onClick={(e) => { if (!e.target.closest("button, a, input, label")) openView(n); }}>
                  <h2 className="note-card__title">
                    <button type="button" className="note-card__open" onClick={() => openView(n)}>{n.title}</button>
                  </h2>
                  {n.body
                    ? <Markdown text={n.body} onToggle={(line) => toggleNoteTask(n.id, line)} className="note-card__body" />
                    : <p className="note-card__body"></p>}
                  <div className="note-card__foot">
                    {n.category
                      ? <span className="badge badge--neutral">{n.category}</span>
                      : <span className="text-small muted">{formatDate(toISODate(new Date(n.updatedAt)))}</span>}
                    <span className="note-card__actions">
                      <button type="button" className="icon-btn" aria-label="Edit note" onClick={() => openForm(n)}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button type="button" className="icon-btn" aria-label="Delete note" onClick={() => confirmDelete(n)}>
                        <Icon name="trash" size={15} />
                      </button>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <EmptyArt name="notes" />
              <p className="empty__title">{query ? "No matching notes" : "Nothing here yet"}</p>
              <p className="empty__text">{query ? "Try a different search." : "Capture a thought before it gets lost."}</p>
              {!query && (
                <button className="btn btn--primary" onClick={() => openForm(null)}>
                  <Icon name="plus" size={16} />New note
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
