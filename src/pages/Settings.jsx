import { useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import Icon from "../components/Icon.jsx";
import AvatarPicker from "../components/AvatarPicker.jsx";
import { UserAvatar } from "../components/AvatarArt.jsx";
import { useModal, useModalClose } from "../components/modal/ModalProvider.jsx";
import useStore from "../hooks/useStore.js";
import useTheme from "../hooks/useTheme.js";
import { store, profile, session } from "../lib/storage.js";
import { refresh } from "../lib/engine.js";
import { GRADES } from "../lib/grades.js";
import { setTheme } from "../lib/theme.js";
import { clamp, EMAIL_RE } from "../lib/util.js";
import { toast } from "../lib/toast.js";
import { install } from "../lib/install.js";
import { changePassword, deleteAccount, passwordProblem } from "../lib/auth.js";
import { demo } from "../lib/demo.js";
import ColorPicker from "../components/ColorPicker.jsx";
import { nextColor, subjectVar } from "../lib/colors.js";
import EmptyArt from "../components/EmptyArt.jsx";

/* =========================================================
   Settings — who you are, what you study, how it looks, and
   the account itself. Subjects live here because this is
   where the rest of the app gets them from; editing one keeps
   its id, so its attendance, grade and classes follow it.

   The old "Your data" card (export / load sample / delete
   all) is gone: the demo account covers sample data properly.
   ========================================================= */

const SEMESTERS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function formFrom(p) {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    program: p.program,
    semester: String(p.semester),
    targetAttendance: String(p.targetAttendance || ""),
  };
}

function SubjectForm({ subject }) {
  const close = useModalClose();
  const isEdit = !!subject;
  const s = subject || { id: null, name: "", credits: "", trackAttendance: true };
  const [name, setName] = useState(s.name);
  const [credits, setCredits] = useState(String(s.credits));
  const [track, setTrack] = useState(s.trackAttendance !== false);
  const [color, setColor] = useState(s.color || nextColor(store.subjects.all()));
  const [errors, setErrors] = useState({});

  function submit() {
    const trimmed = name.trim();
    const value = parseFloat(credits);

    if (!trimmed) { setErrors({ name: "Give the subject a name." }); return; }
    const clash = store.subjects.all().some((other) =>
      other.id !== s.id && other.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) { setErrors({ name: "You already have a subject with that name." }); return; }
    if (isNaN(value) || value < 0) { setErrors({ credits: "Enter the subject's credit value." }); return; }

    if (isEdit) store.subjects.save({ id: s.id, name: trimmed, credits: value, trackAttendance: track, color });
    else store.subjects.add(trimmed, value, track, color);

    close();
    refresh();
    toast.success(isEdit ? "Subject updated" : "Subject added", trimmed);
  }

  return (
    <>
      <div className="modal__body">
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className={"field" + (errors.name ? " is-invalid" : "")} style={{ margin: 0 }}>
            <label className="field__label" htmlFor="sf-name">Subject name</label>
            <input className="input" id="sf-name" maxLength={100} value={name} placeholder="e.g. DBMS" onChange={(e) => setName(e.target.value)} />
            <p className="field__error">{errors.name || ""}</p>
          </div>
          <div className={"field" + (errors.credits ? " is-invalid" : "")} style={{ margin: 0 }}>
            <label className="field__label" htmlFor="sf-credits">Credits</label>
            <input className="input" type="number" min="0" max="20" id="sf-credits" value={credits} placeholder="4"
              onChange={(e) => setCredits(e.target.value)} />
            <p className="field__error">{errors.credits || ""}</p>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <span className="field__label" id="sf-color-label">Colour</span>
            <ColorPicker value={color} onChange={setColor} name="sf-color" />
            <p className="field__hint">Used for this subject across the timetable, calendar, tasks and charts.</p>
          </div>
          <label className="check-row" style={{ alignItems: "flex-start" }}>
            <input type="checkbox" id="sf-track" checked={track} onChange={(e) => setTrack(e.target.checked)} />
            <span>
              <strong>Record attendance for this subject</strong>
              <span className="text-small muted" style={{ display: "block" }}>
                Off means it never appears on the Attendance page or its chart, and never raises an attendance warning.
                It keeps its credits and grade for CGPA either way.
              </span>
            </span>
          </label>
          {isEdit && (
            <p className="text-small muted" style={{ margin: 0 }}>
              Renaming keeps this subject's attendance, grade and timetable entries attached to it.
            </p>
          )}
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={submit}>{isEdit ? "Save changes" : "Add subject"}</button>
      </div>
    </>
  );
}

function AvatarDialog() {
  const close = useModalClose();
  const p = profile.get();
  const [picked, setPicked] = useState(p.avatar);

  function save() {
    profile.save({ avatar: picked });
    close();
    toast.success("Avatar updated");
  }

  return (
    <>
      <div className="modal__body">
        <AvatarPicker name="set-avatar" artSize={56} value={picked} initials={p.initials} onChange={setPicked}
          style={{ border: 0, padding: 0, margin: 0 }} />
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={save}>Save</button>
      </div>
    </>
  );
}

function chooseTheme(value) {
  setTheme(value);
  profile.save({ appearance: value });
}

/* Change password: the current one, then the new one twice. */
function PasswordForm() {
  const close = useModalClose();
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function submit() {
    if (busy) return;
    const found = {};
    if (!v.current) found.current = "Enter your current password.";
    const pw = passwordProblem(v.next);
    if (pw) found.next = pw;
    else if (v.next === v.current) found.next = "Choose a password different from the current one.";
    if (v.confirm !== v.next) found.confirm = "Passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = await changePassword(v.current, v.next);
    setBusy(false);
    if (Object.keys(res).length) { setErrors(res); return; }
    close();
    toast.success("Password changed", "Other devices signed in to your account have been signed out.");
  }

  const field = (k, label, autoComplete, hint) => (
    <div className={"field" + (errors[k] ? " is-invalid" : "")} style={{ margin: 0 }}>
      <label className="field__label" htmlFor={"pw-" + k}>{label}</label>
      <input className="input" type="password" id={"pw-" + k} autoComplete={autoComplete} value={v[k]} onChange={set(k)} />
      {hint && <p className="field__hint">{hint}</p>}
      <p className="field__error">{errors[k] || ""}</p>
    </div>
  );

  return (
    <>
      <div className="modal__body">
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {errors.form && <p className="contact-form__failure" role="alert" style={{ margin: 0 }}>{errors.form}</p>}
          {field("current", "Current password", "current-password")}
          {field("next", "New password", "new-password", "At least 8 characters, with a letter and a number.")}
          {field("confirm", "Confirm new password", "new-password")}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1}></button>
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={submit} disabled={busy}>
          {busy ? "Changing…" : "Change password"}
        </button>
      </div>
    </>
  );
}

/* Delete the account: permanent, so it asks for the password. */
function DeleteForm({ onDeleted }) {
  const close = useModalClose();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!password) { setErrors({ password: "Enter your password to confirm." }); return; }
    setBusy(true);
    const res = await deleteAccount(password);
    setBusy(false);
    if (Object.keys(res).length) { setErrors(res); return; }
    close();
    onDeleted();
  }

  return (
    <>
      <div className="modal__body">
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <p style={{ margin: 0 }}>
            This permanently deletes your account and <strong>everything in it</strong> (tasks, notes, timetable,
            grades, attendance and achievements) from the database and from every device. It can't be undone.
          </p>
          {errors.form && <p className="contact-form__failure" role="alert" style={{ margin: 0 }}>{errors.form}</p>}
          <div className={"field" + (errors.password ? " is-invalid" : "")} style={{ margin: 0 }}>
            <label className="field__label" htmlFor="del-password">Your password</label>
            <input className="input" type="password" id="del-password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="field__error">{errors.password || ""}</p>
          </div>
          <button type="submit" hidden aria-hidden="true" tabIndex={-1}></button>
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close}>Keep my account</button>
        <button type="button" className="btn btn--danger" onClick={submit} disabled={busy}>
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </>
  );
}

/* Install Synora as an app (home screen / dock): opens straight into the
   workspace, full screen, and loads even offline. */
function InstallCard() {
  const state = useSyncExternalStore(install.subscribe, install.state);
  return (
    <div className="card">
      <div className="card__header"><span className="card__title">Install the app</span></div>
      <div className="card__body stack" style={{ gap: 12 }}>
        {state === "installed" ? (
          <p className="text-small muted" style={{ margin: 0 }}>
            You're using Synora as an installed app. It opens straight into your workspace and loads even offline.
          </p>
        ) : (
          <>
            <p className="text-small muted" style={{ margin: 0 }}>
              Put Synora on your home screen or dock: it opens straight into your workspace, full screen,
              and loads even when you're offline.
            </p>
            {state === "available" && (
              <div className="row row--wrap" style={{ gap: 12 }}>
                <button type="button" className="btn btn--primary" onClick={() => install.prompt()}>
                  <Icon name="plus" size={16} /> Install Synora
                </button>
              </div>
            )}
            {state === "ios" && (
              <p className="text-small" style={{ margin: 0 }}>
                In Safari, tap <strong>Share</strong> and then <strong>Add to Home Screen</strong>.
              </p>
            )}
            {state === "manual" && (
              <p className="text-small" style={{ margin: 0 }}>
                Use your browser's menu: <strong>Install Synora</strong> or <strong>Add to Home screen</strong>.
                (In Safari on a Mac: <strong>File → Add to Dock</strong>.)
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TextField({ label, id, value, onChange, placeholder = "", type = "text", maxLength = 120 }) {
  return (
    <label className="field" style={{ margin: 0 }}>
      <span className="field__label">{label}</span>
      <input className="input" type={type} id={id} value={value} placeholder={placeholder} maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function Settings() {
  useStore();
  const theme = useTheme();
  const modal = useModal();
  const navigate = useNavigate();
  const p = profile.get();
  const subjects = store.subjects.all();
  const [form, setForm] = useState(() => formFrom(p));
  const [profileError, setProfileError] = useState("");

  const setField = (name) => (value) => setForm((f) => ({ ...f, [name]: value }));

  function saveProfile(e) {
    e.preventDefault();
    setProfileError("");
    const first = form.firstName.trim();
    const email = form.email.trim();
    if (!first) { setProfileError("Your first name can't be empty."); return; }
    if (email && !EMAIL_RE.test(email)) { setProfileError("That doesn't look like an email address."); return; }

    const target = parseInt(form.targetAttendance, 10);
    profile.save({
      firstName: first,
      lastName: form.lastName.trim(),
      email,
      program: form.program.trim(),
      semester: form.semester,
      targetAttendance: isNaN(target) ? 75 : clamp(target, 0, 100),
    });
    refresh();
    toast.success("Profile saved", "Refreshing your workspace…");
    setForm(formFrom(profile.get()));
  }

  function openAvatarDialog() {
    modal.open({ title: "Choose your avatar", content: <AvatarDialog /> });
  }

  function openSubjectForm(subject) {
    modal.open({ title: subject ? "Edit subject" : "Add subject", size: "sm", content: <SubjectForm subject={subject} /> });
  }

  async function deleteSubject(subject) {
    const ok = await modal.confirm({
      title: "Delete " + subject.name + "?",
      message: "Its attendance record, grade and timetable entries will be removed too. " +
               "Tasks and notes that mention it are left alone.",
      confirmLabel: "Delete subject",
      danger: true,
    });
    if (!ok) return;
    store.subjects.remove(subject.id);
    refresh();
    toast("Deleted " + subject.name);
  }

  async function signOut() {
    const ok = await modal.confirm({
      title: "Sign out?",
      message: "Your workspace is saved and will be here when you sign back in.",
      confirmLabel: "Sign out",
    });
    if (!ok) return;
    session.signOut();
    navigate("/login");
  }

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Your profile, subjects, appearance and account.</p>
      </div>

      <div>
        <div className="stack" style={{ gap: 24, maxWidth: 760 }}>
          {/* ---- Profile ---- */}
          <div className="card">
            <div className="card__header"><span className="card__title">Profile</span></div>
            <div className="card__body stack" style={{ gap: 24 }}>
              <div className="settings-identity">
                <UserAvatar size={64} />
                <div>
                  <p className="settings-identity__name">{p.fullName || p.username}</p>
                  <p className="settings-identity__handle">{"@" + p.username}</p>
                </div>
                <button type="button" className="btn btn--ghost btn--sm" style={{ marginLeft: "auto" }}
                  onClick={openAvatarDialog}>
                  Change avatar
                </button>
              </div>

              <form className="stack" style={{ gap: 16 }} onSubmit={saveProfile}>
                <div className="form-grid">
                  <TextField label="First name" id="s-first" value={form.firstName} onChange={setField("firstName")} />
                  <TextField label="Last name" id="s-last" value={form.lastName} onChange={setField("lastName")} />
                </div>
                <div className="form-grid">
                  <div className="field" style={{ margin: 0 }}>
                    <span className="field__label">Username</span>
                    <p className="settings-static">{p.username || "—"}</p>
                    <p className="field__hint">Your username identifies your workspace and can't be changed.</p>
                  </div>
                  <TextField label="Email" id="s-email" type="email" placeholder="you@example.com"
                    value={form.email} onChange={setField("email")} maxLength={254} />
                </div>
                <div className="form-grid">
                  <TextField label="Program" id="s-program" placeholder="e.g. B.E CSE AIML"
                    value={form.program} onChange={setField("program")} />
                  <label className="field" style={{ margin: 0 }}>
                    <span className="field__label">Semester</span>
                    <select className="select" id="s-sem" value={form.semester}
                      onChange={(e) => setField("semester")(e.target.value)}>
                      <option value="">Not set</option>
                      {SEMESTERS.map((label, i) => <option key={label} value={String(i + 1)}>{label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="form-grid">
                  <label className="field" style={{ margin: 0 }}>
                    <span className="field__label">Target attendance %</span>
                    <input className="input" type="number" id="s-target" min="0" max="100" value={form.targetAttendance}
                      onChange={(e) => setField("targetAttendance")(e.target.value)} />
                  </label>
                  <span></span>
                </div>
                <p className={"field__error" + (profileError ? " is-shown" : "")} style={{ margin: 0 }}>{profileError}</p>
                <div className="row"><button type="submit" className="btn btn--primary">Save profile</button></div>
              </form>
            </div>
          </div>

          {/* ---- Subjects ---- */}
          <div className="card">
            <div className="card__header">
              <span className="card__title">Subjects</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => openSubjectForm(null)}>
                <Icon name="plus" size={15} />Add subject
              </button>
            </div>
            <div className="card__body" style={{ padding: 0 }}>
              {subjects.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th style={{ width: 100 }}>Credits</th>
                        <th style={{ width: 130 }}>Attendance</th>
                        <th style={{ width: 96 }}><span className="visually-hidden">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <span className="row" style={{ gap: 10 }}>
                              <span className="subject-dot" style={subjectVar(s.color)} aria-hidden="true"></span>
                              <strong>{s.name}</strong>
                            </span>
                          </td>
                          <td className="muted">{s.credits || "—"}</td>
                          <td>
                            {s.trackAttendance
                              ? <span className="badge badge--low">Tracked</span>
                              : <span className="badge">Not tracked</span>}
                          </td>
                          <td>
                            <div className="row" style={{ gap: 2 }}>
                              <button type="button" className="icon-btn" aria-label={"Edit " + s.name}
                                onClick={() => openSubjectForm(store.subjects.byId(s.id))}>
                                <Icon name="edit" size={15} />
                              </button>
                              <button type="button" className="icon-btn" aria-label={"Delete " + s.name}
                                onClick={() => deleteSubject(s)}>
                                <Icon name="trash" size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty" style={{ padding: "40px 24px" }}>
                  <EmptyArt name="subjects" />
                  <p className="empty__title">No subjects yet</p>
                  <p className="empty__text">Add the subjects you're taking this semester, with their credits.</p>
                  <button className="btn btn--primary" onClick={() => openSubjectForm(null)}>
                    <Icon name="plus" size={16} />Add subject
                  </button>
                </div>
              )}
            </div>
            <div className="card__body" style={{ borderTop: "1px solid var(--color-border)" }}>
              <p className="text-small muted" style={{ margin: 0 }}>
                Attendance, CGPA and your timetable all read from this list. Renaming a subject here renames it
                everywhere; deleting one also removes its attendance, grade and classes.
              </p>
            </div>
          </div>

          {/* ---- Appearance ---- */}
          <div className="card">
            <div className="card__header"><span className="card__title">Appearance</span></div>
            <div className="card__body">
              <div className="row row--wrap" style={{ gap: 12 }}>
                {[["light", "Light", "sun"], ["dark", "Dark", "moon"]].map(([value, label, icon]) => {
                  const on = value === theme;
                  return (
                    <button key={value} type="button" className={"btn btn--ghost" + (on ? " is-active" : "")}
                      style={on ? { borderColor: "var(--color-brand)", color: "var(--color-brand)" } : undefined}
                      onClick={() => chooseTheme(value)}>
                      <Icon name={icon} size={16} />{label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ---- Grading — ONE system, because E1/E2/E3 are specific to it;
              this card documents it rather than offering a choice. ---- */}
          <div className="card">
            <div className="card__header"><span className="card__title">Grading system</span></div>
            <div className="card__body">
              <p className="text-small muted" style={{ margin: "0 0 12px" }}>
                Grades are on a 10-point scale. A grade carries the result on its own — there is no separate pass/fail
                field to disagree with it.
              </p>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Grade</th><th>Meaning</th><th>Points</th></tr></thead>
                  <tbody>
                    {Object.keys(GRADES).map((g) => (
                      <tr key={g}>
                        <td><strong>{g}</strong></td>
                        <td className="muted">{GRADES[g].label}</td>
                        <td>{GRADES[g].pass ? GRADES[g].point : <span className="badge badge--high">0</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-small muted" style={{ margin: "12px 0 0" }}>
                A failed subject scores 0 points but still contributes its credits, which is what pulls the CGPA down.
              </p>
            </div>
          </div>

          {/* ---- Account ---- */}
          <InstallCard />

          <div className="card">
            <div className="card__header"><span className="card__title">Account</span></div>
            <div className="card__body stack" style={{ gap: 16 }}>
              <p className="text-small muted" style={{ margin: 0 }}>
                Your workspace is saved to your Synora account, so it follows you to any browser or device you
                sign in on. Signing out keeps everything for next time.
              </p>
              <div className="row row--wrap" style={{ gap: 12 }}>
                <button type="button" className="btn btn--ghost" onClick={signOut}>Sign out</button>
                {!demo.isCurrent() && (
                  <button type="button" className="btn btn--ghost"
                    onClick={() => modal.open({ title: "Change password", size: "sm", content: <PasswordForm /> })}>
                    Change password
                  </button>
                )}
              </div>
              {demo.isCurrent() ? (
                <p className="text-small muted" style={{ margin: 0 }}>
                  This is the shared demo account, so its password can't be changed and it can't be deleted.
                </p>
              ) : (
                <div className="danger-zone">
                  <div>
                    <strong>Delete account</strong>
                    <p className="text-small muted" style={{ margin: 0 }}>Remove your account and all of its data, everywhere.</p>
                  </div>
                  <button type="button" className="btn btn--danger btn--sm"
                    onClick={() => modal.open({
                      title: "Delete your account?", size: "sm",
                      content: <DeleteForm onDeleted={() => { toast("Your account has been deleted"); navigate("/"); }} />,
                    })}>
                    Delete account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
