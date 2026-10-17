import { useEffect, useRef } from "react";
import { Link } from "react-router";
import CheckMark from "../../components/CheckMark.jsx";
import { profile } from "../../lib/storage.js";

/* The confirmation panel after signing in or up — and it STOPS here.
   Two real choices as ordinary links, and no timer: a screen that moves
   on by itself is not a choice, it is an announcement. */
export default function AuthDone({ name, lead, primary, note }) {
  const ref = useRef(null);
  const shown = name !== null;

  // Land keyboard focus on the choice, not back at the top of the page.
  useEffect(() => {
    if (shown) ref.current.querySelector(".btn").focus();
  }, [shown]);

  /* Someone who has already set their workspace up is offered "Change my
     setup" — it stays available, but it isn't pitched as setup again. */
  const choices = [
    { to: "/dashboard", label: "Go to dashboard" },
    { to: "/onboarding", label: shown && profile.get().onboarded ? "Change my setup" : "Personalize my workspace" },
  ];
  if (primary !== "dashboard") choices.reverse();

  return (
    <div className={"auth-done" + (shown ? " is-shown" : "")} id="done-view" ref={ref}>
      <span className="auth-done__mark" aria-hidden="true"><CheckMark size={26} /></span>
      <h2>You're signed in.</h2>
      <p className="auth-done__lead">{lead} <strong>{name}</strong>.</p>
      <p>Let's get your workspace ready.</p>

      <div className="auth-done__choices">
        {choices.map((c, i) => (
          <Link key={c.to} className={"btn btn--" + (i === 0 ? "primary" : "ghost") + " btn--lg btn--block"} to={c.to}>
            {c.label}
          </Link>
        ))}
      </div>

      {note && <p className="auth-done__note">{note}</p>}
    </div>
  );
}
