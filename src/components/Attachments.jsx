import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { useModal, useModalClose } from "./modal/ModalProvider.jsx";
import { ACCEPT, canAttach, deleteFile, downloadFile, fileURL, isImage, sizeLabel, uploadFile } from "../lib/files.js";

/* =========================================================
   Files on a task or a note.

   useAttachmentDraft keeps a form's list honest: a file uploaded
   in a dialog that is then cancelled is deleted again, and a file
   removed in the dialog is only deleted from the server once the
   form is saved (so Cancel brings it back).
   ========================================================= */

export function useAttachmentDraft(initial) {
  const [list, setList] = useState(() => initial || []);
  const added = useRef([]);
  const saved = useRef(false);

  useEffect(() => () => {
    if (!saved.current) added.current.forEach((id) => deleteFile(id));
  }, []);

  return {
    list,
    add(meta) { added.current.push(meta.id); setList((l) => [...l, meta]); },
    remove(id) { setList((l) => l.filter((f) => f.id !== id)); },
    /* Call when the form is saved: returns the final list. */
    commit() {
      saved.current = true;
      const keep = new Set(list.map((f) => f.id));
      (initial || []).filter((f) => !keep.has(f.id)).forEach((f) => deleteFile(f.id));
      return list;
    },
  };
}

function Thumb({ file }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let live = true;
    fileURL(file).then((u) => live && setSrc(u)).catch(() => {});
    return () => { live = false; };
  }, [file]);
  return src ? <img src={src} alt="" /> : <span className="att__thumb-wait" />;
}

function ImageView({ file }) {
  const close = useModalClose();
  const [src, setSrc] = useState(null);
  useEffect(() => { fileURL(file).then(setSrc).catch(() => {}); }, [file]);
  return (
    <>
      <div className="modal__body att-view">
        {src ? <img src={src} alt={file.name} /> : <div className="page-loading"><span></span></div>}
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Close</button>
        <button type="button" className="btn btn--primary" onClick={() => downloadFile(file)}>
          <Icon name="download" size={16} />Download
        </button>
      </div>
    </>
  );
}

/* The list of files, with an "Attach" button when `draft` is given. */
export default function Attachments({ owner, files, draft }) {
  const modal = useModal();
  const input = useRef(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const list = draft ? draft.list : files || [];

  function open(f) {
    if (isImage(f)) modal.open({ title: f.name, size: "lg", content: <ImageView file={f} /> });
    else downloadFile(f).catch(() => setError("Couldn't open that file. Check your connection."));
  }

  async function pick(e) {
    const chosen = [...e.target.files];
    e.target.value = "";
    setError("");
    for (const file of chosen) {
      setBusy((n) => n + 1);
      try { draft.add(await uploadFile(file, owner)); }
      catch (err) { setError(err.message); }
      finally { setBusy((n) => n - 1); }
    }
  }

  if (!draft && !list.length) return null;
  return (
    <div className="att">
      {list.length > 0 && (
        <ul className="att__list">
          {list.map((f) => (
            <li key={f.id} className={"att__item" + (isImage(f) ? " att__item--image" : "")}>
              <button type="button" className="att__open" onClick={() => open(f)} aria-label={"Open " + f.name}>
                {isImage(f) ? <Thumb file={f} /> : <span className="att__icon"><Icon name="file" size={18} /></span>}
                <span className="att__meta"><span className="att__name">{f.name}</span><span className="att__size">{sizeLabel(f.size)}</span></span>
              </button>
              {draft && (
                <button type="button" className="icon-btn att__remove" aria-label={"Remove " + f.name} onClick={() => draft.remove(f.id)}>
                  <Icon name="x" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {draft && (canAttach() ? (
        <>
          <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={pick} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current.click()} disabled={busy > 0}>
            <Icon name="paperclip" size={14} />{busy ? "Uploading…" : "Attach photo or file"}
          </button>
        </>
      ) : (
        <p className="text-small muted" style={{ margin: 0 }}>
          Attaching files needs your account to be connected to the database (see the status pill at the top).
        </p>
      ))}
      {error && <p className="field__error att__error" role="alert">{error}</p>}
    </div>
  );
}
