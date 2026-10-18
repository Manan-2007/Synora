import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import Icon from "./Icon.jsx";
import { useTaskForm } from "./tasks/TaskForm.jsx";
import { useClassForm } from "../pages/timetable/ClassForm.jsx";
import { NAV } from "../data/nav.js";
import { store } from "../lib/storage.js";
import { allTasks } from "../lib/tasks.js";
import { allNotes } from "../lib/notes.js";
import { toggleTheme } from "../lib/theme.js";
import { exportCalendar } from "../lib/ics.js";
import { subjectVar } from "../lib/colors.js";
import { relativeDay } from "../lib/util.js";

/* =========================================================
   ⌘K / Ctrl+K — jump anywhere, find anything.

   One box searches pages, actions, tasks, notes and subjects.
   ↑ ↓ move, Enter opens, Esc closes. The topbar's search
   button opens it too (openPalette()), for touch screens.
   ========================================================= */

const OPEN_EVENT = "synora:palette";
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT));
export const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/* Every word typed must appear somewhere in the text. */
function matches(query, ...fields) {
  const hay = fields.filter(Boolean).join(" ").toLowerCase();
  return query.split(/\s+/).every((w) => hay.includes(w));
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const returnFocus = useRef(null);
  const navigate = useNavigate();
  const openTaskForm = useTaskForm();
  const openClassForm = useClassForm();

  useEffect(() => {
    const show = () => {
      returnFocus.current = document.activeElement;
      setQuery("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((was) => { if (!was) { returnFocus.current = document.activeElement; setQuery(""); setActive(0); } return !was; });
      }
    };
    window.addEventListener(OPEN_EVENT, show);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener(OPEN_EVENT, show); document.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => inputRef.current && inputRef.current.focus());
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
      const back = returnFocus.current;
      if (back && document.contains(back)) back.focus();
    };
  }, [open]);

  const groups = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    const go = (path) => () => navigate(path);

    const actions = [
      { id: "a-task", label: "New task", icon: "plus", run: () => openTaskForm(null) },
      { id: "a-note", label: "New note", icon: "note", run: go("/notes?new=1") },
      { id: "a-class", label: "Add a class to the timetable", icon: "clock", run: () => openClassForm(null) },
      { id: "a-focus", label: "Start a focus session", icon: "timer", run: go("/focus") },
      { id: "a-theme", label: "Switch light / dark theme", icon: "moon", run: toggleTheme },
      { id: "a-ics", label: "Export calendar (.ics)", icon: "download", run: () => exportCalendar({ tasks: true, classes: true }) },
    ].filter((a) => !q || matches(q, a.label));

    const pages = NAV.flatMap((s) => s.items)
      .filter((p) => !q || matches(q, p.label, p.id))
      .map((p) => ({ id: "p-" + p.id, label: p.label, hint: "Page", icon: p.icon, run: go(p.path) }));

    if (!q) return [{ name: "Actions", items: actions }, { name: "Go to", items: pages }];

    const tasks = allTasks()
      .filter((t) => matches(q, t.title, t.subject, t.description, ...(t.subtasks || []).map((s) => s.text)))
      .sort((a, b) => (a.status === "completed") - (b.status === "completed"))
      .slice(0, 6)
      .map((t) => ({
        id: "t-" + t.id, label: t.title, icon: "check", done: t.status === "completed",
        hint: [t.subject, t.status === "completed" ? "Done" : t.deadline && relativeDay(t.deadline)].filter(Boolean).join(" · "),
        run: () => openTaskForm(t),
      }));

    const notes = allNotes()
      .filter((n) => matches(q, n.title, n.body, n.category))
      .slice(0, 5)
      .map((n) => ({ id: "n-" + n.id, label: n.title, hint: n.category || "Note", icon: "note", run: go("/notes?open=" + encodeURIComponent(n.id)) }));

    const subjects = store.subjects.all()
      .filter((s) => matches(q, s.name))
      .slice(0, 4)
      .map((s) => ({
        id: "s-" + s.id, label: s.name, hint: s.credits + " credits", color: s.color,
        run: go(s.trackAttendance ? "/attendance" : "/cgpa"),
      }));

    return [
      { name: "Tasks", items: tasks },
      { name: "Notes", items: notes },
      { name: "Subjects", items: subjects },
      { name: "Go to", items: pages },
      { name: "Actions", items: actions },
    ].filter((g) => g.items.length);
  }, [open, query, navigate, openTaskForm, openClassForm]);

  const flat = groups.flatMap((g) => g.items);
  const current = Math.min(active, Math.max(0, flat.length - 1));

  /* Keep the highlighted row in view. */
  useEffect(() => {
    const el = listRef.current && listRef.current.querySelector('[aria-selected="true"]');
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [current, open]);

  if (!open) return null;

  function close() { setOpen(false); }
  function run(item) {
    close();
    /* After the palette is gone, so a dialog it opens gets the focus. */
    setTimeout(item.run, 0);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((current + 1) % Math.max(1, flat.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((current - 1 + flat.length) % Math.max(1, flat.length)); }
    else if (e.key === "Enter") { e.preventDefault(); if (flat[current]) run(flat[current]); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "Tab") e.preventDefault();          // focus stays in the box
  }

  let index = -1;
  return createPortal(
    <div className="palette-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search Synora">
        <div className="palette__search">
          <Icon name="search" size={18} />
          <input ref={inputRef} className="palette__input" type="text" value={query} autoComplete="off" spellCheck="false"
            placeholder="Search tasks, notes, subjects or pages…"
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list"
            aria-activedescendant={flat[current] ? "pal-" + flat[current].id : undefined}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKeyDown} />
          <kbd className="palette__esc">Esc</kbd>
        </div>
        <div className="palette__list" id="palette-list" role="listbox" ref={listRef} aria-label="Results">
          {flat.length === 0 && <p className="palette__empty">Nothing matches “{query.trim()}”.</p>}
          {groups.map((g) => (
            <div key={g.name} role="group" aria-label={g.name}>
              <div className="palette__group" aria-hidden="true">{g.name}</div>
              {g.items.map((item) => {
                index++;
                const i = index;
                return (
                  <div key={item.id} id={"pal-" + item.id} role="option" aria-selected={i === current}
                    className={"palette__item" + (i === current ? " is-active" : "") + (item.done ? " is-done" : "")}
                    onMouseMove={() => { if (i !== current) setActive(i); }} onClick={() => run(item)}>
                    {item.color
                      ? <span className="palette__icon"><span className="subject-dot" style={subjectVar(item.color)}></span></span>
                      : <span className="palette__icon"><Icon name={item.icon} size={16} /></span>}
                    <span className="palette__label">{item.label}</span>
                    {item.hint && <span className="palette__hint">{item.hint}</span>}
                    <span className="palette__enter" aria-hidden="true"><Icon name="arrowRight" size={14} /></span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="palette__foot" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>{isMac() ? "⌘" : "Ctrl"}</kbd><kbd>K</kbd> toggle</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
