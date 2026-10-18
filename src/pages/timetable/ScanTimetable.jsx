import { useCallback, useRef, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { useModal, useModalClose } from "../../components/modal/ModalProvider.jsx";
import { store } from "../../lib/storage.js";
import { api } from "../../lib/api.js";
import { refresh } from "../../lib/engine.js";
import { toast } from "../../lib/toast.js";
import { shrinkImage, FILE_MAX } from "../../lib/files.js";
import { DAYS, allClasses } from "../../lib/timetable.js";
import { uid } from "../../lib/util.js";

/* =========================================================
   Timetable from a photo, screenshot or PDF.

   1. pick or take a picture
   2. the API reads it (Gemini or Claude, server-side) and lists the classes
   3. everything is shown for checking: untick, fix a time, pick the
      right subject, then replace the timetable or add to it.
   Subjects the timetable names but the account doesn't have yet are
   created on save (3 credits, attendance on; editable in Settings).
   ========================================================= */

const NEW = "__new__";

/* A scanned name → an existing subject id, when one clearly matches. */
function matchSubject(name, subjects) {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const exact = subjects.find((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "") === n);
  if (exact) return exact.id;
  const loose = subjects.find((s) => {
    const m = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return m.length >= 3 && n.length >= 3 && (m.includes(n) || n.includes(m));
  });
  return loose ? loose.id : NEW;
}

const ERRORS = {
  401: "Sign in again to scan a timetable.",
  500: "Something went wrong on the server. Please try again.",
  504: "That timetable took too long to read. Try a photo of just one week, cropped close, or a screenshot or PDF.",
  413: "That file is too big: the limit is 3.5 MB.",
  415: "Use a photo (JPG, PNG, WebP) or a PDF.",
  429: "That's a lot of scans today. Try again tomorrow, or add classes by hand.",
  502: "Couldn't read that timetable just now. Try again, or try a clearer photo.",
  503: "Timetable scanning isn't set up on this server yet (it needs a Gemini API key).",
};

/* Why the AI service said no (server/scan.js). */
const REASONS = {
  key: "The scanning service rejected the server's API key. The key in Vercel (GEMINI_API_KEY) needs checking.",
  quota: "The scanning service's limit was reached (the free tier allows a few scans a minute). Wait a minute and try again.",
  model: "The scanning model isn't available for this API key. Set GEMINI_MODEL in Vercel to a model the key can use.",
  slow: "That timetable took too long to read. Try a photo of just one week, cropped close, or a screenshot or PDF.",
};

function ScanDialog() {
  const close = useModalClose();
  const input = useRef(null);
  const [stage, setStage] = useState("pick");      // pick | reading | review
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState(allClasses().length ? "replace" : "add");
  const subjects = store.subjects.all();

  async function choose(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    const ready = f.type === "application/pdf" ? f : await shrinkImage(f, 2000, 0.85, true);
    if (ready.size > FILE_MAX) { setError(ERRORS[413]); return; }
    setFile(ready);
    setPreview(ready.type.startsWith("image/") ? URL.createObjectURL(ready) : null);
  }

  async function read() {
    const token = api.token();
    if (!token) { setError("Scanning needs your account to be connected to the database. Check the status pill at the top."); return; }
    setStage("reading");
    setError("");
    try {
      const q = new URLSearchParams({ type: file.type || "image/jpeg", subjects: subjects.map((s) => s.name).join("\n") });
      const res = await fetch("/api/timetable/scan?" + q, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        const why = res.status === 502 ? ((await res.json().catch(() => ({}))).reason || "") : "";
        throw new Error(REASONS[why] || ERRORS[res.status] || ERRORS[502]);
      }
      const data = await res.json();
      setNote(data.note || "");
      setRows(data.classes.map((c) => ({ ...c, key: uid("scan"), keep: true, subjectId: matchSubject(c.subject, subjects) })));
      setStage("review");
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "You seem to be offline." : err.message);
      setStage("pick");
    }
  }

  const edit = (key, patch) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const kept = rows.filter((r) => r.keep && r.start);

  function save() {
    /* New subjects first: one per distinct new name. */
    const made = {};
    for (const r of kept) {
      if (r.subjectId !== NEW) continue;
      const key = r.subject.trim().toLowerCase();
      if (!made[key]) made[key] = store.subjects.add(r.subject.trim(), 3, true).id;
    }
    const entries = kept.map((r) => ({
      id: uid("cls"), subjectId: r.subjectId === NEW ? made[r.subject.trim().toLowerCase()] : r.subjectId,
      day: r.day, startTime: r.start, endTime: r.end || "", room: r.room || "", teacher: r.teacher || "",
    }));
    store.set("timetable", mode === "replace" ? entries : [...allClasses(), ...entries]);
    refresh();
    close();
    const n = Object.keys(made).length;
    toast.success("Timetable saved", entries.length + " classes" + (n ? ", " + n + " new " + (n === 1 ? "subject" : "subjects") + " (check credits in Settings)" : "") + ".");
  }

  if (stage === "review") {
    const days = new Set(kept.map((r) => r.day)).size;
    return (
      <>
        <div className="modal__body scan">
          {rows.length ? (
            <p className="text-small" style={{ margin: "0 0 12px" }}>
              Found <strong>{rows.length}</strong> classes{days ? " on " + days + " days" : ""}. Check them, untick anything wrong, then save.
            </p>
          ) : (
            <p className="text-small" style={{ margin: 0 }}>No classes found in that picture.{note ? " " + note : ""} Try a clearer photo, or add classes by hand.</p>
          )}
          {note && rows.length > 0 && <p className="text-small muted" style={{ margin: "0 0 12px" }}>{note}</p>}
          <div className="scan__rows">
            {rows.map((r) => (
              <div key={r.key} className={"scan__row" + (r.keep ? "" : " is-off")}>
                <input type="checkbox" checked={r.keep} aria-label={"Keep " + r.subject + " on " + r.day} onChange={(e) => edit(r.key, { keep: e.target.checked })} />
                <select className="select select--sm" aria-label="Subject" value={r.subjectId} onChange={(e) => edit(r.key, { subjectId: e.target.value })}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value={NEW}>New: {r.subject}</option>
                </select>
                <select className="select select--sm" aria-label="Day" value={r.day} onChange={(e) => edit(r.key, { day: e.target.value })}>
                  {DAYS.map((d) => <option key={d} value={d}>{d.slice(0, 3)}</option>)}
                </select>
                <input className="input input--sm" type="time" aria-label="Starts" value={r.start} onChange={(e) => edit(r.key, { start: e.target.value })} />
                <input className="input input--sm" type="time" aria-label="Ends" value={r.end} onChange={(e) => edit(r.key, { end: e.target.value })} />
                <input className="input input--sm" aria-label="Room" placeholder="Room" value={r.room} maxLength={100} onChange={(e) => edit(r.key, { room: e.target.value })} />
              </div>
            ))}
          </div>
          {rows.length > 0 && allClasses().length > 0 && (
            <div className="segmented segmented--sm scan__mode" role="group" aria-label="What to do with your current timetable">
              <button type="button" className={mode === "replace" ? "is-active" : ""} aria-pressed={mode === "replace"} onClick={() => setMode("replace")}>Replace my timetable</button>
              <button type="button" className={mode === "add" ? "is-active" : ""} aria-pressed={mode === "add"} onClick={() => setMode("add")}>Add to it</button>
            </div>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={() => setStage("pick")}>Back</button>
          <button type="button" className="btn btn--primary" disabled={!kept.length} onClick={save}>Save {kept.length} classes</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal__body scan">
        <p className="text-small muted" style={{ marginTop: 0 }}>
          Take a photo of your timetable, or pick a screenshot or PDF. Synora reads it and lists every class for you to check before anything changes.
        </p>
        <input ref={input} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={choose} />
        <button type="button" className="scan__drop" onClick={() => input.current.click()} disabled={stage === "reading"}>
          {preview ? <img src={preview} alt="The chosen timetable" />
            : file ? <span className="scan__file"><Icon name="file" size={28} />{file.name}</span>
            : <><Icon name="camera" size={28} /><strong>Take or choose a photo</strong><span>JPG, PNG, WebP or PDF, up to 3.5 MB</span></>}
        </button>
        {stage === "reading" && <p className="scan__reading" role="status"><span className="scan__spin" />Reading your timetable… this takes about 10–20 seconds.</p>}
        {error && <p className="att__error" role="alert">{error}</p>}
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn btn--primary" disabled={!file || stage === "reading"} onClick={read}>
          <Icon name="sparkle" size={16} />Read timetable
        </button>
      </div>
    </>
  );
}

export function useScanTimetable() {
  const modal = useModal();
  return useCallback(() => modal.open({ title: "Timetable from a photo", size: "lg", content: <ScanDialog /> }), [modal]);
}
