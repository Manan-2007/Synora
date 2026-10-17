import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import LogoArt from "../../components/LogoArt.jsx";
import { AvatarStep, AcademicStep, SubjectsStep, AttendanceStep, AppearanceStep, FinishStep } from "./steps.jsx";
import { loadDraft, saveDraft, clearDraft, blankSubject, tidy, checkAcademic, checkSubjects, persistAnswers } from "./draft.js";
import usePageStyles from "../../hooks/usePageStyles.js";
import useBodyClass from "../../hooks/useBodyClass.js";
import usePageMeta from "../../hooks/usePageMeta.js";
import { session, profile } from "../../lib/storage.js";
import { setTheme } from "../../lib/theme.js";
import { clamp } from "../../lib/util.js";
import onboardingCss from "../../styles/onboarding.css?inline";

/* =========================================================
   Personalize Synora — between "account created" and the
   dashboard, and entirely optional: offered, never forced.

     Avatar → Academic → Subjects → Attendance goal
            → Appearance → Finish

   One question per step on purpose: the same six fields in
   one long form read as paperwork. It writes the profile
   (avatar, program, semester, target, appearance, onboarded)
   and the canonical subject list — nothing else.
   ========================================================= */

const STEPS = [
  { id: "avatar",     label: "Profile",    skippable: true },
  { id: "academic",   label: "Academic",   check: checkAcademic },
  { id: "subjects",   label: "Subjects",   check: checkSubjects },
  { id: "attendance", label: "Attendance" },
  { id: "appearance", label: "Appearance" },
  { id: "finish",     label: "Finish" },
];
const LAST = STEPS.length - 1;
const DASHBOARD = "/dashboard";

export default function Onboarding() {
  usePageStyles(onboardingCss);
  useBodyClass("ob");
  usePageMeta("Make Synora yours — Synora",
    "Set up your Synora workspace: avatar, program, subjects, attendance goal and appearance.");

  // You must be signed in to set up a workspace.
  if (!session.isAuthed()) return <Navigate to="/login" replace />;
  return <OnboardingWizard />;
}

function OnboardingWizard() {
  const navigate = useNavigate();
  const [person] = useState(() => profile.get());
  const [draft, setDraft] = useState(() => loadDraft(person));
  const [index, setIndex] = useState(() => clamp(Number(draft.step) || 0, 0, LAST));
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);
  const [doneShown, setDoneShown] = useState(false);
  // Each step's heading takes focus as it appears.
  const headingRef = useCallback((el) => { if (el) el.focus(); }, []);
  const focusNewRow = useRef(false);
  const panelRef = useRef(null);

  const step = STEPS[index];

  // Mirror the draft (and where the person is) on every change.
  useEffect(() => {
    if (!finished) saveDraft({ ...draft, step: index });
  }, [draft, index, finished]);

  useEffect(() => {
    if (!focusNewRow.current) return;
    focusNewRow.current = false;
    const inputs = panelRef.current.querySelectorAll("[data-sub-name]");
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  /* "You're all set." lands, then the dashboard arrives as an ending
     rather than an interruption. */
  useEffect(() => {
    if (!finished) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raf = requestAnimationFrame(() => setDoneShown(true));
    const timer = window.setTimeout(() => navigate(DASHBOARD), reduced ? 200 : 1400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [finished, navigate]);

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));

  function finish(d) {
    persistAnswers(d, true);
    clearDraft();
    setFinished(true);
  }

  function goNext() {
    const d = tidy(draft);
    if (step.check) {
      const message = step.check(d);
      if (message) { setError(message); return; }
    }
    // A satisfied subjects step drops any blank rows left behind.
    const next = step.id === "subjects" ? { ...d, subjects: d.subjects.filter((s) => s.name) } : d;
    setError(null);
    if (index === LAST) { finish(next); return; }
    setDraft(next);
    setIndex(index + 1);
  }

  function goBack() {
    if (index === 0) return;
    // Keep whatever has been typed on the way back — no validation.
    setDraft(tidy(draft));
    setError(null);
    setIndex(index - 1);
  }

  /* Skip moves past an optional step. It does not abandon setup. */
  function skip() {
    setError(null);
    if (index === LAST) { finish(draft); return; }
    setIndex(index + 1);
  }

  /* "Save & finish later" keeps everything entered so far and opens the
     dashboard WITHOUT marking setup done; the draft stays, so coming back
     lands on the same step, and the dashboard offers the way back in. */
  function exitEarly() {
    const d = tidy(draft);
    persistAnswers(d, false);
    saveDraft({ ...d, step: index });
    navigate(DASHBOARD);
  }

  function changeSubject(id, patch) {
    update({ subjects: draft.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  function addSubject() {
    const d = tidy(draft);
    setDraft({ ...d, subjects: [...d.subjects, blankSubject()] });
    focusNewRow.current = true;
  }

  function removeSubject(id) {
    const d = tidy(draft);
    setDraft({ ...d, subjects: d.subjects.filter((s) => s.id !== id) });
    setError(null);
  }

  function changeTheme(value) {
    update({ appearance: value });
    setTheme(value);
  }

  // Enter anywhere in the step moves forward — except in the subject list,
  // which uses Enter to add a row.
  function onPanelKeyDown(e) {
    if (e.key !== "Enter") return;
    if (e.target.closest(".ob-subjects")) return;
    if (e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    goNext();
  }

  const stepProps = { draft, update, person, headingRef };

  return (
    <>
      <header className="ob-topbar">
        <Link className="logo logo--lockup" to="/" aria-label="Synora — back to the home page">
          <LogoArt variant="lockup" />
        </Link>
        <button type="button" className="btn btn--ghost btn--sm" onClick={exitEarly}>Save &amp; finish later</button>
      </header>

      <main className="ob-main" id="main">
        <div className="ob-shell">
          <div className="ob-head">
            <h1>Make Synora yours.</h1>
            <p>A few details and we'll set up your workspace.</p>
          </div>

          <ol className="ob-steps" aria-label="Setup progress">
            {STEPS.map((s, i) => (
              <li key={s.id} className={"ob-step" + (i < index ? " is-done" : i === index ? " is-current" : "")}
                aria-current={i === index ? "step" : undefined}>
                <span className="ob-step__dot">{i < index ? "✓" : i + 1}</span>
                <span className="ob-step__label">{s.label}</span>
              </li>
            ))}
          </ol>

          {/* aria-live so a screen reader hears the new step after Continue. */}
          <section className="ob-card" aria-live="polite" ref={panelRef} onKeyDown={onPanelKeyDown}>
            {step.id === "avatar" && <AvatarStep {...stepProps} />}
            {step.id === "academic" && <AcademicStep {...stepProps} />}
            {step.id === "subjects" && (
              <SubjectsStep {...stepProps} onSubjectChange={changeSubject} onAdd={addSubject} onRemove={removeSubject} />
            )}
            {step.id === "attendance" && <AttendanceStep {...stepProps} />}
            {step.id === "appearance" && <AppearanceStep {...stepProps} onTheme={changeTheme} />}
            {step.id === "finish" && <FinishStep {...stepProps} />}
            {error && <p className="ob-error" role="alert">{error}</p>}
          </section>

          <div className="ob-nav">
            <button type="button" className="btn btn--ghost" disabled={index === 0} onClick={goBack}>Back</button>
            <span className="ob-nav__spacer"></span>
            <button type="button" className="btn btn--ghost" hidden={!step.skippable} onClick={skip}>Skip for now</button>
            <button type="button" className="btn btn--primary" onClick={goNext}>
              {index === LAST ? "Finish setup" : "Continue"}
            </button>
          </div>
        </div>
      </main>

      <div className={"ob-done" + (doneShown ? " is-shown" : "")} hidden={!finished}>
        <span className="logo logo--stacked ob-done__logo"><LogoArt variant="stacked" /></span>
        <h2>You're all set.</h2>
        <p>Opening your workspace…</p>
      </div>
    </>
  );
}
