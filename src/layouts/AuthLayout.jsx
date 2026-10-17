import { Link } from "react-router";
import LogoArt from "../components/LogoArt.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import CheckMark from "../components/CheckMark.jsx";
import usePageStyles from "../hooks/usePageStyles.js";
import authCss from "../styles/auth.css?inline";

/* Sign in / sign up: the form on the left, a photograph with a brand wash
   on the right (decorative, so it is the first thing dropped on narrow screens). */
export default function AuthLayout({ aside, children }) {
  usePageStyles(authCss);

  return (
    <div className="auth-layout">
      <main className="auth-main">
        <div className="auth-topbar">
          <Link className="logo logo--lockup" to="/" aria-label="Synora — back to the home page">
            <LogoArt variant="lockup" />
          </Link>
          <ThemeToggle />
        </div>

        <div className="auth-body">{children}</div>

        <p className="auth-foot">© 2026 Synora</p>
      </main>

      <aside className={"auth-aside auth-aside--" + aside.photo}>
        <div>
          <p className="auth-quote">{aside.quote}</p>
          <ul className="auth-points">
            {aside.points.map((point) => <li key={point}><CheckMark /><span>{point}</span></li>)}
          </ul>
        </div>
      </aside>
    </div>
  );
}
