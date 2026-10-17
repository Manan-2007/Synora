import { useEffect, useState } from "react";
import LogoArt from "../../components/LogoArt.jsx";

/* The splash, and the handover to the page behind it.

   It stays at least 2000ms — long enough for the mark to settle rather
   than blink — then fades and lifts while the hero's staggered entrance
   plays underneath, so the two movements read as one. Reduced motion
   gets the same sequence, shorter and without the movement. */
export default function SplashLoader() {
  const [phase, setPhase] = useState("shown");   // shown → leaving → gone

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const leave = window.setTimeout(() => setPhase("leaving"), reduced ? 600 : 2000);
    const remove = window.setTimeout(() => setPhase("gone"), (reduced ? 600 : 2000) + (reduced ? 100 : 800));
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(remove);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={"loader" + (phase === "leaving" ? " is-hidden" : "")} id="app-loader">
      <div className="loader__stage">
        <span className="loader__glow" aria-hidden="true"></span>
        <span className="loader__ring" aria-hidden="true"></span>
        <span className="loader__badge">
          <span className="logo logo--mark loader__logo">
            <LogoArt variant="mark" />
          </span>
        </span>
      </div>
      <span className="loader__word">Synora</span>
      <span className="loader__tag">organize · focus · progress</span>
    </div>
  );
}
