import { useEffect, useState } from "react";
import { Link } from "react-router";
import Icon from "../components/Icon.jsx";
import { UserAvatar } from "../components/AvatarArt.jsx";
import TaskRow from "../components/tasks/TaskRow.jsx";
import { useTaskForm } from "../components/tasks/TaskForm.jsx";
import useStore from "../hooks/useStore.js";
import { profile } from "../lib/storage.js";
import { derive, streak } from "../lib/engine.js";
import { allTasks, toggleComplete } from "../lib/tasks.js";
import { daysUntil, relativeDay, parseISODate, clamp, plural } from "../lib/util.js";

/* The command centre: who am I, what's due today, what's overdue,
   what's next, and how am I doing academically. */

/* Late night (midnight–5am) is still "evening", not morning. */
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

function QuickAction({ label, icon, to, onClick }) {
  const inner = (
    <>
      <span className="quick-action__icon"><Icon name={icon} size={18} /></span>
      <span className="quick-action__label">{label}</span>
    </>
  );
  return to
    ? <Link className="quick-action" to={to}>{inner}</Link>
    : <button className="quick-action" type="button" onClick={onClick}>{inner}</button>;
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
  const classes = derive.todaysClasses();
  const upcoming = derive.upcomingDeadlines(5);
  const att = derive.attendance();
  const cgpa = derive.cgpa();

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

        <div className="dash-hero">
          <UserAvatar size={52} className="avatar--lg" />
          <div>
            <div className="dash-hero__greet">{greeting(now) + ", " + name}</div>
            {course && <div className="dash-hero__course">{course}</div>}
            <div className="dash-hero__sub">{heroSub(stats)}</div>
          </div>
          <div className="dash-hero__streak">
            <span className="pill"><Icon name="flame" size={14} /><strong>{streakDays}</strong> day streak</span>
          </div>
        </div>

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
                    <span className="empty__icon"><Icon name="check" size={24} /></span>
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
                        <time>{c.start}</time>
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
              <div className="card__header"><span className="card__title">Quick actions</span></div>
              <div className="card__body">
                <div className="quick-actions">
                  <QuickAction label="Add task" icon="plus" onClick={() => openTaskForm(null)} />
                  <QuickAction label="Add note" icon="note" to="/notes" />
                  <QuickAction label="Calendar" icon="calendar" to="/calendar" />
                  <QuickAction label="Attendance" icon="users" to="/attendance" />
                  <QuickAction label="CGPA" icon="chart" to="/cgpa" />
                  <QuickAction label="Timetable" icon="clock" to="/timetable" />
                </div>
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
