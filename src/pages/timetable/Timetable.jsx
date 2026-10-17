import { useCallback, useState } from "react";
import { Link } from "react-router";
import Icon from "../../components/Icon.jsx";
import { useModal, useModalClose } from "../../components/modal/ModalProvider.jsx";
import { useClassForm } from "./ClassForm.jsx";
import useStore from "../../hooks/useStore.js";
import { store } from "../../lib/storage.js";
import { toast } from "../../lib/toast.js";
import { DAYS, todayName, allClasses, getClass, removeClass, timeLabel } from "../../lib/timetable.js";

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
  const list = allClasses();
  const today = todayName();
  const hasSubjects = store.subjects.all().length > 0;

  let content;
  if (!hasSubjects) {
    content = (
      <div className="card">
        <div className="empty">
          <span className="empty__icon"><Icon name="clock" size={26} /></span>
          <p className="empty__title">Add your subjects first</p>
          <p className="empty__text">Your timetable is built from your subject list, so there is nothing to pick from yet.</p>
          <Link className="btn btn--primary" to="/settings">Add subjects</Link>
        </div>
      </div>
    );
  } else if (!list.length) {
    content = (
      <div className="card">
        <div className="empty">
          <span className="empty__icon"><Icon name="clock" size={26} /></span>
          <p className="empty__title">No classes yet</p>
          <p className="empty__text">Walk through the week and add your classes — pick a subject, a day and a time.</p>
          <button className="btn btn--primary" onClick={openSetup}>Set Timetable</button>
        </div>
      </div>
    );
  } else {
    content = (
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
                  <button key={c.id} type="button" className="tt-slot" onClick={() => openClassForm(getClass(c.id))}>
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
    );
  }

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Your week of classes at a glance. Tap any class to edit it.</p>
        <div className="page__actions">
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
