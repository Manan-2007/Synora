import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { session } from "../lib/storage.js";

/* =========================================================
   The first-run tour.

   After onboarding, the dashboard walks a new account through
   the few things worth knowing: the day header, quick actions,
   search, navigation and badges. Each step spotlights a real
   element (found by selector when the step opens; a step whose
   element isn't on screen — say, the sidebar on a phone — is
   skipped). Shown once per account on each device; Settings can
   start it again.
   ========================================================= */

const START_EVENT = "synora:tour";
export const startTour = () => window.dispatchEvent(new Event(START_EVENT));

const doneKey = () => "synora-tour:" + (session.username() || "");
export function tourDone() {
  try { return localStorage.getItem(doneKey()) === "done"; } catch { return true; }
}
/* Settings → "Take the tour again": forget it was done; the dashboard
   then runs it on its next visit. */
export function resetTour() {
  try { localStorage.removeItem(doneKey()); } catch { /* storage blocked */ }
}
function markDone() {
  try { localStorage.setItem(doneKey(), "done"); } catch { /* storage blocked */ }
}

const STEPS = [
  { title: "Welcome to Synora 👋", text: "A 30-second look around. Use the arrow keys, or tap Next." },
  { target: ".dash-hero__top", title: "Your day at a glance", text: "The date, what's due, your streak and your level, all in one place." },
  { target: ".dash-quick", title: "Quick actions", text: "Add a task or note, start a focus session, or jump to attendance, right from the dashboard." },
  { target: ".topbar-search", title: "Search everything", text: "Find any task, note, subject or page. On a keyboard, press ⌘K or Ctrl+K." },
  { target: ".sidebar__nav", title: "Every page", text: "Tasks, calendar, timetable, notes, focus timer, CGPA and attendance live here." },
  { target: ".tabbar", title: "Your most-used pages", text: "Home, tasks, calendar and focus are one tap away. More opens everything else." },
  { target: ".pill--level", title: "Earn badges", text: "33 badges to unlock as you study. Each one adds XP and levels you up." },
  { title: "You're all set", text: "Start with your timetable, or add today's first task. You can replay this tour from Settings." },
];

function visible(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
}

const PAD = 8;

export default function Tour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });

  /* Only the steps whose element is actually on this screen. */
  const [steps, setSteps] = useState(STEPS);

  const begin = useCallback(() => {
    setSteps(STEPS.filter((s) => !s.target || visible(document.querySelector(s.target))));
    setI(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(START_EVENT, begin);
    /* First visit after onboarding: wait for the dashboard's intro to clear. */
    let timer;
    if (!tourDone()) timer = window.setTimeout(begin, 1200);
    return () => { window.removeEventListener(START_EVENT, begin); window.clearTimeout(timer); };
  }, [begin]);

  const step = steps[i];

  /* Find, scroll to and measure this step's element. */
  const measure = useCallback(() => {
    if (!open || !step) return;
    const el = step.target && document.querySelector(step.target);
    setRect(el && visible(el) ? el.getBoundingClientRect() : null);
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open || !step) return undefined;
    const el = step.target && document.querySelector(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 100) el.scrollIntoView({ block: "center", behavior: "instant" });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [open, step, measure]);

  /* Put the card below the spotlight if it fits, else above; centred
     when there's nothing to point at. Kept inside the screen. */
  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, m = 12;
    if (!rect) { setCardPos({ top: Math.max(m, (vh - card.height) / 2), left: Math.max(m, (vw - card.width) / 2) }); return; }
    let top = rect.bottom + PAD + 12;
    if (top + card.height > vh - m) top = rect.top - PAD - 12 - card.height;
    top = Math.min(Math.max(m, top), vh - card.height - m);
    const left = Math.min(Math.max(m, rect.left + rect.width / 2 - card.width / 2), vw - card.width - m);
    setCardPos({ top, left });
  }, [open, rect, i]);

  useEffect(() => { if (open) cardRef.current?.focus(); }, [open, i]);

  const finish = useCallback(() => { markDone(); setOpen(false); }, []);
  const next = useCallback(() => (i + 1 < steps.length ? setI(i + 1) : finish()), [i, steps.length, finish]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); finish(); }
      else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, next, back, finish]);

  if (!open || !step) return null;
  const last = i === steps.length - 1;

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      {rect
        ? <div className="tour__spot" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
        : <div className="tour__dim" />}
      <div className="tour__card" ref={cardRef} tabIndex={-1} style={cardPos}>
        <p className="tour__count">{i + 1} of {steps.length}</p>
        <h2 className="tour__title" id="tour-title">{step.title}</h2>
        <p className="tour__text" id="tour-text">{step.text}</p>
        <div className="tour__nav">
          {!last && <button type="button" className="btn btn--ghost btn--sm tour__skip" onClick={finish}>Skip</button>}
          <span className="tour__dots" aria-hidden="true">{steps.map((s, n) => <span key={n} className={n === i ? "is-on" : ""} />)}</span>
          {i > 0 && <button type="button" className="btn btn--ghost btn--sm" onClick={back}>Back</button>}
          <button type="button" className="btn btn--primary btn--sm" onClick={next}>{last ? "Let's go" : "Next"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
