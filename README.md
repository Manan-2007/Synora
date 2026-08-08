# Synora

**One calm home for everything you're studying.**

Synora is a student productivity workspace that brings tasks, deadlines, a
calendar, quick notes, a timetable, CGPA, attendance, achievements and
notifications into a single, quiet dashboard. It's built to feel like a real
SaaS product — not a collection of separate HTML pages — while staying entirely
within plain **HTML, CSS and vanilla JavaScript**.

---

## Problem statement

A typical student's academic life is scattered across six notebooks, three apps
and a group chat. Deadlines surprise you on Thursday night; attendance creeps
below the cut‑off before you notice; grades live in a spreadsheet you forget to
open. Synora solves the *fragmentation* problem: it puts the handful of things a
student actually tracks in one place, with one visual language and one dashboard
that answers "what do I need to do today?" at a glance.

---

## Features

- **Dashboard** — greeting, today's tasks, overdue/upcoming counts, a progress
  donut, today's schedule, quick actions, a mini‑calendar, upcoming deadlines,
  and an academic snapshot (attendance % + CGPA).
- **Tasks** — full CRUD with title, subject, description, deadline, priority
  (Critical / High / Medium / Low) and status (Not started / In progress /
  Completed). Views: All, Today, Upcoming, Overdue, Completed. Search + sort.
- **Calendar** — a month view where every task deadline appears on its day.
  Click a day to see what's due or add a task for that date.
- **Quick Notes** — lightweight create / edit / delete notes with an optional
  category and search.
- **Timetable** — a weekly Mon–Sun schedule (subject, room, instructor, time).
  A 7‑day grid on desktop that stacks into day cards on mobile.
- **CGPA calculator** — credit‑weighted CGPA with a selectable grade scale
  (10‑point Indian / 4.0 GPA), a live ring, totals, and a per‑subject bar chart.
- **Attendance calculator** — per‑subject percentage plus the practical answer:
  *how many classes must I attend to reach my target*, or *how many can I miss*.
- **Achievements** — badges that unlock from real behaviour (first task, 5/10
  tasks, a completion streak, beating deadlines, planning your timetable, …).
- **Notifications** — a centre that surfaces due/overdue tasks, attendance
  warnings and unlocked achievements, with unread counts and mark‑read / clear.
- **Settings** — profile, appearance (light/dark), default grade scale, and data
  controls (export to JSON, load sample data, delete all data).
- **Accounts, themes & persistence** — username/password accounts, a real
  light/dark theme, and everything saved to `localStorage` per user.

---

## Technology stack

- **HTML5** — semantic structure, forms, buttons, accessible markup.
- **CSS3** — custom properties (design tokens), Flexbox, Grid, media queries,
  a real dark theme, restrained transitions. No CSS framework.
- **Vanilla JavaScript** — DOM rendering, events, `localStorage`, the `Date`
  and `Intl` APIs, all calculations. No framework, no build step, no bundler.

There are **no dependencies to install**. The only external resource is the
Google Fonts stylesheet (Inter + Manrope); the app degrades gracefully to system
fonts without it.

---

## Design system

Synora is built on a single set of design tokens in
[`styles/tokens.css`](styles/tokens.css). The five‑colour palette is used with
intent, not sprayed everywhere:

| Token | Hex | Role |
|-------|-----|------|
| Ink | `#22252B` | Headings, deepest text, dark bands |
| Sage | `#53655C` | The brand accent — buttons, links, active states |
| Slate | `#A3AEB1` | Dividers, quiet icons, decorative surfaces |
| Mist | `#E5E8EB` | Borders and hairlines |
| Taupe | `#B09F95` | Warm accent — numbers, note cards, highlights |

Light mode uses a warm off‑white (`#FAF9F7`) rather than clinical white; dark
mode is a genuine charcoal theme that leans on borders instead of glow. Every
colour, spacing step, radius, shadow and font is a semantic CSS variable
(`--color-bg`, `--space-16`, `--radius-lg`, …) so the whole app stays consistent
and both themes are one edit away.

---

## Project structure

```
Synora/
├── index.html              Marketing landing page
├── notes.html              Project & viva notes (technical write-up)
├── README.md
│
├── app/                    The product (requires an account)
│   ├── login.html  signup.html
│   ├── dashboard.html
│   ├── tasks.html      calendar.html   notes.html    timetable.html
│   ├── cgpa.html       attendance.html
│   └── achievements.html  notifications.html  settings.html
│
├── styles/
│   ├── tokens.css          Design tokens (colour, type, spacing, dark theme)
│   ├── base.css            Reset + base elements
│   ├── components.css      Shared primitives (buttons, inputs, fields)
│   ├── app.css             App shell + all app components (this is the big one)
│   ├── landing.css         Landing-page layout
│   └── auth.css            Login / sign-up layout
│
├── scripts/
│   ├── theme.js            Pre-paint theme application (no flash)
│   ├── storage.js          The data layer — the only file that touches localStorage
│   ├── auth.js             Sign up / sign in
│   ├── app.js              App shell: sidebar, topbar, toasts, modals,
│   │                       notifications + achievements + streak engines
│   ├── dashboard.js  tasks.js   calendar.js   notes.js   timetable.js
│   └── cgpa.js       attendance.js  achievements.js  notifications.js  settings.js
│
└── assets/                 Images, favicon
```

### Architecture in one line

`HTML (structure)` → `CSS tokens (look)` → `storage.js (data)` → `app.js (shell
+ engines)` → `per-page script (that page's behaviour)`.

`app.js` builds the sidebar and topbar once from a single navigation model, so
every page shares one source of truth for chrome. Feature scripts wait for a
`synora:ready` event, then render into a placeholder element on their page.

---

## Functional modules

- **Dashboard** — reads from every module via `Synora.derive.*` and renders the
  overview. Quick‑add reuses the same task form as the Tasks page.
- **Tasks** — `Synora.tasks` exposes a reusable API (add/edit/delete/complete +
  a shared modal form) consumed by the Tasks page, the dashboard and the calendar.
- **Calendar** — shares the task store; deadlines render on their dates.
- **Notes / Timetable** — self‑contained CRUD over their own collections.
- **CGPA** — `CGPA = Σ(credit × grade point) / Σ(credits)` with a chosen scale.
- **Attendance** — `% = attended / total × 100`, plus classes‑needed and
  classes‑can‑miss maths.
- **Achievements / Notifications / Streak** — cross‑cutting engines in `app.js`;
  any data change calls `Synora.refresh()` to keep badges and alerts in sync.

---

## Data storage

Synora has **no backend**. Everything is stored in the browser's `localStorage`,
serialized with `JSON.stringify` and read back with `JSON.parse`, through a
single data layer (`storage.js`). Keys:

- Global: `synora-users`, `synora-session`, `synora-theme`
- Per user: `synora:<username>:<collection>` — `tasks`, `notes`, `timetable`,
  `attendance`, `cgpa`, `achievements`, `notifications`, `profile`, `meta`

Namespacing by username means two accounts on the same browser never see each
other's data.

---

## Responsive design

Built to work from ~320px phones to large monitors. Desktop uses a fixed
sidebar; below 900px it becomes an off‑canvas drawer with a hamburger toggle, so
you never have to scroll horizontally to navigate. The timetable switches from a
7‑column grid to stacked day cards, stat cards reflow, and the calendar
condenses on small screens.

---

## Accessibility

Semantic HTML, real `<button>`s (not clickable divs), form labels, visible
focus rings, keyboard‑dismissable modals/menus (Escape), `aria-live` toasts,
sufficient contrast, and status shown with text + icons — never colour alone.

---

## Running it

It's a static site — no build. Because it uses `localStorage` and module‑style
paths, serve it over HTTP rather than opening files directly:

```bash
cd Synora
python3 -m http.server 8000
```

Then open `http://localhost:8000/`, create an account, and you're in. A small
set of sample data is added on first sign‑in so the app isn't empty; you can
replace or clear it from **Settings**.

---

## Security & limitations (honest notes)

- **Frontend only.** There is no server and no real authentication. Passwords
  are stored *hashed* (not plaintext) as a courtesy, but this is obfuscation,
  not security — anyone with access to the browser can read `localStorage`.
  **Don't reuse a real password here.**
- **Per‑device.** Data lives in one browser on one device; it doesn't sync, and
  clearing browser data clears it. Use **Settings → Export** to back it up.
- No server‑side validation, no encryption at rest.

---

## Future scope

Backend + real authentication · cloud sync across devices · a database ·
real push notifications · AI study planning · syllabus/calendar import ·
a mobile app.

---

Built by Manan. © 2026 Synora.
