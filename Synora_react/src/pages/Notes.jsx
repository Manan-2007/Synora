import { useCallback, useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import { useModal, useModalClose } from "../components/modal/ModalProvider.jsx";
import useStore from "../hooks/useStore.js";
import { allNotes, saveNote, removeNote } from "../lib/notes.js";
import { uid, formatDate, toISODate } from "../lib/util.js";
import { toast } from "../lib/toast.js";

/* Quick notes: create, edit, delete, search — "quick notes", not a
   full document editor. */

function NoteForm({ note, isEdit }) {
  const close = useModalClose();
  const titleRef = useRef(null);
  const [title, setTitle] = useState(note.title || "");
  const [category, setCategory] = useState(note.category || "");
  const [body, setBody] = useState(note.body || "");
  const [titleError, setTitleError] = useState("");

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
            <input className="input" id="nf-title" ref={titleRef} value={title} placeholder="Note title" required
              onChange={(e) => setTitle(e.target.value)} />
            <p className="field__error">{titleError}</p>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" htmlFor="nf-cat">Category</label>
            <input className="input" id="nf-cat" value={category} placeholder="e.g. Networks (optional)"
              onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" htmlFor="nf-body">Note</label>
            <textarea className="input" id="nf-body" style={{ minHeight: 140 }} placeholder="Capture a thought…"
              value={body} onChange={(e) => setBody(e.target.value)} />
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
                <article className="note-card" key={n.id}>
                  <h3 className="note-card__title">{n.title}</h3>
                  <p className="note-card__body">{n.body || ""}</p>
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
              <span className="empty__icon"><Icon name="note" size={26} /></span>
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
