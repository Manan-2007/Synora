import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import Icon from "../../components/Icon.jsx";
import { useModal, useModalClose } from "../../components/modal/ModalProvider.jsx";
import { useClassForm } from "./ClassForm.jsx";
import useStore from "../../hooks/useStore.js";
import { store } from "../../lib/storage.js";
import { toast } from "../../lib/toast.js";
import { DAYS, todayName, allClasses, getClass, removeClass, timeLabel } from "../../lib/timetable.js";
import { subjectVar } from "../../lib/colors.js";
import { hourLabel, clockTime } from "../../lib/time.js";
import EmptyArt from "../../components/EmptyArt.jsx";
import { exportCalendar } from "../../lib/ics.js";
import { useScanTimetable } from "./ScanTimetable.jsx";

/* A weekly class schedule. Desktop shows a 7-day grid; on small screens
   the CSS stacks each day into its own card. */

const byStart = (a, b) => ((a.startTime || "") < (b.startTime || "") ? -1 : 1);

/* Set Timetable — the guided way in. Walks the week a day at a time and
   keeps the dialog open, so a full schedule is one sitting. */
function useTimetableSetup() {
  const modal = useModal();
  const openClassForm = useClassForm();
  return useCallback(() => {
    if (!store.subjects.all().length) {
      toast.error("No subjects yet", "Add your subjects in Settings first.");
      return;
    }
    modal.open({ title: "Set your timetable", content: <SetupDialog openClassForm={openClassForm} /> });
  }, [modal, openClassForm]);
}

function SetupDialog({ openClassForm }) {
  useStore();
  const close = useModalClose();
  const [dayIndex, setDayIndex] = useState(0);
  const day = DAYS[dayIndex];
  const classes = allClasses().filter((c) => c.day === day).sort((a, b) => (a.startTime < b.startTime ? -1 : 1));

  function nextDay() {
    if (dayIndex >= DAYS.length - 1) { close(); return; }
    setDayIndex(dayIndex + 1);
  }

  return (
    <>
      <div className="modal__body">
        <div className="stack">
          <div className="setup-day">
            <div className="setup-day__head">
              <strong>{day}</strong>
              <span className="text-small muted">{"Day " + (dayIndex + 1) + " of " + DAYS.length}</span>
            </div>
            {classes.length ? (
              <div className="setup-list">
                {classes.map((c) => (
                  <div className="setup-row" key={c.id}>
                    <time>{timeLabel(c)}</time>
                    <span>
                      {store.subjects.nameOf(c.subjectId)}
                      {c.room && <span className="muted">{" · " + c.room}</span>}
                    </span>
                    <button type="button" className="icon-btn" aria-label="Remove this class" onClick={() => removeClass(c.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-small muted setup-empty">{"No classes on " + day + " yet."}</p>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => openClassForm(null, day)}>
              <Icon name="plus" size={15} />{"Add a class on " + day}
            </button>
          </div>
        </div>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={() => setDayIndex(Math.max(0, dayIndex - 1))}>
          Previous day
        </button>
        <button type="button" className="btn btn--ghost" onClick={nextDay}>Next day</button>
        <button type="button" className="btn btn--primary" onClick={close}>Done</button>
      </div>
    </>
  );
}

/* ---- The week board (wider screens) ----
   Days are columns and time runs down the page: each class is placed at
   its start time and is as tall as it lasts. Saturday and Sunday only
   appear when they have classes. Today's column is tinted and a line
   marks the current time. */

const HOUR_PX = 64;
const toMinutes = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/* Side-by-side lanes for classes that overlap on the same day. */
function layLanes(items) {
  const lanes = [];
  const placed = items.map((it) => {
    let lane = lanes.findIndex((end) => end <= it.start);
    if (lane === -1) { lane = lanes.length; lanes.push(it.end); } else lanes[lane] = it.end;
    return { ...it, lane };
  });
  return placed.map((p) => ({
    ...p,
    lanes: Math.max(1, ...placed.filter((q) => q.start < p.end && p.start < q.end).map((q) => q.lane + 1)),
  }));
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function WeekBoard({ list, today, onOpen }) {
  const now = useNow();
  const timed = list
    .map((c) => {
      const start = toMinutes(c.startTime);
      const end = toMinutes(c.endTime);
      return { c, start: start ?? 9 * 60, end: end && start !== null && end > start ? end : (start ?? 9 * 60) + 60 };
    })
    .filter((x) => store.subjects.nameOf(x.c.subjectId));
  const days = DAYS.filter((d, i) => i < 5 || timed.some((x) => x.c.day === d));
  const first = Math.min(8, Math.floor(Math.min(...timed.map((x) => x.start)) / 60));
  const last = Math.max(17, Math.ceil(Math.max(...timed.map((x) => x.end)) / 60));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = nowMin >= first * 60 && nowMin <= last * 60 ? ((nowMin - first * 60) / 60) * HOUR_PX : null;

  return (
    <div className="tt-board" style={{ "--cols": days.length, "--hour": HOUR_PX + "px", "--rows": last - first }}>
      <div className="tt-board__corner" aria-hidden="true"></div>
      {days.map((day) => (
        <div key={day} className={"tt-board__head" + (day === today ? " is-today" : "")}>
          <span className="tt-board__dayname">{day.slice(0, 3)}</span>
          {day === today && <span className="tt-board__today">Today</span>}
        </div>
      ))}
      <div className="tt-board__times" aria-hidden="true">
        {hours.map((h) => <span key={h} style={{ top: (h - first) * HOUR_PX }}>{hourLabel(h)}</span>)}
      </div>
      {days.map((day) => {
        const items = layLanes(timed.filter((x) => x.c.day === day).sort((a, b) => a.start - b.start));
        return (
          <div key={day} className={"tt-board__col" + (day === today ? " is-today" : "")} role="group" aria-label={day}>
            {items.map(({ c, start, end, lane, lanes }) => (
              <button key={c.id} type="button" className="tt-block" onClick={() => onOpen(getClass(c.id))}
                style={{
                  ...subjectVar(store.subjects.byId(c.subjectId)?.color),
                  top: ((start - first * 60) / 60) * HOUR_PX + 2,
                  height: Math.max(28, ((end - start) / 60) * HOUR_PX - 4),
                  left: "calc(" + (lane / lanes) * 100 + "% + 3px)",
                  width: "calc(" + 100 / lanes + "% - 6px)",
                }}>
                <span className="tt-block__subject">{store.subjects.nameOf(c.subjectId)}</span>
                <span className="tt-block__time">{timeLabel(c)}</span>
                {(c.room || c.teacher) && (
                  <span className="tt-block__room">{[c.room, c.teacher].filter(Boolean).join(" · ")}</span>
                )}
              </button>
            ))}
            {day === today && nowTop !== null && (
              <span className="tt-now" style={{ top: nowTop }} role="img" aria-label={"Now, " + clockTime(now)}></span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  );
}

export default function Timetable() {
  useStore();
  const openClassForm = useClassForm();
  const openSetup = useTimetableSetup();
  const openScan = useScanTimetable();
  const list = allClasses();

  /* /timetable?scan=1 (the dashboard's weekly check) opens the scanner. */
  const [params, setParams] = useSearchParams();
  const handled = useRef(false);
  useEffect(() => {
    if (params.get("scan") !== "1" || handled.current) return;
    handled.current = true;
    setParams({}, { replace: true });
    openScan();
  }, [params, setParams, openScan]);
  const today = todayName();
  const hasSubjects = store.subjects.all().length > 0;

  let content;
  if (!hasSubjects) {
    content = (
      <div className="card">
        <div className="empty">
          <EmptyArt name="timetable" />
          <p className="empty__title">Add your subjects first</p>
          <p className="empty__text">Your timetable is built from your subject list. Add them, or scan a photo of your timetable and Synora adds them for you.</p>
          <div className="row row--wrap" style={{ justifyContent: "center", gap: 10, marginTop: 16 }}>
            <button type="button" className="btn btn--primary" onClick={openScan}><Icon name="camera" size={16} />Scan a photo</button>
            <Link className="btn btn--ghost" to="/settings">Add subjects</Link>
          </div>
        </div>
      </div>
    );
  } else if (!list.length) {
    content = (
      <div className="card">
        <div className="empty">
          <EmptyArt name="timetable" />
          <p className="empty__title">No classes yet</p>
          <p className="empty__text">Scan a photo of your timetable, or walk through the week and add your classes by hand.</p>
          <div className="row row--wrap" style={{ justifyContent: "center", gap: 10, marginTop: 16 }}>
            <button type="button" className="btn btn--primary" onClick={openScan}><Icon name="camera" size={16} />Scan a photo</button>
            <button type="button" className="btn btn--ghost" onClick={openSetup}>Set it up by hand</button>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <>
      <WeekBoard list={list} today={today} onOpen={openClassForm} />
      <div className="tt-grid">
        {DAYS.map((day) => {
          const classes = list.filter((c) => c.day === day).sort(byStart);
          return (
            <div key={day} className={"tt-day" + (day === today ? " tt-day--today" : "")}>
              <div className="tt-day__name">{day.slice(0, 3)}</div>
              {classes.length ? classes.map((c) => {
                const name = store.subjects.nameOf(c.subjectId);
                if (!name) return null;   // subject was deleted
                return (
                  <button key={c.id} type="button" className="tt-slot" style={subjectVar(store.subjects.byId(c.subjectId)?.color)}
                    onClick={() => openClassForm(getClass(c.id))}>
                    <span className="tt-slot__time">{timeLabel(c)}</span>
                    <span className="tt-slot__subject">{name}</span>
                    {(c.room || c.teacher) && (
                      <span className="tt-slot__room">{[c.room, c.teacher].filter(Boolean).join(" · ")}</span>
                    )}
                  </button>
                );
              }) : <span className="tt-day__empty">—</span>}
            </div>
          );
        })}
      </div>
      </>
    );
  }

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Your week of classes at a glance. Tap any class to edit it.</p>
        <div className="page__actions">
          {allClasses().length > 0 && (
            <button type="button" className="btn btn--ghost" title="Your classes as weekly events in an .ics file"
              onClick={() => exportCalendar({ tasks: false, classes: true }, "synora-timetable.ics")}>
              <Icon name="download" size={16} />Export
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={openScan}>
            <Icon name="camera" size={16} />Scan a photo
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => openClassForm(null)}>
            <PlusIcon />
            Add class
          </button>
          {/* The guided way in: walk the week day by day. */}
          <button type="button" className="btn btn--primary" onClick={openSetup}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Set Timetable
          </button>
        </div>
      </div>
      <div>{content}</div>
    </>
  );
}
