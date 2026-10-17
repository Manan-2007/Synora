import { useCallback, useRef, useState } from "react";
import { useModal, useModalClose } from "../../components/modal/ModalProvider.jsx";
import { store } from "../../lib/storage.js";
import { uid } from "../../lib/util.js";
import { toast } from "../../lib/toast.js";
import { DAYS, todayName, saveClass, removeClass, timeLabel } from "../../lib/timetable.js";

/* Add / edit one class. Returns open(existing, presetDay). */
export function useClassForm() {
  const modal = useModal();
  return useCallback((existing, presetDay) => {
    const subjects = store.subjects.all();
    if (!subjects.length) {
      toast.error("No subjects yet", "Add your subjects in Settings first.");
      return;
    }
    const isEdit = !!existing;
    const entry = existing || {
      id: uid("cls"),
      subjectId: subjects[0].id,
      day: presetDay || todayName(),
      startTime: "09:00",
      endTime: "10:00",
      room: "",
      teacher: "",
    };
    modal.open({
      title: isEdit ? "Edit class" : "Add a class",
      content: <ClassForm entry={entry} isEdit={isEdit} subjects={subjects} confirm={modal.confirm} />,
    });
  }, [modal]);
}

const EXTRAS = [
  { key: "room", label: "Room", placeholder: "e.g. LT-2", addLabel: "+ Add room" },
  { key: "teacher", label: "Instructor", placeholder: "e.g. Dr. Menon", addLabel: "+ Add instructor" },
];

function ClassForm({ entry, isEdit, subjects, confirm }) {
  const close = useModalClose();
  const [values, setValues] = useState({
    subjectId: entry.subjectId,
    day: entry.day,
    startTime: entry.startTime,
    endTime: entry.endTime,
    room: entry.room || "",
    teacher: entry.teacher || "",
  });
  /* Room and instructor are OPTIONAL EXTRAS: each starts as a "+ Add"
     chip and becomes a field only once asked for. One that already has a
     value starts open, so editing never hides something entered before. */
  const [open, setOpen] = useState({ room: !!entry.room, teacher: !!entry.teacher });
  const [timeError, setTimeError] = useState("");
  const startRef = useRef(null);
  const endRef = useRef(null);
  const extraRefs = useRef({});

  const bind = (name) => ({
    value: values[name],
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });

  function addExtra(key) {
    setOpen((o) => ({ ...o, [key]: true }));
    window.setTimeout(() => extraRefs.current[key].focus(), 0);
  }

  function dropExtra(key) {
    setValues((v) => ({ ...v, [key]: "" }));   // removing it clears it
    setOpen((o) => ({ ...o, [key]: false }));
  }

  function submit() {
    setTimeError("");
    if (!values.startTime) {
      setTimeError("Choose a start time.");
      startRef.current.focus();
      return;
    }
    // "HH:MM" strings sort correctly as text.
    if (values.endTime && !(values.endTime > values.startTime)) {
      setTimeError("The class has to end after it starts.");
      endRef.current.focus();
      return;
    }
    const c = {
      ...entry,
      subjectId: values.subjectId,
      day: values.day,
      startTime: values.startTime,
      endTime: values.endTime,
      // A closed extra contributes nothing, even if it once held text.
      room: open.room ? values.room.trim() : "",
      teacher: open.teacher ? values.teacher.trim() : "",
    };
    saveClass(c);
    close();
    toast.success(isEdit ? "Class updated" : "Class added",
      store.subjects.nameOf(c.subjectId) + " · " + c.day + " " + timeLabel(c));
  }

  async function remove() {
    close();
    const ok = await confirm({
      title: "Delete this class?",
      message: store.subjects.nameOf(entry.subjectId) + " on " + entry.day + " will be removed.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    removeClass(entry.id);
    toast("Class deleted");
  }

  return (
    <>
      <div className="modal__body">
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" htmlFor="cf-subject">Subject</label>
            <select className="select" id="cf-subject" {...bind("subjectId")}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <p className="field__hint">From your subject list — no need to type it again.</p>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" htmlFor="cf-day">Day</label>
            <select className="select" id="cf-day" {...bind("day")}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-grid">
            <div className="field" style={{ margin: 0 }}>
              <label className="field__label" htmlFor="cf-start">Start time</label>
              <input className="input" type="time" id="cf-start" ref={startRef} {...bind("startTime")} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field__label" htmlFor="cf-end">End time</label>
              <input className="input" type="time" id="cf-end" ref={endRef} {...bind("endTime")} />
            </div>
          </div>
          <p className={"field__error" + (timeError ? " is-shown" : "")} style={{ margin: "-8px 0 0" }}>{timeError}</p>

          {EXTRAS.map((x) => (
            <div key={x.key} className="field tt-extra" hidden={!open[x.key]} style={{ margin: 0 }}>
              <div className="tt-extra__head">
                <label className="field__label" htmlFor={"cf-" + x.key} style={{ margin: 0 }}>{x.label}</label>
                <button type="button" className="tt-extra__remove" onClick={() => dropExtra(x.key)}>Remove</button>
              </div>
              <input className="input" id={"cf-" + x.key} placeholder={x.placeholder}
                ref={(el) => { extraRefs.current[x.key] = el; }} {...bind(x.key)} />
            </div>
          ))}
          <div className="tt-extras">
            {EXTRAS.filter((x) => !open[x.key]).map((x) => (
              <button key={x.key} type="button" className="tt-extra__add" onClick={() => addExtra(x.key)}>
                {x.addLabel}
              </button>
            ))}
          </div>
        </form>
      </div>
      <div className="modal__footer">
        {isEdit ? (
          <>
            <button type="button" className="btn btn--danger" onClick={remove}>Delete</button>
            <button type="button" className="btn btn--primary" onClick={submit}>Save changes</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={submit}>Add class</button>
          </>
        )}
      </div>
    </>
  );
}
