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
- **CGPA calculator** — credit‑weighted CGPA on a single 10‑point system
  (O / A+ / A / B+ / B, plus the failure states E1 / E2 / E3), with a live ring,
  totals, and a split bar chart (passing grades above the line, failures below).
- **Attendance calculator** — per‑subject percentage plus the practical answer:
  *how many classes must I attend to reach my target*, or *how many can I miss*.
- **Achievements** — badges that unlock from real behaviour (first task, 5/10
  tasks, a completion streak, beating deadlines, planning your timetable, …).
- **Notifications** — a centre that surfaces due/overdue tasks, attendance
  warnings and unlocked achievements, with unread counts and mark‑read / clear.
- **Settings** — profile (first name, last name, username, email, program,
  semester, attendance target), avatar, your subject list, appearance
  (light/dark) and the grade scale.
- **Accounts, themes & persistence** — accounts with first name, last name,
  username, email and password; a real light/dark theme; everything saved to
  `localStorage` under the signed-in user.
- **Onboarding** — a six-step *Personalize Synora* flow between signing up and
  the dashboard: avatar, program, semester, subjects and credits, attendance
  target, appearance.
- **Landing page** — features, how it works, why Synora, FAQ and a Contact Us
  section with a validated Get in Touch form.

---

## Accounts and onboarding

### Signing up

An account is created with **first name, last name, username, email, password
and password confirmation**. First and last name are stored separately rather
than as one string, which is what makes initials correct everywhere:

```
Manan Kochhar    → MK
Arshpreet Kaur   → AK

```

There is exactly one function for this — `Synora.util.initials(first, last)` in
`storage.js` — used by the sidebar, topbar, dashboard, settings and onboarding,
so two screens can never disagree about someone's initials.

### The sign-in page shows no session state

The sign-in page is a sign-in form and nothing else. It does **not** show a
"Signed in as … / Sign out" bar, even when a session already exists: that
answered a question nobody on that page asked, and it put the account holder's
real name on a screen anyone can open.

None of the session machinery was removed — the session is still written on
sign-in, still read by every app page, and still what the sidebar, Settings and
the profile menu display. **Signing out lives in the app's profile menu**, and
in Settings, which is where a signed-in person looks for it.

### The confirmation screen waits for you

After a successful sign-up or sign-in, a confirmation screen appears:

```
You're signed in.
Welcome to Synora, Manan.
Let's get your workspace ready.

[ Personalize my workspace ]
[ Go to dashboard ]
```

It **does not redirect on a timer**. It used to show itself for 900 ms and then
navigate, which is not a choice — it is an announcement on the way somewhere the
app had already decided to go. Both options are ordinary `<a href>` links, so
neither can be broken by a script that failed to run.

### Personalize Synora

Onboarding at `app/onboarding.html` is **offered, never forced** — six short
steps:

| Step | Question | Skippable |
|------|----------|-----------|
| 1 | Choose your avatar | Yes — falls back to your initials |
| 2 | Program and semester | No |
| 3 | Subjects, credits and attendance tracking | No — at least one subject |
| 4 | Target attendance | No — defaults to 75% |
| 5 | Light or dark | No — defaults to the current theme |
| 6 | Review and finish | — |

Steps 2 and 3 can't be skipped because the rest of the app is built on them:
attendance, CGPA and the timetable all read from the subject list, and the
dashboard greeting uses the program and semester.

**The app guard no longer forces onboarding.** There used to be a second gate
that bounced anyone who hadn't finished setup back into it — which made both
"Go to dashboard" and "Save & finish later" into buttons that returned you to
where you just left. The dashboard now shows a *Finish setting up your
workspace* card instead, and Settings keeps the route open indefinitely.

**Onboarding state is explicit and saved.** The answers live in a `draft`
object, not in whichever inputs are currently in the DOM, and that object is
mirrored to `synora:<username>:onboarding` on every change. Reloading the page
halfway through returns you to the same step with the same answers; finishing
clears the draft.

### A new account starts empty

This is deliberate and worth stating plainly: a newly created account has

```
0 tasks   0 notes   0 timetable entries
0 attendance records   0 grades   0 achievements   0 subjects
```

Nothing is pre-filled, and no sample data is written for ordinary accounts. The
only numbers on a new dashboard are zeros until that person adds something
themselves.

### The demo account

One sample workspace exists, for demonstrations:

```
Arshpreet Kaur · @arsh2309 · arsh2309@gmail.com
B.E CSE AIML · Semester 3 · 75% target · dark mode

Subjects (6)
  FEE                    3 credits   attendance tracked
  DBMS                   3 credits   attendance tracked
  SDE                    3 credits   attendance tracked
  OOPS                   4 credits   attendance tracked
  Cyber Security         3 credits   NOT tracked
  Finance for Everyone   1 credit    NOT tracked
```

It ships with a semester's worth of realistic data — twenty tasks across
completed, due-today, overdue and upcoming; five notes; a fifteen-class weekly
timetable; attendance for the four tracked subjects; grades for all six; and the
notifications and achievements those produce. The **Use the demo account**
button on the sign-in page fills the credentials in for you.

The two untracked subjects are the point of this dataset. They demonstrate that
a subject can count fully towards the CGPA while being completely absent from
Attendance, its chart and its warnings:

```
Attendance page   FEE · DBMS · SDE · OOPS
CGPA page         FEE · DBMS · SDE · OOPS · Cyber Security · Finance for Everyone
```

Its data is written into `arsh2309`'s own namespaced keys the first time it signs
in and is fully editable after that. The seeding is tied to that username
specifically (`scripts/demo-data.js`), never to "somebody signed in" — which is
what used to give every new account a fake task history.

The fixture carries a `SEED_VERSION`. Because the demo seeds once and then acts
like an editable workspace, a change to the shipped data would otherwise never
reach a browser that had already opened the demo. Bumping `SEED_VERSION`
(in `demo-data.js`) makes the next demo sign-in **re-seed** — resetting the demo
to the new shipped state — so an updated avatar, subject or credit always shows.
Sign out and back in (or press *Use the demo account*) to pick it up.

> **This is a local demo account, not a real one.** The password is
> `arsh2309`, stored the same hashed way as any other account in this project.
> It unlocks nothing but this browser's `localStorage`, it is not a secret, and
> it should not be read as a statement about credential security. See
> *Security & limitations* below.

---

## Subjects are the source of truth

The subject list entered during onboarding is the canonical academic list. Each
subject is `{ id, name, credits, trackAttendance }`, and every other module
points at it **by id**:

```
subjects  ──┬── attendance   { subjectId, total, attended }
            ├── cgpa         { subjectId, grade }
            └── timetable    { subjectId, day, startTime, endTime }
```

Practical consequences:

- You pick subjects from a dropdown; you never retype a subject name.
- Renaming *DBMS* in Settings renames it on the attendance cards, the charts and
  the timetable at once — because none of them stored the name in the first place.
- Deleting a subject removes its attendance record, grade and classes with it,
  so nothing is left pointing at a subject that no longer exists. The confirm
  dialog names exactly what will go.
- Credits live on the subject, so the CGPA and the subject list can't disagree.

### `trackAttendance` — attendance is optional per subject

When a subject is added — in onboarding or in Settings — Synora asks:

```
Record attendance for this subject?     ( ) Yes    ( ) No
```

That answer is stored **on the subject** and controls exactly one thing:

| | `trackAttendance: true` | `trackAttendance: false` |
|---|---|---|
| Attendance page | shown | **hidden** |
| Attendance chart | shown | **hidden** |
| Attendance warnings | can raise them | **never** |
| CGPA | counts fully | **counts fully** |
| Timetable | available | **available** |
| Credits & grade | kept | **kept** |

Some subjects genuinely don't take a register — a one-credit elective, an audit.
Forcing them onto the attendance page produced a permanent 0% for a class nobody
was counting, and a recurring *"… is at 0%"* notification for it.

This is **general behaviour for every user**, not a special case for the demo
account. `Synora.store.subjects.tracked()` is the single filter, and
`Synora.derive.attendance()` walks the tracked subjects rather than the stored
attendance rows — so a subject whose tracking is switched off leaves the page,
the chart and the warnings at the same instant, with no stale row behind it.

Subjects saved before this field existed are read as **tracked**, because that is
what they were doing at the time; an upgrade should never silently empty
somebody's attendance page.

---

## Avatars

Twelve illustrated avatars in `assets/avatars/`, plus an initials avatar in six
colours. The stored value says which is in use:

```js
{ type: "illustration", id: "avatar-03" }   // one of the twelve
{ type: "initials",     id: "sage" }        // initials on a colour
null                                        // nothing chosen → initials
```

Both appear in **one radio group** in onboarding and in Settings, which is what
makes them mutually exclusive without any extra state to keep in step.

### Licensing — the illustrations

The twelve illustrations are the **Lorelei** style from
[DiceBear](https://www.dicebear.com/styles/lorelei/), by the designer
**Lisa Wischofsky**, released under **CC0 1.0** (public domain — no attribution
required, commercial use allowed). Original source:
<https://www.figma.com/community/file/1198749693280469639>.

> Only that one style is used, and only its licence is being relied on.
> **DiceBear's styles do not share a single licence** — several are CC-BY-4.0 and
> would require visible credit — so "DiceBear avatars are CC0" would be an
> incorrect claim. Each downloaded file keeps its own `<metadata>` licence block.

They were **generated once and committed to this repository** rather than
requested from the API at runtime. That matters here: they render with no
network, nothing about the user is sent to a third party, and the grid cannot
half-load during a demonstration. They are vectors, so 28px in the sidebar is as
crisp as 96px in onboarding.

They were **curated, not taken as the first twelve generated**. Twenty-four were
rendered and half were rejected — the squinting, scowling and otherwise odd
expressions — leaving twelve friendly faces with genuinely different hair over a
rotating set of Synora-tinted backgrounds, all in one visual family so the grid
reads as a set.

The same picker is used in onboarding **and** in Settings. Its styles live in
`components.css` rather than `onboarding.css`, because Settings loads the former
and not the latter — when they lived in `onboarding.css` the picker arrived on
the Settings page with no styles at all and collapsed to one option per row.

### The initials avatar

Six colours, derived from the Synora palette rather than six greens — sage, ink,
taupe, slate, clay and mist, each pairing a background with a foreground that
clears WCAG AA for large text.

The initials themselves come from **one function**,
`Synora.util.initials(first, last)` in `storage.js`, used by the sidebar,
topbar, dashboard, settings and onboarding:

```
Manan Kochhar    → MK      (not MA)
Arshpreet Kaur   → AK
```

It takes the first letter of the **first** name and the first letter of the
**last** name. The onboarding preview updates from the name on the account, so
the swatches always show the right two letters.

---

## The brand mark

`assets/logo_idea.png` is the source concept and is kept untouched. From it,
six transparent PNGs were cut — a horizontal lockup, the S monogram alone, and a
stacked lockup, each in a light-background and a dark-background variant:

```
assets/
  logo_idea.png            the original concept (source, unmodified)
  logo-lockup-light.png    mark + wordmark, for light backgrounds
  logo-lockup-dark.png     mark + wordmark, for dark backgrounds
  logo-mark-light.png      the S monogram alone
  logo-mark-dark.png
  logo-stacked-light.png   mark above wordmark
  logo-stacked-dark.png
  favicon-32.png  favicon-180.png
```

Rather than recolouring one image with CSS filters, which never looks right,
both variants sit in the DOM and CSS shows whichever matches the theme:

```css
.logo .logo__dark { display: none; }
[data-theme="dark"] .logo .logo__light { display: none; }
[data-theme="dark"] .logo .logo__dark  { display: block; }
```

Sizing is by height only, with `width: auto`, so proportions are never
stretched. The lockup appears in the landing navbar and footer, the app sidebar
and both auth pages; the **mark on its own** sits in the loading screen's badge,
and the stacked variant closes onboarding.

---

## The loading screen

The splash is a small animated composition, built entirely in CSS/SVG (no
libraries):

- the **Synora mark** in a circular surface badge that **pops in** on load;
- a **spinning conic-gradient arc** around the badge — the loading indicator,
  drawn as a full disc with a radial mask cutting all but a rotating edge band;
- a soft **aura** behind that **breathes** in the brand colour;
- the **"Synora" wordmark** with a slow light **sheen** sweeping across it, and
  the tagline **fading up** just after — a short staggered reveal.

It stays for a minimum of **2000ms** — long enough for the mark to land rather
than blink — then hands over rather than cutting: it fades and lifts while
`.is-ready` on `<body>` starts the hero's staggered entrance underneath, so the
two movements read as one.

Under `prefers-reduced-motion: reduce` the wait drops to **600ms** and every
transform, spin, blur and sweep is removed — the wordmark is repainted solid so
the clipped-text sheen can't leave it invisible.

---

## The grading system

Synora has **one** 10-point grading system. A single grade carries the whole
result, pass or fail:

| Grade | Meaning | Points |
|-------|---------|--------|
| `O`  | Outstanding | 10 |
| `A+` | Excellent | 9 |
| `A`  | Very good | 8 |
| `B+` | Good | 7 |
| `B`  | Above average | 6 |
| `E1` | Failed in Internals | 0 |
| `E2` | Failed in End Term Exam | 0 |
| `E3` | Failed in Both Internals and End Term | 0 |

Two things were removed to get here:

- **The separate "Exam status" field is gone.** A grade and a status sitting
  side by side described one outcome twice, and nothing stopped them
  contradicting each other. The grade now *is* the result.
- **The 4.0 US scale is gone.** `E1`/`E2`/`E3` are specific to this system;
  offering them alongside a US scale produced combinations that meant nothing.

> **Stated assumption.** A failing grade earns **zero grade points but still
> carries its credits into the denominator** — the standard way a backlog drags
> a CGPA down. This project has no university-specific rule to defer to, so the
> assumption is documented here rather than left implied.

---

## Charts

### Attendance

Subjects along the x-axis, **0%–100% fixed** on the y-axis. The scale never
adapts to the tallest bar: a percentage has a real ceiling, and a chart that
stretched to fit 83% would make 83% look like a full house. A dashed line marks
the target, read from `profile.targetAttendance` rather than assumed to be 75.
Bars below target turn red, and the chart carries a text summary for screen
readers.

```
attendance % = attended / held × 100
```

Only subjects with `trackAttendance: true` appear. `held = 0` shows *"No classes
recorded yet"* rather than `0%`, `NaN` or `Infinity` — the divide is guarded at
the one place the percentage is computed.

### CGPA

Two different kinds of result, so two directions.

**Above the baseline — the passing grades**, on a ladder read upwards:

```
B (6) → B+ (7) → A (8) → A+ (9) → O (10)
```

**Below the baseline — the three failure states**, each labelled individually:

```
        O
        A+
        A
        B+
        B
  ───────────── 0
        E1
        E2
        E3
```

`E1`, `E2` and `E3` are **never merged into one "E1/E2/E3" label** — which
examination was failed is the entire point of the distinction. They hang below
zero because a failure is not a small grade.

Internally the mapping is only ever a bar height (`B → 1 … O → 5` upwards,
`E1 → 1 … E3 → 3` downwards); the axes are labelled with the letters students
actually use, not the numbers the code adds up.

The x-axis carries **every graded subject**, tracked for attendance or not. Long
names stay readable via a `title` tooltip and the chart scrolls inside its own
container — the page itself never scrolls sideways.

```
CGPA = Σ(credits × grade point) / Σ(credits)
```

Credits come from the subject record and grades from the CGPA record, so the
CGPA is always computed, never stored.

---

## Attendance page

Each tracked subject is a card carrying the two counts it is made of:

```
FEE                                    [edit] [delete]
Held        −  39  +
Attended    −  32  +
Attendance            82.05%
You can miss 3 more classes and stay above 75%.
```

- **`+` / `−` are for the everyday correction** of a count, and update the
  percentage, the ring, the chart and the warnings immediately.
- **Edit** is for the major changes — the subject's name, its credits, whether
  it records attendance at all, and a direct correction of both numbers.
- **Delete** removes the subject itself and everything pointing at it, naming
  what will go before it does.
- **There is no "Track a subject" button.** A subject is not something you add
  here; it is something you already have, which either takes a register or
  doesn't. Adding one here too would have created a second list to disagree with
  the first.
- **Credits are not shown.** They are a CGPA fact and say nothing about whether
  you turned up.

Two invariants are enforced in one place (`setCounts`), not at each button:

```
held ≥ 0
0 ≤ attended ≤ held
```

Lowering *held* below *attended* pulls *attended* down with it, because a
student cannot attend more classes than were held.

---

## Contact form

The landing page has a **Contact Us** section: phone, email and office on one
side, a **Get in Touch** form (Name, Email, Phone Number, Message) on the other.
Validation is inline — no `alert()` dialogs — and each field's error clears as
soon as you edit it.

**It does not send email.** Synora has no backend, and the code doesn't pretend
otherwise: there is no `fetch()` to an invented endpoint and no fake delay
dressed up as delivery. It validates the message, confirms it on the page, and
says plainly that nothing left the browser. Making it real is a server-side job;
the single place to change is `submit()` in `scripts/contact.js`.

The contact details are **placeholders** and marked as such. Replace the four
values in `CONTACT_INFO` at the top of `scripts/contact.js` and the whole
section updates:

```js
var CONTACT_INFO = {
  phone: "+91 00000 00000",
  email: "hello@synora.example",
  office: "Add your campus or office address",
  mapUrl: ""            // the "View location" link hides itself while empty
};
```

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

## The landing navbar

Three grid tracks, and the outer two are the **same width** — that is what
actually centres the middle one:

```css
.nav {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-32);
}
```

`minmax(0, 1fr)` rather than `1fr`, so the outer tracks can shrink below their
content instead of forcing the header wider than the viewport. With flexbox and
`margin-left: auto` the links would sit wherever the brand and the buttons left
them — centred only by luck, and in practice pushed right.

The header reads, left to right:

```
Synora   Features  How it works  Why Synora  FAQ  Contact Us   ☾   Sign in   Create account
```

The two actions are buttons: **"Sign in" is a ghost (outlined) button and
"Create account" the filled primary** — the standard secondary + primary pair.
The grid keeps the middle link group dead-centre in the viewport regardless of
how wide the actions cluster grows, so the centring holds as the viewport, the
logo or the button widths change.

Below 900px the links and buttons move into the existing CSS-only mobile menu
(a checkbox and a `<label>`, no JavaScript), which carries the same five links.

---

## The landing page preview

*A look inside* shows **one real screenshot of the running app** — the dashboard,
signed in as the demo account — in a framed card. It used to be a hand-coded
HTML/CSS mock of an older, simpler UI, which meant the page advertised a product
that no longer existed. (An earlier version cycled dashboard / attendance / CGPA
through a tab strip; that was trimmed to a single dashboard shot.)

The screenshot lives in `assets/preview/dashboard.png`. Because it is updated in
place (same filename), the `<img>` src carries a `?v=` query so browsers don't
serve a cached copy — bump it whenever the image is regenerated. Regenerate with
headless Chrome after any UI change: seed the demo account, open the dashboard,
and screenshot it.

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
├── notes.html              Standalone study/viva notes — ZERO dependencies
├── README.md
│
├── app/                    The product (requires an account)
│   ├── login.html  signup.html  onboarding.html
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
│   ├── landing.css         Landing-page layout, contact section, loader
│   ├── auth.css            Login / sign-up layout
│   └── onboarding.css      Personalize Synora
│
├── scripts/
│   ├── theme.js            Pre-paint theme application (no flash)
│   ├── storage.js          The data layer — the only file that touches localStorage
│   ├── avatars.js          The twelve illustrations + six initials colours
│   ├── demo-data.js        The arsh2309 sample workspace (that account only)
│   ├── auth.js             Sign up / sign in
│   ├── onboarding.js       Personalize Synora
│   ├── contact.js          Contact details + Get in Touch validation (landing)
│   ├── app.js              App shell: sidebar, topbar, toasts, modals,
│   │                       notifications + achievements + streak engines
│   ├── dashboard.js  tasks.js   calendar.js   notes.js   timetable.js
│   └── cgpa.js       attendance.js  achievements.js  notifications.js  settings.js
│
└── assets/
    ├── avatars/            avatar-01.svg … avatar-12.svg (Lorelei, CC0)
    ├── preview/            dashboard.png — the "A look inside" screenshot
    └── …                   logo lockups, favicons
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
- Per user: `synora:<username>:<collection>` — `subjects`, `tasks`, `notes`,
  `timetable`, `attendance`, `cgpa`, `achievements`, `notifications`, `profile`,
  `meta`

Namespacing by username means two accounts on the same browser never see each
other's data. There is no global task array; sign out as one person and in as
another and the second sees only their own workspace.

```
<username>
├── profile          firstName, lastName, username, email, avatar,
│                    program, semester, targetAttendance, appearance, onboarded
├── subjects         [{ id, name, credits }]        ← the academic source of truth
├── tasks            [{ id, title, subject, deadline, priority, status, … }]
├── notes            [{ id, title, body, category, … }]
├── timetable        [{ id, subjectId, day, startTime, endTime, room, teacher }]
├── attendance       [{ id, subjectId, total, attended }]
├── cgpa             { scaleId, subjects: [{ id, subjectId, grade, exam }] }
├── achievements     { unlocked: { achievementId: ISO date } }
├── notifications    [{ id, key, type, title, body, read, seen, … }]
└── meta             { streak, lastCompletionDate, demo }
```

Percentages, CGPA, streaks and task counts are **derived, never stored**. There
is one set of underlying numbers and everything else is computed from it, so no
two figures can drift apart.

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

Then open `http://localhost:8000/`.

`notes.html` is the exception — it has **no external CSS, JavaScript, fonts or
images at all**, so it opens correctly with a plain double click (`file://`).
If the browser blocks `localStorage` on a `file://` origin, the page still works;
it just won't remember your reading progress, quiz answers or theme.

- **To see it as a new student would:** create an account and walk through
  *Personalize Synora*. Your dashboard will be empty — that's correct.
- **To see it populated:** on the sign-in page, press **Use the demo account**
  and sign in as Arshpreet Kaur.

---

## Security & limitations (honest notes)

- **Frontend only.** There is no server and no real authentication. Passwords
  are stored *hashed* (not plaintext) as a courtesy, but this is obfuscation,
  not security — anyone with access to the browser can read `localStorage`.
  **Don't reuse a real password here.**
- **The demo credential is not a real credential.** `arsh2309` / `arsh2309` is a
  local fixture for demonstrating a populated workspace. It is documented as
  sample data, not as a security statement, and it unlocks nothing beyond this
  browser's `localStorage`.
- **Per-device.** Data lives in one browser on one device; it doesn't sync, and
  clearing browser data clears it.
- **The contact form sends nothing.** It validates and confirms on the page; no
  email is delivered, and the UI says so.
- No server-side validation, no encryption at rest.
- **CGPA treats a failure as 0 points with credits still counted.** That is a
  stated assumption, not a universal academic rule — see *The grading system*.
- **Grades from before Phase 3** (`C`, `P`, `F`, or anything on the old 4.0
  scale) are no longer valid values. They are not deleted, but they read as
  *Not graded* until re-picked, and they don't contribute to the CGPA.
- **`notes.html` duplicates explanation on purpose.** It is a standalone
  teaching document with its own copy of everything it needs; it is not wired to
  the app and will not follow a change made in `scripts/`.

---

## Future scope

Backend + real authentication · cloud sync across devices · a database ·
a real contact endpoint so Get in Touch delivers mail · real push
notifications · AI study planning · syllabus/calendar import · a mobile app.

---

© 2026 Synora.
