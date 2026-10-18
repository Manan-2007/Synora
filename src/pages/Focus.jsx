import { useEffect, useState, useSyncExternalStore } from "react";
import Icon from "../components/Icon.jsx";
import useStore from "../hooks/useStore.js";
import { store } from "../lib/storage.js";
import { allTasks } from "../lib/tasks.js";
import { subjectVar } from "../lib/colors.js";
import { toast } from "../lib/toast.js";
import { clockTime } from "../lib/time.js";
import { formatDate, toISODate, todayISO } from "../lib/util.js";
import {
  MODES, LENGTHS, ROUNDS, timer, subscribeTimer, remainingMs, durationOf, inProgress,
  startTimer, pauseTimer, resetTimer, finishEarly, setMode, setLength, setFocusTarget,
  focusStats, clock, hoursMinutes,
} from "../lib/focus.js";

/* The focus timer: pick what you're working on, run 25-minute blocks
   with breaks between them, and see where the week's time went. The
   timer keeps running when you leave the page (the topbar shows it). */

const R = 104;
const C = 2 * Math.PI * R;
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function useTicker(running) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  return running ? now : Date.now();
}

function whenLabel(iso) {
  const d = new Date(iso);
  const day = toISODate(d);
  const time = clockTime(d);
  return (day === todayISO() ? "Today" : formatDate(day)) + ", " + time;
}

function Timer() {
  const s = useSyncExternalStore(subscribeTimer, timer);
  const now = useTicker(s.running);
  const left = remainingMs(s, now);
  const total = durationOf(s);
  const busy = inProgress(s);
  const subjects = store.subjects.all();
  const subject = store.subjects.byId(s.subjectId);
  const openTasks = allTasks().filter((t) => t.status !== "completed");
  const tasks = subject ? openTasks.filter((t) => t.subject === subject.name) : openTasks;
  const label = s.mode === "focus" ? "Round " + ((s.round % ROUNDS) + 1) + " of " + ROUNDS : MODES[s.mode].label;

  /* The tab title counts down while the timer runs. */
  useEffect(() => {
    if (!s.running) return undefined;
    document.title = clock(left) + " · " + MODES[s.mode].label + " — Synora";
    return () => { document.title = "Focus — Synora"; };
  }, [s.running, s.mode, left]);

  function finish() {
    const saved = finishEarly();
    if (saved) toast.success("Session saved", saved.minutes + (saved.minutes === 1 ? " minute" : " minutes") + " of focus.");
    else if (s.mode === "focus") toast.info("Nothing saved", "Sessions under a minute aren't kept.");
  }

  function pickTask(id) {
    const task = openTasks.find((t) => t.id === id);
    const match = task && subjects.find((x) => x.name === task.subject);
    setFocusTarget(match ? { taskId: id, subjectId: match.id } : { taskId: id });
  }

  const ringColor = s.mode === "focus" ? (subject ? subjectVar(subject.color) : { "--subject": "var(--color-brand)" }) : { "--subject": "var(--color-accent)" };

  return (
    <section className="card card--pad focus-timer" aria-label="Timer">
      <div className="segmented focus-modes" role="group" aria-label="Timer mode">
        {Object.keys(MODES).map((m) => (
          <button key={m} type="button" className={s.mode === m ? "is-active" : ""} aria-pressed={s.mode === m}
            disabled={busy && s.mode !== m} onClick={() => setMode(m)}>
            {MODES[m].label}
          </button>
        ))}
      </div>

      <div className="focus-ring" style={ringColor}>
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <circle className="focus-ring__track" cx="120" cy="120" r={R} />
          <circle className="focus-ring__fill" cx="120" cy="120" r={R}
            strokeDasharray={C} strokeDashoffset={C * (left / total)} />
        </svg>
        <div className="focus-ring__center">
          <span className="focus-ring__time" role="timer" aria-live="off">{clock(left)}</span>
          <span className="focus-ring__label">{s.running ? label : busy ? "Paused" : label}</span>
        </div>
      </div>

      <div className="focus-controls">
        <button type="button" className="icon-btn focus-controls__side" aria-label="Reset the timer"
          title="Reset" disabled={!busy} onClick={resetTimer}>
          <Icon name="reset" size={18} />
        </button>
        {s.running ? (
          <button type="button" className="btn btn--primary btn--lg focus-controls__main" onClick={pauseTimer}>
            <Icon name="pause" size={18} />Pause
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--lg focus-controls__main" onClick={startTimer}>
            <Icon name="play" size={18} />{busy ? "Resume" : s.mode === "focus" ? "Start focus" : "Start break"}
          </button>
        )}
        <button type="button" className="icon-btn focus-controls__side"
          aria-label={s.mode === "focus" ? "Finish early and save" : "Skip the break"}
          title={s.mode === "focus" ? "Finish early" : "Skip break"} disabled={s.mode === "focus" && !busy} onClick={finish}>
          <Icon name="skip" size={18} />
        </button>
      </div>

      <div className="focus-target">
        <label className="field" style={{ margin: 0 }}>
          <span className="field__label">Subject</span>
          <select className="select" value={s.subjectId} onChange={(e) => setFocusTarget({ subjectId: e.target.value, taskId: "" })}>
            <option value="">No subject</option>
            {subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span className="field__label">Task</span>
          <select className="select" value={tasks.some((t) => t.id === s.taskId) ? s.taskId : ""} onChange={(e) => pickTask(e.target.value)}>
            <option value="">{tasks.length ? "Any task" : "No open tasks"}</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span className="field__label">Focus length</span>
          <select className="select" value={s.length} disabled={busy && s.mode === "focus"}
            onChange={(e) => setLength(Number(e.target.value))}>
            {LENGTHS.map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function Stats() {
  useStore();
  const st = focusStats();
  const max = Math.max(30, ...st.days.map((d) => d.minutes));
  const today = todayISO();
  const subjMax = Math.max(1, ...st.subjects.map((x) => x.minutes));
  const tasks = allTasks();

  return (
    <div className="stack" style={{ gap: "var(--space-24)" }}>
      <div className="card">
        <div className="card__header"><span className="card__title">Your focus</span></div>
        <div className="card__body stack" style={{ gap: 20 }}>
          <div className="focus-stats">
            <div><span className="focus-stats__value">{hoursMinutes(st.todayMinutes)}</span>
              <span className="focus-stats__label">today · {st.todaySessions} {st.todaySessions === 1 ? "session" : "sessions"}</span></div>
            <div><span className="focus-stats__value">{hoursMinutes(st.weekMinutes)}</span>
              <span className="focus-stats__label">this week</span></div>
            <div><span className="focus-stats__value">{hoursMinutes(st.totalMinutes)}</span>
              <span className="focus-stats__label">all time</span></div>
          </div>

          <div className="focus-week" role="img"
            aria-label={"Focus minutes this week: " + st.days.map((d, i) => DAY_LETTERS[i] + " " + d.minutes).join(", ")}>
            {st.days.map((d, i) => (
              <div key={d.iso} className={"focus-week__col" + (d.iso === today ? " is-today" : "")} title={formatDate(d.iso) + ": " + d.minutes + " min"}>
                <div className="focus-week__bar" style={{ height: Math.max(d.minutes ? 6 : 2, (d.minutes / max) * 100) + "%" }}></div>
                <span className="focus-week__day">{DAY_LETTERS[i]}</span>
              </div>
            ))}
          </div>

          {st.subjects.length > 0 && (
            <div className="stack" style={{ gap: 10 }}>
              <span className="text-small muted">This week by subject</span>
              {st.subjects.map((x) => (
                <div key={x.id || "none"} className="focus-subj" style={subjectVar(x.color)}>
                  <span className="focus-subj__name"><span className="subject-dot"></span>{x.name}</span>
                  <span className="focus-subj__min">{hoursMinutes(x.minutes)}</span>
                  <span className="focus-subj__track"><span className="focus-subj__fill" style={{ width: (x.minutes / subjMax) * 100 + "%" }}></span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__header"><span className="card__title">Recent sessions</span></div>
        <div className="card__body">
          {st.recent.length ? (
            <ul className="focus-recent">
              {st.recent.map((f) => {
                const sub = store.subjects.byId(f.subjectId);
                const task = tasks.find((t) => t.id === f.taskId);
                return (
                  <li key={f.id} style={subjectVar(sub ? sub.color : "stone")}>
                    <span className="subject-dot"></span>
                    <span className="focus-recent__what">
                      <strong>{sub ? sub.name : "Focus"}</strong>{task ? " · " + task.title : ""}
                      <span className="focus-recent__when">{whenLabel(f.endedAt)}</span>
                    </span>
                    <span className="focus-recent__min">{f.minutes} min</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-small muted" style={{ margin: 0 }}>
              Nothing yet. When a focus session ends it's saved here, with the subject you picked.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Focus() {
  useStore();
  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Work in focused blocks with short breaks between them. Finished sessions are saved to your stats.</p>
      </div>
      <div className="focus-layout">
        <Timer />
        <Stats />
      </div>
    </>
  );
}
