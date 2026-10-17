import { useLayoutEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import SplashLoader from "./SplashLoader.jsx";
import LandingHeader, { SECTION_LINKS } from "./LandingHeader.jsx";
import ContactSection from "./ContactSection.jsx";
import LogoArt from "../../components/LogoArt.jsx";
import CheckMark from "../../components/CheckMark.jsx";
import usePageStyles from "../../hooks/usePageStyles.js";
import usePageMeta from "../../hooks/usePageMeta.js";
import landingCss from "../../styles/landing.css?inline";
import heroWorkspace from "../../assets/img/hero-workspace.jpg";
import plannerFlatlay from "../../assets/img/planner-flatlay.jpg";
import notebooks from "../../assets/img/notebooks.jpg";
import dashboardPreview from "../../assets/preview/dashboard.png";

const STATS = [
  { value: "6", label: "tools, one workspace" },
  { value: "1", label: "dashboard for your week" },
  { value: "2", label: "themes, light and dark" },
  { value: "0", label: "ads, ever" },
];

function FeatureIcon({ children }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const FEATURES = [
  { title: "Tasks & Assignments", tone: "",
    text: "Priorities, deadlines and status. Overdue, due today and upcoming are worked out from the date — never a stale label.",
    icon: <><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></> },
  { title: "Calendar & Timetable", tone: "taupe",
    text: "Your classes on a weekly grid and your deadlines on a month view. Room and instructor are optional — add them only if you want them.",
    icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
  { title: "Quick Notes", tone: "ink",
    text: "Formulas, a lecturer’s aside, a checklist. Filed by subject and searchable as you type.",
    icon: <><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9.5L21 14.5V5a2 2 0 0 0-2-2Z" /><path d="M15 21v-5a1 1 0 0 1 1-1h5" /></> },
  { title: "CGPA Calculator", tone: "taupe",
    text: "Credit-weighted across every subject, on a 10-point scale with real failure states — E1, E2 and E3, each shown separately.",
    icon: <><path d="M22 9 12 4 2 9l10 5 10-5Z" /><path d="M6 11.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.5" /><path d="M22 9v5" /></> },
  { title: "Attendance Calculator", tone: "ink",
    text: "Plus and minus as classes happen, and a straight answer: how many you can still miss, or how many in a row you must attend.",
    icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></> },
  { title: "Achievements", tone: "",
    text: "Earned from what you actually did — tasks finished before their deadline, notes written, a streak kept.",
    icon: <><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></> },
];

const HOW_STEPS = [
  { title: "Create your account",
    text: "First name, last name, a username, an email and a password. That's it — no verification step, no phone number." },
  { title: "Make Synora yours",
    text: "Pick an avatar, tell us your program and semester, then add your subjects — credits, and whether each one takes a register at all. Set the attendance you're aiming for and you're done." },
  { title: "Start with a clear week",
    text: "Your dashboard opens already knowing your subjects, so attendance, CGPA and your timetable are one dropdown away — not another form." },
];

const SHOWCASES = [
  { image: plannerFlatlay, width: 1000, height: 668, flip: false, eyebrow: "Plan the week", headingId: "showcase-title",
    alt: "A desk from above with an open weekly planner, a laptop and a small vase of flowers.",
    title: "Not just today. The whole week ahead.",
    text: "A due date on Friday should not be a surprise on Thursday night. Synora lays your classes and deadlines on one timeline, so the week arrives before it hits you.",
    points: ["Timetable and deadlines share one calendar", "Priority colours you can read at a glance", "Today's list stays short and honest"] },
  { image: notebooks, width: 1000, height: 667, flip: true, eyebrow: "Keep it together",
    alt: "A neat stack of spiral notebooks beside a laptop and a jar of pens.",
    title: "Notes and marks that stay where you left them.",
    text: "Six notebooks, three apps and a group chat is not a system. Synora keeps lecture notes, attendance and grades under one roof, in one visual language.",
    points: ["Quick notes you can find again later", "CGPA and attendance worked out for you", "Achievements that mark the small wins"] },
];

function WhyIcon({ children }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const WHY = [
  { title: "Calm by design",
    text: "No clutter, no noise, no badges begging for attention — just what you need, when you need it.",
    icon: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></> },
  { title: "Private by default",
    text: "Your workspace belongs to your account alone. No ads, no tracking, and your password is only ever stored as a secure hash.",
    icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> },
  { title: "Free, with no catch",
    text: "No paid tier, no ads, and no trial that quietly turns into a subscription. Signing up costs you a username.",
    icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /> },
];

const FAQ = [
  { q: "Is Synora free?",
    a: "Yes — completely. There's no paid tier, no trial period, and nothing locked behind an upgrade." },
  { q: "Do I need an account?",
    a: "Yes. Synora is built around your account — it's what keeps your tasks, notes and grades separate from everyone else's, and it's how the app knows what to load when you come back. Creating one takes your name, a username, an email and a password: no phone number, no verification step." },
  { q: "Where is my data stored?",
    a: "In Synora's database, linked to your account — so signing in on another browser or device brings your whole workspace with you. A copy is also kept in your browser so every page opens instantly. Passwords are stored only as a secure hash, never as plain text." },
  { q: "Does it work on mobile?",
    a: "Yes. Synora is responsive and runs in any modern mobile browser. Sign in on your phone with the same account and your workspace is already there." },
];

export default function Landing() {
  usePageStyles(landingCss);
  usePageMeta("Synora — One calm home for everything you're studying",
    "Synora brings your tasks, assignments, notes, timetable, and grades into a single, quiet workspace. Create a free account and start with a clear week.");

  /* Arriving with a #section in the URL lands on that section, as the
     browser did for the static page. */
  const { hash } = useLocation();
  const [arrivalHash] = useState(hash);
  useLayoutEffect(() => {
    if (arrivalHash) document.getElementById(arrivalHash.slice(1))?.scrollIntoView({ behavior: "instant" });
  }, [arrivalHash]);

  return (
    <>
      <SplashLoader />

      <a className="skip-link" href="#main">Skip to content</a>

      <LandingHeader />

      <main id="main">
        {/* ================================================= HERO */}
        <section className="hero" id="top">
          <div className="container">
            <div className="hero-copy">
              <p className="eyebrow">Student productivity, unified</p>
              <h1>One <em>calm</em> home for everything you're studying.</h1>
              <p className="hero-sub">
                Synora brings your tasks, assignments, notes, timetable, and grades into a
                single, quiet workspace — so you spend less time organizing and more time doing.
              </p>
              <div className="hero-actions">
                <Link className="btn btn--primary btn--lg" to="/signup">Create your account</Link>
                <a className="btn btn--ghost btn--lg" href="#features">See features</a>
              </div>
              <p className="hero-micro">
                <span><CheckMark size={15} />Free to use</span>
                <span><CheckMark size={15} />Sign up in under a minute</span>
                <span><CheckMark size={15} />Runs in any browser</span>
              </p>
            </div>

            <div className="hero-visual">
              <figure className="hero-photo">
                <img src={heroWorkspace}
                  alt="A tidy study desk: a laptop raised on a sage-green stand, beside a plant and headphones."
                  width="1400" height="1050" fetchPriority="high" />
              </figure>

              <div className="hero-badge" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3 2.4 5.5 6 .5-4.5 4 1.3 5.9L12 15.8 6.8 18.9 8.1 13l-4.5-4 6-.5L12 3Z" />
                </svg>
                6-day streak
              </div>

              <div className="hero-card" aria-hidden="true">
                <div className="hero-card__head">
                  <strong>Today</strong>
                  <span>3 tasks · 1 due</span>
                </div>
                <div className="task-list">
                  <div className="task" style={{ "--color-status": "var(--status-high)" }}>
                    <span className="task__box"></span>
                    <span className="task__label">DBMS assignment 4</span>
                    <span className="task__tag">6pm</span>
                  </div>
                  <div className="task" style={{ "--color-status": "var(--status-medium)" }}>
                    <span className="task__box"></span>
                    <span className="task__label">Read Ch. 7 — Networks</span>
                    <span className="task__tag">Tue</span>
                  </div>
                  <div className="task task--done" style={{ "--color-status": "var(--status-done)" }}>
                    <span className="task__box"></span>
                    <span className="task__label">Submit lab record</span>
                    <span className="task__tag">Done</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================= STATS */}
        <section className="stats" aria-label="Synora at a glance">
          <div className="container">
            {STATS.map((s) => (
              <div className="stat" key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>
            ))}
          </div>
        </section>

        {/* ================================================= FEATURES */}
        <section className="section" id="features" aria-labelledby="features-title">
          <div className="container">
            <div className="section-head section-head--center">
              <h2 id="features-title">Everything a student tracks, in one place.</h2>
              <p>Six focused tools that share one workspace, one look, and one place to look.</p>
              <div className="rule" aria-hidden="true"></div>
            </div>

            <ul className="card-grid">
              {FEATURES.map((f) => (
                <li className="card" key={f.title}>
                  <span className={"card__icon" + (f.tone ? " card__icon--" + f.tone : "")} aria-hidden="true">
                    <FeatureIcon>{f.icon}</FeatureIcon>
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </li>
              ))}
            </ul>

            <p className="features-note">
              Plus a unified dashboard, light &amp; dark themes, and your data kept private to your account.
            </p>
          </div>
        </section>

        {/* ================================================= HOW IT WORKS */}
        <section className="section section--tight how" id="how" aria-labelledby="how-title">
          <div className="container">
            <div className="section-head section-head--center">
              <h2 id="how-title">How it works</h2>
              <p>Three steps between opening Synora and having your week in one place.</p>
              <div className="rule" aria-hidden="true"></div>
            </div>

            <ol className="how-steps">
              {HOW_STEPS.map((step, i) => (
                <li className="how-step" key={step.title}>
                  <span className="how-step__num" aria-hidden="true">{i + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ================================================= SHOWCASE */}
        <section className="section" aria-labelledby="showcase-title">
          <div className="container">
            {SHOWCASES.map((s) => (
              <div className={"showcase" + (s.flip ? " showcase--flip" : "")} key={s.title}>
                <figure className="showcase__media">
                  <img src={s.image} alt={s.alt} width={s.width} height={s.height} loading="lazy" />
                </figure>
                <div>
                  <p className="eyebrow">{s.eyebrow}</p>
                  <h2 id={s.headingId}>{s.title}</h2>
                  <p>{s.text}</p>
                  <ul className="check-list">
                    {s.points.map((point) => <li key={point}><CheckMark /><span>{point}</span></li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================= APP PREVIEW */}
        {/* One real screenshot of the running app, signed in as the demo account. */}
        <section className="section section--tight" aria-labelledby="preview-title">
          <div className="container">
            <div className="section-head section-head--center">
              <p className="eyebrow">A look inside</p>
              <h2 id="preview-title">Your week, already added up</h2>
              <p>A real screen from a real workspace — deadlines, attendance and grades
                worked out for you, not just stored.</p>
              <div className="rule" aria-hidden="true"></div>
            </div>

            <div className="shots">
              <div className="shots__stage">
                <img src={dashboardPreview} width="1700" height="1100"
                  alt="The Synora dashboard: a greeting with the student's program and semester, counts for total, due-today, overdue and upcoming tasks, today's task list, a progress donut and a month calendar." />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================= WHY SYNORA */}
        <section className="section why" id="why" aria-labelledby="why-title">
          <div className="container">
            <div className="section-head section-head--flush">
              <h2 id="why-title">Why Synora</h2>
              <p>Built the way a study tool should be: quiet, private, and out of your way.</p>
              <div className="rule" aria-hidden="true"></div>
            </div>

            <div className="why-grid">
              {WHY.map((w) => (
                <div className="why-item" key={w.title}>
                  <span className="why-item__icon" aria-hidden="true"><WhyIcon>{w.icon}</WhyIcon></span>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================= FAQ */}
        <section className="section" id="faq" aria-labelledby="faq-title">
          <div className="container">
            <div className="section-head section-head--center">
              <h2 id="faq-title">Questions, answered</h2>
              <div className="rule" aria-hidden="true"></div>
            </div>

            {/* Native <details>: the browser opens and closes it, no state needed. */}
            <div className="faq-list">
              {FAQ.map((item) => (
                <details className="faq-item" key={item.q}>
                  <summary>
                    {item.q}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="faq-answer"><p>{item.a}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <ContactSection />

        {/* ================================================= CLOSING CTA */}
        <section className="section section--tight" aria-labelledby="cta-title">
          <div className="container">
            <div className="cta">
              <h2 id="cta-title">Start with a clear week.</h2>
              <p>Make your account, add what's on your plate, and let the rest of the noise wait.</p>
              <div className="cta-actions">
                <Link className="btn btn--onDark btn--lg" to="/signup">Create your account</Link>
                <Link className="btn btn--outline-light btn--lg" to="/login">I already have one</Link>
              </div>
              <p className="cta-micro">Free · A username and password is all it takes</p>
            </div>
          </div>
        </section>
      </main>

      {/* ================================================= FOOTER */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="logo logo--lockup"><LogoArt variant="lockup" /></span>
              <p>A calm, private workspace for everything you're studying.</p>
            </div>

            <nav className="footer-nav" aria-label="Footer">
              {SECTION_LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
            </nav>
          </div>

          <div className="footer-bottom">
            <p>© 2026 Synora</p>
          </div>
        </div>
      </footer>
    </>
  );
}
