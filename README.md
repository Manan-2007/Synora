<div align="center">

# ✦ SYNORA ✦

### *One calm home for everything you're studying.*

<p align="center">
  <a href="#-what-is-synora">What is Synora?</a> •
  <a href="#-feature-highlights">Features</a> •
  <a href="#-pages--sections">Pages</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-design-philosophy">Design</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-deployment">Deployment</a>
</p>

**[▶ Live site — synora-v1.vercel.app](https://synora-v1.vercel.app/)**


[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![React Router](https://img.shields.io/badge/React_Router_8-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://synora-v1.vercel.app/)
[![Storage](https://img.shields.io/badge/Storage-LocalStorage-53655C?style=for-the-badge&logo=databricks&logoColor=white)](#-privacy--data)
[![Responsive](https://img.shields.io/badge/Design-Responsive-B09F95?style=for-the-badge)](#-responsive-design)
[![Theme](https://img.shields.io/badge/Theme-Light%20%7C%20Dark-22252B?style=for-the-badge)](#-design-philosophy)

<br />

**Synora** is a calm, distraction-free student workspace that unifies tasks, timetables, quick notes, attendance calculations, CGPA estimation, and achievement tracking into a single client-side dashboard. Built with **React + Vite**.

</div>

---

## ✦ What is Synora?

Academic life is often scattered across fragmented tools: assignment deadlines lost in chat groups, attendance percentages scribbled in notebooks, grades tracked on buried spreadsheets, and timetables saved as gallery screenshots. When key academic details are separated, deadlines become Thursday night surprises and attendance drops below mandatory cut-offs before anyone notices.

**Synora eliminates this fragmentation.** It provides one quiet, cohesive environment designed specifically for students. By bringing essential academic metrics into a single dashboard, Synora answers the question *"What do I need to focus on today?"* in one glance—without advertisements, subscriptions, a backend server, or unnecessary visual noise.

```
       ┌─────────────────────────────────────────────────────────┐
       │                         SYNORA                          │
       │                   The Calm Workspace                    │
       └────────────────────────────┬────────────────────────────┘
                                    │
    ┌──────────────┬────────────────┼───────────────┬────────────┐
    ▼              ▼                ▼               ▼            ▼
┌─────────┐  ┌───────────┐    ┌───────────┐   ┌───────────┐  ┌───────────┐
│  Tasks  │  │ Timetable │    │   Notes   │   │Attendance │  │   CGPA    │
│ & Dates │  │& Calendar │    │ & Archive │   │Calculator │  │Estimator  │
└─────────┘  └───────────┘    └───────────┘   └───────────┘  └───────────┘
```

---

## ✦ Feature Highlights

| Module | Core Capability | Key Detail |
| :--- | :--- | :--- |
| 📋 **Tasks & Assignments** | Priority-ranked assignment tracking | Dynamic date categorisation (Overdue, Due Today, Upcoming), 4 priority levels, completion tracking. |
| 📅 **Calendar & Timetable** | Dual-view academic scheduling | 7-day weekly schedule grid with room/instructor metadata alongside a monthly deadline overview. |
| 📝 **Quick Notes** | Subject-organized knowledge archive | Instant search-as-you-type, clean text cards, and subject-specific filtering for quick lecture capture. |
| 🎓 **CGPA Calculator** | Credit-weighted grade calculation | Comprehensive 10-point scale supporting distinct academic failure states (`E1`, `E2`, `E3`). |
| 📊 **Attendance Tracker** | Real-time threshold calculation | Dynamic calculation of exact classes you can safely miss or consecutive classes required to reach targets. |
| 🏆 **Achievements** | Motivation & consistency badges | System-awarded milestones for finishing assignments early, keeping streaks, and planning schedules. |
| 🔔 **Notification Centre** | Unified academic alerts | Aggregated alerts for pending deadlines, attendance warnings, and unlocked milestone badges. |
| 🌓 **Adaptive Theme Engine** | Light & Charcoal Dark modes | Persistent theme switching powered by semantic CSS custom properties with zero flash on load. |

---

### 📋 Tasks & Assignments
* **Granular Task Control:** Add, edit, delete, and complete assignments with titles, subject links, priorities (*Critical, High, Medium, Low*), and statuses (*Not started, In progress, Completed*).
* **Automated Date Derivation:** Tasks are dynamically grouped into *All, Today, Upcoming, Overdue,* and *Completed* based on live system dates rather than static manual flags.
* **Search & Sort:** Instantly search through assignments and sort by deadline or urgency.

### 📅 Calendar & Timetable
* **Weekly Class Schedule:** A 7-day Monday–Sunday matrix showing class timings, subjects, instructors, and room numbers. Reflows into collapsible day cards on mobile screens.
* **Monthly Deadline Calendar:** Visual overview showing all assignment deadlines mapped directly onto their calendar dates. Clicking any date reveals active items or opens a quick task creation dialog.

### 📝 Quick Notes
* **Frictionless Note Capture:** Fast, lightweight capture of formulas, study checklists, and lecture takeaways.
* **Subject Tagging & Search:** Notes are organized by subject and filterable through a live search bar.

### 🎓 CGPA Calculator
* **10-Point Academic Scale:** Accurately computes weighted CGPA using credits assigned to each subject:
  $$\text{CGPA} = \frac{\sum (\text{Credits} \times \text{Grade Point})}{\sum \text{Credits}}$$
* **Dedicated Failure States:** Uniquely models distinct exam outcomes without merging them:
  * `O` (10), `A+` (9), `A` (8), `B+` (7), `B` (6)
  * `E1` (Failed in Internals · 0 pts)
  * `E2` (Failed in End Term Exam · 0 pts)
  * `E3` (Failed in Both Internals & End Term · 0 pts)
* **Split Bar Visualisation:** High-contrast split bar chart displaying passing grades ascending above the baseline and backlog failure states descending below zero.

### 📊 Attendance Calculator
* **One-Touch Adjustments:** Incremental `+` and `−` controls for held and attended sessions.
* **Actionable Guidance:** Computes whether you are above or below your target percentage (e.g., 75%) and displays exact math:
  * *Classes you can safely miss while remaining above target.*
  * *Consecutive classes you must attend to recover your attendance.*
* **Selective Subject Tracking:** Non-attendance subjects (such as audits or electives) can be excluded from attendance warnings while remaining part of the CGPA calculation.

### 🏆 Achievements & Streaks
* **Behavior-Based Milestones:** Badges unlock automatically as you use the workspace—such as creating your first note, maintaining a study streak, completing multiple tasks, or setting up a full timetable.

---

## ✦ Pages & Sections

Every page is a client-side route handled by React Router:

| Route | Page |
| :--- | :--- |
| `/` | Public marketing landing page & feature showcase |
| `/login` | Account sign-in & demo account access |
| `/signup` | User registration (client-side) |
| `/onboarding` | 6-step workspace personalization wizard |
| `/dashboard` | Central command center & academic snapshot |
| `/tasks` | Task management & deadline tracking |
| `/calendar` | Monthly deadline calendar view |
| `/timetable` | Weekly 7-day class schedule |
| `/notes` | Subject-categorized study notes |
| `/attendance` | Attendance calculator & threshold analysis |
| `/cgpa` | Credit-weighted CGPA estimator & grade chart |
| `/achievements` | Milestone badges & streak statistics |
| `/notifications` | Aggregated alerts & academic warnings |
| `/settings` | Profile, avatar, subject catalog, & preferences |

Any unknown URL redirects to `/`.

---

## ✦ How It Works

Synora takes you from a blank slate to a structured academic routine in three clear steps:

```
    ┌─────────────────────────┐
    │ 1. Create Your Account  │ ──► Enter your name, username, email & password
    └───────────┬─────────────┘
                │
    ┌───────────▼─────────────┐
    │ 2. Make Synora Yours    │ ──► Choose avatar, configure subjects & attendance target
    └───────────┬─────────────┘
                │
    ┌───────────▼─────────────┐
    │ 3. Start With Clarity   │ ──► Open your unified dashboard with all tools linked
    └─────────────────────────┘
```

1. **Create Your Account:** Register with your name, username, email, and password. Synora creates a dedicated local workspace partition directly inside your browser.
2. **Make Synora Yours:** Step through an onboarding flow to pick an illustrated avatar or initials color, set your academic program and semester, define your subjects with credit weightings, and set your target attendance percentage.
3. **Start With a Clear Week:** Your dashboard opens with subjects already interconnected. Timetable entries, grade sheets, attendance monitors, and task forms read from the same subject catalog.

---

## ✦ Tech Stack

A small, modern stack: React for the UI, Vite for the build, and plain CSS for the design system. There is no CSS framework, UI kit, state library, or backend.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                TECH STACK                                 │
├───────────────────┬───────────────────────────────────────────────────────┤
│ UI                │ React 19 (function components & hooks, JSX)           │
│ Routing           │ React Router 8 (BrowserRouter, client-side routes)    │
│ Build & Dev       │ Vite 8 (dev server, production bundling)              │
│ Styling           │ CSS3 (Custom properties / Tokens, Grid, Flexbox)      │
│ Persistence       │ Client-side LocalStorage (Namespaced JSON store)      │
│ Typography        │ Google Fonts (Inter & Manrope with system fallbacks)  │
│ Hosting           │ Vercel (static build + Web Analytics)                 │
└───────────────────┴───────────────────────────────────────────────────────┘
```

* **Three runtime dependencies:** `react`, `react-dom` and `react-router`. Everything else is hand-written.
* **Framework-free logic layer:** Storage, auth, the notification engine, grades, attendance and timetable maths live in `src/lib/` as plain JavaScript, separate from the React components.
* **Store hook:** `useStore()` subscribes components to `localStorage` changes with `useSyncExternalStore`, so every page re-renders from the same source of truth.
* **CSS Custom Properties:** Complete design token architecture (`tokens.css`) defining typography, spacing, elevations, and dual-theme palettes. Page-specific stylesheets are mounted only on their own routes.
* **Accessible Component Architecture:** Native disclosure widgets for FAQ accordions, semantic form controls, skip-to-content links, and keyboard-trapped modal dialogs.
* **Pre-paint Theme Script:** A small inline script in `index.html` applies the saved theme before React loads, so there is no flash of the wrong theme.

---

## ✦ Design Philosophy

```
  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
  │  Calm by Design  │    │  Privacy First   │    │ Unified Context  │
  │ Minimalist focus │    │ On-device data   │    │ Single source of │
  │ & reduced noise  │    │ & no backend     │    │ academic truth   │
  └──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 🌿 Calm by Design
Academic tools often add stress through red warning badges, intrusive pop-ups, and cluttered sidebars. Synora uses subdued tones, generous whitespace, clear typography, and structured grids to keep attention on your coursework.

### 🔒 Privacy First
Your academic life belongs to you. Synora stores accounts, tasks, grades, and notes exclusively within your browser's local sandbox. Your data never leaves your machine, no cookies track your activity, and no remote server holds your academic history. The hosted site uses Vercel Web Analytics only for anonymous, cookie-free page-view counts.

### 🏛️ Unified Academic Context
Instead of forcing you to type the same subject names into four different utilities, Synora treats your **Subject List** as the canonical single source of truth. Renaming a subject in Settings instantly updates the Timetable, Attendance cards, and CGPA calculations across the entire application.

### 🎨 Semantic Design Tokens

| Token Name | Light Hex | Dark Hex | Application Role |
| :--- | :--- | :--- | :--- |
| `--ink` | `#22252B` | `#F3F4F6` | Primary headers, high-emphasis text, strong surfaces |
| `--sage` | `#53655C` | `#7C9285` | Primary brand accent, action buttons, active navigation |
| `--slate` | `#A3AEB1` | `#8A9699` | Subdued labels, structural icons, secondary elements |
| `--mist` | `#E5E8EB` | `#2E333D` | Borders, subtle dividers, inactive control outlines |
| `--taupe` | `#B09F95` | `#C4B5AC` | Warm accents, badges, highlights, note card accents |

---

## ✦ User Experience & Interface

```
[ Splash Reveal ] ──► [ Centered Navbar ] ──► [ Interactive Hero ] ──► [ Feature Showcase ]
       │                      │                         │                      │
   2000ms / 600ms       3-Track Centered          Live Task Preview      Card Grid & Stats
   Motion Handover      Brand & Quick Nav         Streak Badges          & Real Screenshot
```

* **Staggered Splash Screen:** A CSS/SVG loading badge with a rotating gradient aura and sweeping wordmark sheen welcomes the user for 2000ms (or 600ms when `prefers-reduced-motion` is active) before smoothly handing over to the page content.
* **Balanced 3-Track Navigation:** A CSS Grid header (`minmax(0, 1fr) auto minmax(0, 1fr)`) ensures centered links while actions and branding align symmetrically on the sides.
* **CSS-Only Mobile Navigation:** Below 900px, navigation links reflow cleanly into a slide-down mobile panel controlled through an accessible, zero-JavaScript checkbox toggle.
* **Non-Blocking Feedback:** In-app operations use subtle toast alerts and inline field validation rather than disruptive browser dialogs.

---

## ✦ Privacy & Data Architecture

Synora operates on a transparent, purely client-side data model powered by standard browser `localStorage`.

```
localStorage
├── synora-users                          # Registered account registry
├── synora-session                        # Active session username
├── synora-theme                          # User theme preference ("light" | "dark")
│
└── synora:<username>:*                   # Isolated per-user data partition
    ├── profile                           # Name, program, semester, avatar, attendance target
    ├── subjects                          # Canonical list of subjects & credit allocations
    ├── tasks                             # Task records, priorities, deadlines, status
    ├── notes                             # Categorized study notes
    ├── timetable                         # Weekly schedule entries with time/room data
    ├── attendance                        # Held and attended session counts
    ├── cgpa                              # Subject grade records
    ├── achievements                      # Timestamped unlocked achievement IDs
    ├── notifications                     # Alert history & read/unread state
    └── meta                              # Study streaks & last completion timestamps
```

### Architectural Notes & Invariants
* **Isolated Multi-User Support:** User data is segregated by username keys (`synora:<username>:<collection>`). Multiple students can use the same browser without their records mixing.
* **Derived State:** Percentages, CGPA totals, deadline statuses (Overdue/Due Today), and streak counts are **derived at runtime** rather than stored as static values.
* **Trade-off Notice:** Because data lives strictly on-device, clearing your browser's site data will reset your workspace. Data does not synchronize across separate physical devices.

---

## ✦ Preview

```
┌────────────────────────────────────────────────────────────────────────┐
│  SYNORA DASHBOARD                                        [Light | Dark]│
├────────────────────────────────────────────────────────────────────────┤
│  Good morning, Manan · B.E CSE AIML (Semester 3)                       │
│                                                                        │
│  [ Total: 12 ]   [ Due Today: 2 ]   [ Overdue: 0 ]   [ Upcoming: 5 ]   │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Today's Schedule        │  │ Today's Tasks                       │  │
│  │ 09:00 - DBMS (Room 302) │  │ [ ] Submit Networks Assignment (6pm)│  │
│  │ 11:00 - SDE Lab         │  │ [x] Read Operating Systems Ch. 4    │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Attendance: 84.5%       │  │ CGPA Snapshot: 8.75 / 10.0          │  │
│  │ (Target: 75% · +3 Safe) │  │ (6 Graded Subjects · All Clear)     │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

<div align="center">

![Synora Dashboard](./src/assets/preview/dashboard.png)

*A view of the Synora Dashboard showcasing the greeting, statistics, daily agenda, calendar, and academic overview.*

</div>

---

## ✦ Project Structure

```text
Synora/
├── index.html                 # HTML shell: fonts, pre-paint theme script, analytics, #root
├── package.json               # Scripts & dependencies (react, react-dom, react-router)
├── vite.config.js             # Vite build config (vendor chunk, unminified CSS)
├── vercel.json                # SPA rewrite so deep links work on Vercel
├── start.sh / start.bat       # One-click launchers (install + dev server + open browser)
├── README.md                  # Project documentation & reference
│
├── public/                    # Copied as-is: favicon.svg/.ico, favicon-32, favicon-180
│
└── src/
    ├── main.jsx               # Entry point: mounts <App /> inside BrowserRouter
    ├── App.jsx                # Route table
    │
    ├── pages/                 # One component per route
    │   ├── landing/           # Landing page, header, splash loader, contact section
    │   ├── auth/              # Login, Signup & shared form pieces
    │   ├── onboarding/        # 6-step wizard, steps & saved draft
    │   ├── timetable/         # Weekly grid & class form
    │   ├── Dashboard.jsx      # Dashboard metrics & schedule aggregator
    │   ├── Tasks.jsx          # Task CRUD & dynamic filters
    │   ├── Calendar.jsx       # Monthly grid & deadline mapping
    │   ├── Notes.jsx          # Notes manager & live filter
    │   ├── Attendance.jsx     # Attendance math & recovery calculation
    │   ├── Cgpa.jsx           # Grade mapping & split-bar chart
    │   ├── Achievements.jsx   # Milestone badges
    │   ├── Notifications.jsx  # Alert centre
    │   └── Settings.jsx       # Profile, avatar, subjects & preferences
    │
    ├── layouts/               # AppLayout (app shell), Sidebar, Topbar, AuthLayout
    ├── components/            # Shared UI: modal provider, toaster, theme toggle, icons,
    │                          #   avatar picker, progress ring, task form & row
    ├── hooks/                 # useStore, useTheme, usePageStyles, useBodyClass, usePageMeta
    ├── lib/                   # Framework-free logic: storage, auth, engine (notifications &
    │                          #   achievements), tasks, notes, grades, attendance, timetable,
    │                          #   theme, toast, demo data
    ├── data/                  # Navigation items & avatar definitions
    ├── styles/                # tokens, base, components, landing, auth, onboarding, app (.css)
    └── assets/                # Logos, 12 vector avatars (Lorelei style, CC0),
                               #   landing imagery & dashboard preview
```

---

## ✦ Getting Started

You need **Node.js 22.22 or newer** (React Router 8 requires it).

### 1. Clone the Repository
```bash
git clone https://github.com/Manan-2007/Synora.git
cd Synora
```

### 2. Start It

**One click:** run `./start.sh` (macOS / Linux) or double-click `start.bat` (Windows). It installs dependencies on first run, starts the dev server and opens Synora in your browser.

**Or by hand:**
```bash
npm install
npm run dev
```
Then open the URL Vite prints (usually `http://localhost:5173`).

### 3. Build for Production
```bash
npm run build     # outputs to dist/
npm run preview   # serves the production build locally
```

> **Testing Options:**
> * **New Student Journey:** Click **"Create account"**, complete the quick registration, and customize your workspace via the onboarding wizard.
> * **Instant Demonstration:** Go to **Sign In** and click **"Use the demo account"** to immediately explore a populated workspace with realistic semester data.

---

## ✦ Deployment

The live site at **[synora-v1.vercel.app](https://synora-v1.vercel.app/)** deploys automatically from the `main` branch on Vercel:

* Vercel detects Vite, runs `npm run build` and serves `dist/`.
* [`vercel.json`](vercel.json) rewrites every path to `index.html`, so refreshing a deep link such as `/dashboard` still loads the app and React Router takes over.
* Old links from the vanilla version (`/app/dashboard.html` and so on) permanently redirect to their new routes (`/dashboard`).
* Hashed build files under `/assets/` are cached for a year, since every rebuild gives them new names.
* Vercel Web Analytics is enabled through the snippet in `index.html`.

---

## ✦ Responsive Design

Synora is built to deliver a seamless experience across all device form factors:

* **Desktop Workspaces (≥ 1024px):** Displays a persistent sidebar, multi-column dashboard widgets, and a full 7-day horizontal timetable grid.
* **Tablets & Small Laptops (768px – 1023px):** Fluid grid reflows with condensed calendar cells and responsive summary cards.
* **Mobile Devices (< 768px):** Navigation transitions into an off-canvas drawer with a touch-friendly toggle. The weekly timetable reflows from a horizontal grid into day-by-day stacked schedule cards.

---

## ✦ Accessibility

Synora incorporates accessible web practices to ensure an inclusive user experience:

* **Semantic Landmark Structure:** Proper use of `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, and `<footer>` elements.
* **Direct Navigation:** Includes a visible `#main` **Skip to content** link for keyboard users.
* **Form Accessibility:** All form inputs have explicitly associated `<label>` elements and inline error message regions.
* **High Contrast Ratios:** All text and UI component color tokens meet standard contrast thresholds across both light and dark themes.
* **Reduced Motion Compliance:** Full support for `prefers-reduced-motion: reduce`, disabling animations and shortening loader durations for users who prefer minimal motion.
* **Keyboard-Friendly Interactions:** Modal dialogues, drawers, and interactive cards support standard keyboard focus and `Escape` key dismissal.

---

## ✦ FAQ

#### Is Synora completely free?
Yes. Synora has no paid tiers, no premium locked features, no trial periods, and no advertisements.

#### Do I need to create an account?
Yes. Synora uses client-side account records to isolate tasks, timetables, and grades for individual users sharing the same browser. Creating an account takes less than a minute.

#### Where is my academic data saved?
All data is stored directly in your browser's `localStorage` on your local device. Nothing is uploaded to any remote server or third-party service.

#### Does Synora work on mobile browsers?
Yes. Synora is fully responsive and runs smoothly in modern mobile browsers on both iOS and Android.

---

## ✦ Contact

The landing page includes a **Contact Us** section featuring contact information and a **Get in Touch** form with fields for:

* Full Name
* Email Address
* Phone Number
* Message text

The form features instantaneous client-side validation. Contact display values can be customized in the `CONTACT_INFO` object at the top of `src/pages/landing/ContactSection.jsx`:

```javascript
const CONTACT_INFO = {
  phone: "+91 98654 54345",
  email: "synora@gmail.com",
  office: "Sector 20, Panchkula, India",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Sector+20+Panchkula+India",
};
```

---

## ✦ Project Goals

* **Eliminate Academic Fragmentation:** Bring disparate study tools into a single, cohesive interface.
* **Foster Calm & Focus:** Replace high-stress notification feeds with a clean, actionable daily agenda.
* **Simplify Complex Calculations:** Automate credit-weighted CGPA estimation and attendance safe-miss thresholds.
* **Protect Student Privacy:** Maintain an entirely client-side workspace model where academic data never leaves the browser.
* **Deliver Dependable Performance:** Provide a fast web experience with a lean React build and only three runtime dependencies.

---

## ✦ The Team

Built as a student project with a focus on simplicity, productivity, and thoughtful web design.

---

## ✦ Potential Future Improvements

> **Note:** The items below represent prospective architectural enhancements and ideas for future exploration.

* [ ] **Optional Cloud Sync:** Encrypted cloud backup for syncing workspaces across multiple devices.
* [ ] **Calendar Export:** Exporting class timetables and assignment deadlines to standard `.ics` format.
* [ ] **Syllabus & Course Checklist:** Topic-by-topic tracking within each registered subject.
* [ ] **Backend Service Integration:** Real-time email dispatch integration for the Get in Touch contact endpoint.
* [ ] **Push Reminders:** Configurable browser web push notifications for upcoming high-priority assignments.

---

<div align="center">

*Made with care for student productivity and calm learning.*

**Synora** — *Organize · Focus · Progress*

</div>
