import { Link } from "react-router";
import LogoArt from "../../components/LogoArt.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";

export const SECTION_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#why", label: "Why Synora" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact Us" },
];

export default function LandingHeader() {
  return (
    <header className="site-header">
      <div className="container">
        {/* The mobile menu is CSS-only: this hidden checkbox must come BEFORE
            .nav and .nav-panel so the sibling selector (~) can reach them. */}
        <input className="nav-checkbox" type="checkbox" id="nav-open" aria-label="Toggle navigation menu" />

        {/* Three tracks — brand, links, actions. The middle one is centred
            in the header however wide the outer two grow (see .nav). */}
        <nav className="nav" aria-label="Primary">
          <a className="logo logo--lockup nav-brand" href="#top" aria-label="Synora — top of page">
            <LogoArt variant="lockup" />
          </a>

          <ul className="nav-links">
            {SECTION_LINKS.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>

          <div className="nav-actions">
            <ThemeToggle />

            {/* The visible menu button is a <label> that flips the checkbox. */}
            <label className="icon-btn nav-toggle" htmlFor="nav-open">
              <svg className="icon-menu" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
              <svg className="icon-close" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </label>

            <Link className="btn btn--ghost btn--sm" to="/login">Sign in</Link>
            <Link className="btn btn--primary btn--sm" to="/signup">Create account</Link>
          </div>
        </nav>

        <div className="nav-panel">
          <ul>
            {SECTION_LINKS.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
          <Link className="btn btn--primary" to="/signup">Create account</Link>
          <Link className="btn btn--ghost" to="/login">Sign in</Link>
        </div>
      </div>
    </header>
  );
}
