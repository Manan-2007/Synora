import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import Icon from "../components/Icon.jsx";
import { UserAvatar } from "../components/AvatarArt.jsx";
import TaskRow from "../components/tasks/TaskRow.jsx";
import { useTaskForm } from "../components/tasks/TaskForm.jsx";
import useStore from "../hooks/useStore.js";
import { profile, store, session } from "../lib/storage.js";
import { derive, streak, achievements } from "../lib/engine.js";
import { allTasks, toggleComplete } from "../lib/tasks.js";
import { daysUntil, relativeDay, parseISODate, clamp, plural, toISODate } from "../lib/util.js";
import { subjectVar } from "../lib/colors.js";
import EmptyArt from "../components/EmptyArt.jsx";
import { InstallBanner } from "../components/InstallGuide.jsx";
import Tour from "../components/Tour.jsx";
import { overall } from "../lib/semesters.js";
import { classesToMark, markClass } from "../lib/attendance.js";
import { toast } from "../lib/toast.js";
import { formatTime } from "../lib/time.js";

/* The command centre: who am I, what's due today, what's overdue,
   what's next, and how am I doing academically. */

/* Late night (midnight–5am) is still "evening", not morning. */
/* After a class ends: did you go? One tap updates the attendance counts
   (lib/attendance.js markClass) by the class's length in hours; each class
   is asked about once a day. */
/* ---- End of the week: same timetable next week? ----
   From Friday noon to Sunday, if there is a timetable, ask once per week
   (remembered on this device). "It changed" offers the photo scanner or
   the timetable page. */
function nextMonday(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((8 - now.getDay()) % 7 || 7));
  return toISODate(d);
}
const weekKey = () => "synora-tt-week:" + (session.username() || "");

function WeekCheck() {
  const navigate = useNavigate();
  const [now] = useState(() => new Date());
  const [answered, setAnswered] = useState(() => {
    try { return localStorage.getItem(weekKey()) === nextMonday(now); } catch { return true; }
  });
  const [changed, setChanged] = useState(false);
  const day = now.getDay();
  const endOfWeek = day === 6 || day === 0 || (day === 5 && now.getHours() >= 12);
  if (answered || !endOfWeek || !store.get("timetable").length) return null;

  function remember() {
    try { localStorage.setItem(weekKey(), nextMonday(now)); } catch { /* storage blocked */ }
    setAnswered(true);
  }

  return (
    <div className="card attend-ask week-check">
      <h2 className="attend-ask__title">Same timetable next week?</h2>
      {!changed ? (
        <>
          <p className="text-small muted" style={{ margin: "0 0 12px" }}>Keeps your classes, reminders and attendance prompts right.</p>
          <div className="attend-ask__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => { remember(); toast.success("Got it", "Next week keeps the same timetable."); }}>
              Yes, same as this week
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setChanged(true)}>No, it changed</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-small muted" style={{ margin: "0 0 12px" }}>Scan the new timetable, or change the classes by hand.</p>
          <div className="attend-ask__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => { remember(); navigate("/timetable?scan=1"); }}>
              <Icon name="camera" size={14} />Scan a photo
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { remember(); navigate("/timetable"); }}>Edit by hand</button>
          </div>
        </>
      )}
    </div>
  );
}

const hoursLabel = (h) => (h > 1 ? h + " hours" : "1 hour");

/* Records one answer and says what it did. */
function answerClass(classId, subject, outcome, date) {
  const r = markClass(classId, outcome, date);
  if (!r) return false;
  if (outcome === "cancelled") toast("Not counted", subject + " wasn't held, so attendance is unchanged.");
  else toast.success(outcome === "attended" ? "Marked present" : "Marked absent",
    subject + " counts as " + hoursLabel(r.hours) + " · now " + r.pct.toFixed(0) + "% (" + r.attended + " of " + r.total + ").");
  return true;
}

function AttendancePrompt() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);   // classes finish while the page is open
    return () => clearInterval(t);
  }, []);

  /* A tap on a notification's "Attended" / "Missed" button lands here as
     /dashboard?attend=<class id>&date=<day>&outcome=<answer> (public/sw.js). */
  const [params, setParams] = useSearchParams();
  const handled = useRef(false);
  useEffect(() => {
    const id = params.get("attend");
    if (!id || handled.current) return;
    handled.current = true;
    const entry = store.get("timetable").find((c) => c.id === id);
    const subject = entry ? store.subjects.nameOf(entry.subjectId) || "That class" : "That class";
    const done = answerClass(id, subject, params.get("outcome"), params.get("date") || undefined);
    if (!done && entry) toast("Already recorded", subject + " was answered for that day, so nothing changed.");
    setParams({}, { replace: true });
  }, [params, setParams]);

  const list = classesToMark();
  if (!list.length) return null;
  const answer = (c, outcome) => answerClass(c.id, c.subject, outcome);

  return (
    <section className="card card--pad attend-ask" aria-labelledby="attend-ask-title">
      <h2 className="attend-ask__title" id="attend-ask-title">Did you attend?</h2>
      <div className="attend-ask__list">
        {list.map((c) => (
          <div className="attend-ask__row" key={c.id}>
            <span className="subject-dot" style={subjectVar(c.color)} aria-hidden="true"></span>
            <span className="attend-ask__what">
              <strong>{c.subject}</strong>
              <span className="text-small muted">{" " + c.time + (c.room ? " · " + c.room : "") + (c.hours > 1 ? " · counts as " + c.hours : "")}</span>
            </span>
            <span className="attend-ask__actions">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => answer(c, "attended")}>Attended</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => answer(c, "missed")}>Missed</button>
              <button type="button" className="btn btn--ghost btn--sm attend-ask__skip" onClick={() => answer(c, "cancelled")}
                aria-label={"Class cancelled: " + c.subject}>Cancelled</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* First steps for a new workspace. Each ticks itself off from what's
   actually there; the card goes away once all are done, or when closed
   (remembered in meta, so on every device). */
function GettingStarted() {
  const meta = store.get("meta");
  if (meta.checklistDismissed) return null;
  const steps = [
    { done: store.subjects.all().length > 0, label: "Add your subjects and their credits", to: "/settings" },
    { done: store.get("timetable").length > 0, label: "Set up your weekly timetable", to: "/timetable" },
    { done: allTasks().length > 0, label: "Add your first task or deadline", to: "/tasks" },
    { done: store.get("attendance").some((a) => Number(a.total) > 0), label: "Record your attendance so far", to: "/attendance" },
    { done: (store.get("cgpa").subjects || []).some((g) => g.grade), label: "Enter a grade to see your CGPA", to: "/cgpa" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const close = () => store.update("meta", (m) => ({ ...m, checklistDismissed: true }));

  return (
    <section className="card card--pad checklist" aria-labelledby="checklist-title">
      <div className="checklist__head">
        <div>
          <h2 className="checklist__title" id="checklist-title">Get started with Synora</h2>
          <p className="text-small muted" style={{ margin: 0 }}>{done + " of " + steps.length + " done"}</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Hide this checklist" onClick={close}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="checklist__bar" aria-hidden="true"><span style={{ width: (done / steps.length) * 100 + "%" }}></span></div>
      <ol className="checklist__list">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? "is-done" : ""}>
            <span className="checklist__mark" aria-hidden="true">{s.done && <Icon name="check" size={12} />}</span>
            {s.done
              ? <span>{s.label}<span className="visually-hidden"> (done)</span></span>
              : <Link to={s.to}>{s.label}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function greeting(now) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

function heroSub(stats) {
  if (stats.overdue > 0) return "You have " + stats.overdue + " overdue " + plural(stats.overdue, "task") + " to clear.";
  if (stats.dueToday > 0) return stats.dueToday + " " + plural(stats.dueToday, "task") + " due today. You've got this.";
  if (stats.pending > 0) return stats.pending + " " + plural(stats.pending, "task") + " on your plate. Nothing overdue.";
  return "Your list is clear. A good time to plan ahead.";
}

/* Shown while the page opens, then faded out — as dashboard.html did. */
function DashboardLoader() {
  const [phase, setPhase] = useState("shown");
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setPhase("hidden"));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (phase !== "hidden") return undefined;
    const timer = window.setTimeout(() => setPhase("gone"), 400);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div className={"loader" + (phase === "hidden" ? " is-hidden" : "")} id="app-loader">
      <span className="loader__mark">Synora</span>
      <span className="loader__tag">organize · focus · progress</span>
      <span className="loader__dots" aria-hidden="true"><span></span><span></span><span></span></span>
    </div>
  );
}

/* A donut from weighted segments. Colours are CSS variables. */
function Donut({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 52, cx = 66, cy = 66, C = 2 * Math.PI * r, sw = 16;
  const pct = total ? Math.round((segments[0].value / total) * 100) : 0;
  // Each arc starts where the previous segments end.
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((s, x) => s + x.value, 0));

  return (
    <div className="ring-wrap">
      <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-surface-sunken)" strokeWidth={sw}></circle>
        {segments.map((seg, i) => {
          if (!seg.value || !total) return null;
          const len = (seg.value / total) * C;
          const rot = (starts[i] / total) * 360 - 90;
          return (
            <circle key={seg.label} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
              strokeDasharray={len + " " + (C - len)} transform={"rotate(" + rot + " " + cx + " " + cy + ")"}></circle>
          );
        })}
      </svg>
      <span className="ring-wrap__center">
        <span className="ring-wrap__value">{pct + "%"}</span>
        <span className="ring-wrap__label">done</span>
      </span>
    </div>
  );
}

function MiniCalendar({ now }) {
  const year = now.getFullYear(), month = now.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayNum = now.getDate();

  // Days that have an open task deadline this month.
  const marked = new Set();
  allTasks().forEach((t) => {
    if (!t.deadline || t.status === "completed") return;
    const d = parseISODate(t.deadline);
    if (d && d.getFullYear() === year && d.getMonth() === month) marked.add(d.getDate());
  });

  return (
    <div className="mini-cal">
      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={"dow" + i} className="mini-cal__dow">{d}</span>)}
      {Array.from({ length: startDay }, (_, i) => <span key={"pad" + i}></span>)}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        let cls = "mini-cal__day";
        if (day === todayNum) cls += " mini-cal__day--today";
        if (marked.has(day)) cls += " mini-cal__day--has";
        return <span key={day} className={cls}>{day}</span>;
      })}
    </div>
  );
}

function StatCard({ label, icon, value, foot, valueClass }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label"><Icon name={icon} size={16} />{label}</div>
      <div className={"stat-card__value " + (valueClass || "")}>{value}</div>
      {foot && <div className="stat-card__foot">{foot}</div>}
    </div>
  );
}


function LegendRow({ color, label, count }) {
  return (
    <li>
      <span className="legend__swatch" style={{ background: color }}></span>
      {label + " "}
      <span className="muted" style={{ marginLeft: "auto", fontWeight: 600 }}>{count}</span>
    </li>
  );
}

export default function Dashboard() {
  useStore();
  const openTaskForm = useTaskForm();
  const [now] = useState(() => new Date());

  const p = profile.get();
  const name = p.firstName || p.username || "there";
  const stats = derive.taskStats();
  const streakDays = streak.current();
  const level = achievements.summary();
  const classes = derive.todaysClasses();
  const upcoming = derive.upcomingDeadlines(5);
  const att = derive.attendance();
  /* Overall CGPA: past semesters too, when there are any. */
  const total = overall();
  const cgpa = total.value !== null ? { value: total.value, max: total.max } : null;

  let todayTasks = allTasks().filter((t) => {
    if (t.status === "completed") return false;
    const days = t.deadline ? daysUntil(t.deadline) : null;
    return days !== null && days <= 0;   // due today or overdue
  }).sort((a, b) => ((a.deadline || "") < (b.deadline || "") ? -1 : 1));
  if (!todayTasks.length) {
    // Fall back to the nearest upcoming tasks so the card isn't empty.
    todayTasks = allTasks().filter((t) => t.status !== "completed")
      .sort((a, b) => ((a.deadline || "9999") < (b.deadline || "9999") ? -1 : 1))
      .slice(0, 4);
  }

  const remaining = Math.max(0, stats.pending - stats.overdue);
  const course = [p.program, p.semester ? "Semester " + p.semester : ""].filter(Boolean).join(" · ");

  return (
    <>
      <DashboardLoader />
      <div>
        {/* Unfinished setup is OFFERED here, not enforced by a redirect. */}
        {!p.onboarded && (
          <div className="card card--pad dash-setup">
            <div>
              <p className="dash-setup__title">Finish setting up your workspace</p>
              <p className="dash-setup__text muted text-small">
                Add your subjects, credits and attendance target and the pages below start filling themselves in. It
                takes about a minute, and you can leave halfway — your answers are kept.
              </p>
            </div>
            <Link className="btn btn--primary" to="/onboarding">Personalize Synora</Link>
          </div>
        )}

        {p.onboarded && <GettingStarted />}
        {p.onboarded && <Tour />}
        <AttendancePrompt />
        <WeekCheck />
        <InstallBanner />

        <section className="dash-hero" aria-label="Today">
          <div className="dash-hero__top">
            <UserAvatar size={56} className="avatar--lg" />
            <div className="dash-hero__text">
              <p className="dash-hero__date">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
              <h2 className="dash-hero__greet">{greeting(now) + ", " + name}</h2>
              {course && <div className="dash-hero__course">{course}</div>}
              <div className="dash-hero__sub">{heroSub(stats)}</div>
            </div>
            <div className="dash-hero__streak">
              <span className="pill"><Icon name="flame" size={14} /><strong>{streakDays}</strong> day streak</span>
              <Link className="pill pill--level" to="/achievements" aria-label={"Level " + level.level + ", " + level.title + ". See achievements"}>
                <Icon name="star" size={14} /><strong>Lv {level.level}</strong> {level.title}
              </Link>
            </div>
          </div>
          <div className="dash-quick">
            <button type="button" className="dash-quick__item" onClick={() => openTaskForm(null)}>
              <span className="dash-quick__icon"><Icon name="plus" size={20} /></span>New task
            </button>
            <Link className="dash-quick__item" to="/focus">
              <span className="dash-quick__icon"><Icon name="timer" size={20} /></span>Focus
            </Link>
            <Link className="dash-quick__item" to="/notes?new=1">
              <span className="dash-quick__icon"><Icon name="note" size={20} /></span>New note
            </Link>
            <Link className="dash-quick__item" to="/attendance">
              <span className="dash-quick__icon"><Icon name="users" size={20} /></span>Attendance
            </Link>
          </div>
        </section>

        <div className="stat-grid" style={{ marginTop: 24 }}>
          <StatCard label="Total tasks" icon="check" value={stats.total} foot={stats.completed + " completed"} />
          <StatCard label="Due today" icon="clock" value={stats.dueToday} foot="needs attention"
            valueClass={stats.dueToday ? "stat-card__value--brand" : ""} />
          <StatCard label="Overdue" icon="alert" value={stats.overdue} foot={stats.overdue ? "past deadline" : "all clear"}
            valueClass={stats.overdue ? "stat-card__value--accent" : ""} />
          <StatCard label="Upcoming" icon="calendar" value={stats.upcoming} foot="later this week" />
        </div>

        <div className="dash-cols" style={{ marginTop: 24 }}>
          <div className="stack">
            <div className="card">
              <div className="card__header">
                <span className="card__title">Today’s tasks</span>
                <Link className="card__link" to="/tasks">View all</Link>
              </div>
              <div className="card__body" style={{ padding: "8px 24px" }}>
                {todayTasks.length ? (
                  <div className="tlist">
                    {todayTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleComplete} />)}
                  </div>
                ) : (
                  <div className="empty" style={{ padding: "32px 0" }}>
                    <EmptyArt name="calm" />
                    <p className="empty__title">Nothing due</p>
                    <p className="empty__text">Add a task to get your day organized.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card__header">
                <span className="card__title">Today’s schedule</span>
                <Link className="card__link" to="/timetable">Timetable</Link>
              </div>
              <div className="card__body">
                {classes.length ? (
                  <div className="agenda-list">
                    {classes.map((c) => (
                      <div className="agenda-row" key={c.id}>
                        <time>{formatTime(c.start)}</time>
                        <span className="subject-dot" style={{ ...subjectVar(c.color), alignSelf: "center" }} aria-hidden="true"></span>
                        <span>
                          <span className="agenda-row__subject">{c.subject}</span>
                          {c.room && <span className="agenda-row__room">{" · " + c.room}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted text-small">No classes scheduled for today.</p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card__header">
                <span className="card__title">Next badges</span>
                <Link className="card__link" to="/achievements">All badges</Link>
              </div>
              <div className="card__body stack" style={{ gap: 14 }}>
                {achievements.nextUp(3).map((a) => (
                  <div key={a.id} className="dash-badge">
                    <span className={"ach-badge ach-badge--t" + a.tier}><Icon name={a.icon} size={18} /></span>
                    <div className="dash-badge__body">
                      <strong>{a.title}</strong>
                      <span>{a.desc}</span>
                      <div className="meter"><span className="meter__fill" style={{ width: Math.round((a.current / a.goal) * 100) + "%" }}></span></div>
                    </div>
                    <span className="dash-badge__xp">+{a.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card">
              <div className="card__header"><span className="card__title">Progress</span></div>
              <div className="card__body"
                style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                <Donut segments={[
                  { label: "completed", value: stats.completed, color: "var(--color-brand)" },
                  { label: "pending", value: remaining, color: "var(--color-accent-bright)" },
                  { label: "overdue", value: stats.overdue, color: "var(--status-high)" },
                ]} />
                <ul className="legend">
                  <LegendRow color="var(--color-brand)" label="Completed" count={stats.completed} />
                  <LegendRow color="var(--color-accent-bright)" label="Pending" count={remaining} />
                  <LegendRow color="var(--status-high)" label="Overdue" count={stats.overdue} />
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card__header">
                <span className="card__title">
                  {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
                <Link className="card__link" to="/calendar">Open</Link>
              </div>
              <div className="card__body"><MiniCalendar now={now} /></div>
            </div>

            <div className="card">
              <div className="card__header"><span className="card__title">Upcoming deadlines</span></div>
              <div className="card__body">
                {upcoming.length ? (
                  <div className="stack" style={{ gap: 12 }}>
                    {upcoming.map((t) => {
                      const days = daysUntil(t.deadline);
                      const cls = days < 0 ? "due-over" : days <= 1 ? "due-soon" : "muted";
                      return (
                        <div className="row" key={t.id} style={{ justifyContent: "space-between", gap: 12 }}>
                          <span className="text-small">{t.title}</span>
                          <span className={"text-small " + cls} style={{ whiteSpace: "nowrap" }}>{relativeDay(t.deadline)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted text-small">No deadlines coming up.</p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card__header"><span className="card__title">Academic snapshot</span></div>
              <div className="card__body stack" style={{ gap: 16 }}>
                {att.overall !== null ? (
                  <div>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="text-small muted">Attendance</span>
                      <span className="text-small" style={{ fontWeight: 600 }}>{att.overall.toFixed(0) + "%"}</span>
                    </div>
                    <div className="meter" style={{ marginTop: 6 }}>
                      <span className={"meter__fill " + (att.overall < att.target ? "meter__fill--danger" : "")}
                        style={{ width: clamp(att.overall, 0, 100) + "%" }}></span>
                    </div>
                  </div>
                ) : (
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="text-small muted">Attendance</span>
                    <Link className="card__link" to="/attendance">Add subjects</Link>
                  </div>
                )}
                {cgpa ? (
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="text-small muted">CGPA</span>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem" }}>
                      {cgpa.value.toFixed(2)}
                      <span className="muted" style={{ fontSize: ".8rem", fontWeight: 500 }}>{" / " + cgpa.max}</span>
                    </span>
                  </div>
                ) : (
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="text-small muted">CGPA</span>
                    <Link className="card__link" to="/cgpa">Calculate</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
