import AvatarPicker from "../../components/AvatarPicker.jsx";
import { AvatarArt } from "../../components/AvatarArt.jsx";

const PROGRAMS = [
  "B.E CSE AIML", "B.E CSE", "B.E CSE (Data Science)", "B.E ECE",
  "B.E Mechanical", "B.E Civil", "B.Tech IT", "B.Sc Computer Science",
  "BCA", "MCA", "B.Com", "BBA",
];

const SEMESTERS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

/* The heading takes focus when a step opens, so keyboard and screen-reader
   users land on the new step. */
function StepHead({ title, sub, headingRef }) {
  return (
    <>
      <h2 className="ob-card__title" tabIndex="-1" ref={headingRef}>{title}</h2>
      {sub && <p className="ob-card__sub">{sub}</p>}
    </>
  );
}

/* ---- 1. Avatar ---- */

export function AvatarStep({ draft, update, person, headingRef }) {
  return (
    <>
      <StepHead headingRef={headingRef} title="Choose your avatar"
        sub="It shows up in your sidebar and on your dashboard. Pick an illustration, or use your initials." />
      <AvatarPicker className="ob-fieldset" name="avatar-choice" artSize={72}
        value={draft.avatar} initials={person.initials}
        note="Taken from your first and last name — change your name in Settings and this follows it."
        onChange={(avatar) => update({ avatar })} />
      <div className="ob-preview">
        <span className="ob-preview__label">Selected</span>
        <span className="ob-preview__art"><AvatarArt avatar={draft.avatar} size={72} initials={person.initials} /></span>
        <span className="ob-preview__name">{person.fullName || person.username}</span>
      </div>
    </>
  );
}

/* ---- 2. Academic ---- */

export function AcademicStep({ draft, update, headingRef }) {
  return (
    <>
      <StepHead headingRef={headingRef} title="Your course"
        sub="This is what your dashboard greets you with, and it keeps your grades in the right context." />
      <div className="ob-fields">
        <div className="field">
          <label className="field__label" htmlFor="ob-program">What program are you in?</label>
          <input className="input" id="ob-program" maxLength={120} list="ob-programs" placeholder="e.g. B.E CSE AIML"
            autoComplete="off" value={draft.program} onChange={(e) => update({ program: e.target.value })} />
          <datalist id="ob-programs">
            {PROGRAMS.map((p) => <option key={p} value={p}></option>)}
          </datalist>
          <p className="field__hint">Pick one from the list or type your own.</p>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ob-semester">Which semester are you in?</label>
          <select className="select" id="ob-semester" value={draft.semester}
            onChange={(e) => update({ semester: e.target.value })}>
            <option value="">Choose a semester</option>
            {SEMESTERS.map((s, i) => <option key={s} value={String(i + 1)}>{s}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}

/* ---- 3. Subjects, credits and attendance tracking ----
   The list built here is the source of truth for attendance, CGPA and the
   timetable. Each subject also answers "record attendance?" — saying no
   affects attendance ONLY; credits and grades still count towards CGPA. */

export function SubjectsStep({ draft, onSubjectChange, onAdd, onRemove, headingRef }) {
  return (
    <>
      <StepHead headingRef={headingRef} title="Add your subjects"
        sub="Attendance, CGPA and your timetable all read from this list — add them once here and pick them from a dropdown everywhere else." />
      {/* Enter inside the list adds the next row rather than doing nothing. */}
      <div className="ob-subjects"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}>
        {draft.subjects.length ? draft.subjects.map((s, i) => (
          <SubjectRow key={s.id} subject={s} n={i + 1} onChange={onSubjectChange} onRemove={onRemove} />
        )) : (
          <p className="ob-empty">No subjects yet. Add your first one below.</p>
        )}
      </div>
      <button type="button" className="btn btn--ghost btn--sm ob-add" onClick={onAdd}>+ Add subject</button>
    </>
  );
}

function SubjectRow({ subject: s, n, onChange, onRemove }) {
  const trackOption = (value, label) => (
    <label className={"ob-track__option" + (s.trackAttendance === value ? " is-selected" : "")}>
      <input type="radio" name={"track-" + s.id} value={value ? "yes" : "no"}
        checked={s.trackAttendance === value} onChange={() => onChange(s.id, { trackAttendance: value })} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="ob-subject">
      <div className="ob-subject__main">
        <div className="ob-subject__field">
          <label className="ob-subject__label" htmlFor={"ob-sub-" + s.id}>{"Subject " + n}</label>
          <input className="input input--sm" id={"ob-sub-" + s.id} maxLength={100} data-sub-name value={s.name}
            placeholder="e.g. DBMS" onChange={(e) => onChange(s.id, { name: e.target.value })} />
        </div>
        <div className="ob-subject__field ob-subject__field--credits">
          <label className="ob-subject__label" htmlFor={"ob-cr-" + s.id}>Credits</label>
          <input className="input input--sm" id={"ob-cr-" + s.id} type="number" min="0" max="20" step="1"
            value={s.credits} placeholder="4"
            onChange={(e) => onChange(s.id, { credits: e.target.value === "" ? "" : Number(e.target.value) || 0 })} />
        </div>
        <button type="button" className="icon-btn ob-subject__remove"
          aria-label={"Remove " + (s.name || "subject " + n)} onClick={() => onRemove(s.id)}>×</button>
      </div>

      <fieldset className="ob-track">
        <legend className="ob-track__legend">Record attendance for this subject?</legend>
        <div className="ob-track__options">
          {trackOption(true, "Yes")}
          {trackOption(false, "No")}
        </div>
      </fieldset>
    </div>
  );
}

/* ---- 4. Attendance goal ---- */

export function AttendanceStep({ draft, update, headingRef }) {
  const tracked = draft.subjects.filter((s) => s.name && s.trackAttendance).length;
  return (
    <>
      <StepHead headingRef={headingRef} title="What's your target attendance?"
        sub="Synora warns you when a subject slips below this, and works out how many classes you can still afford to miss." />
      <div className="ob-target">
        <output className="ob-target__value">{draft.targetAttendance + "%"}</output>
        <label className="visually-hidden" htmlFor="ob-target">Target attendance percentage</label>
        <input className="ob-target__range" type="range" id="ob-target" min="50" max="100" step="1"
          value={draft.targetAttendance} onChange={(e) => update({ targetAttendance: Number(e.target.value) })} />
        <div className="ob-target__scale" aria-hidden="true"><span>50%</span><span>75%</span><span>100%</span></div>
        <p className="ob-target__note">
          {"Most colleges require 75%. This applies to the " + tracked + " subject" + (tracked === 1 ? "" : "s") +
            " you're recording attendance for."}
        </p>
      </div>
    </>
  );
}

/* ---- 5. Appearance — applied the moment it is picked, so the preview
   is the real thing rather than a picture of it. ---- */

const THEME_OPTIONS = [
  { value: "light", label: "Light", note: "Warm paper white" },
  { value: "dark", label: "Dark", note: "Easy on late nights" },
];

export function AppearanceStep({ draft, onTheme, headingRef }) {
  return (
    <>
      <StepHead headingRef={headingRef} title="Choose your appearance"
        sub="You can change this any time from the header or Settings." />
      <fieldset className="ob-fieldset">
        <legend className="visually-hidden">Appearance</legend>
        <div className="ob-themes">
          {THEME_OPTIONS.map((t) => {
            const checked = draft.appearance === t.value;
            return (
              <label key={t.value} className={"ob-theme ob-theme--" + t.value + (checked ? " is-selected" : "")}>
                <input type="radio" name="ob-theme" value={t.value} checked={checked} onChange={() => onTheme(t.value)} />
                <span className="ob-theme__preview" aria-hidden="true">
                  <span className="ob-theme__bar"></span>
                  <span className="ob-theme__body">
                    <span className="ob-theme__side"></span>
                    <span className="ob-theme__main"><i></i><i></i><i></i></span>
                  </span>
                </span>
                <span className="ob-theme__meta">
                  <span className="ob-theme__label">{t.label}</span>
                  <span className="ob-theme__note">{t.note}</span>
                </span>
                <span className="ob-theme__check" aria-hidden="true">✓</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}

/* ---- 6. Review ---- */

export function FinishStep({ draft, person, headingRef }) {
  const kept = draft.subjects.filter((s) => s.name);
  const totalCredits = kept.reduce((n, s) => n + (Number(s.credits) || 0), 0);
  const tracked = kept.filter((s) => s.trackAttendance).length;
  const rows = [
    ["Program", draft.program],
    ["Semester", "Semester " + draft.semester],
    ["Subjects", kept.length + " · " + totalCredits + " credits"],
    ["Attendance", tracked + " of " + kept.length + " tracked · target " + draft.targetAttendance + "%"],
    ["Appearance", draft.appearance === "dark" ? "Dark" : "Light"],
  ];

  return (
    <>
      <StepHead headingRef={headingRef} title="Ready when you are"
        sub="Here's your workspace. Everything below can be changed later in Settings." />
      <div className="ob-summary">
        <div className="ob-summary__who">
          <span className="ob-summary__art"><AvatarArt avatar={draft.avatar} size={64} initials={person.initials} /></span>
          <span>
            <strong>{person.fullName || person.username}</strong>
            <span className="muted">{"@" + person.username}</span>
          </span>
        </div>
        <dl className="ob-summary__grid">
          {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}
        </dl>
        <ul className="ob-summary__subjects">
          {kept.map((s) => (
            <li key={s.id}>
              <span>{s.name}</span>
              <span className="muted">
                {s.credits + " credit" + (s.credits === 1 ? "" : "s") + (s.trackAttendance ? "" : " · no attendance")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
