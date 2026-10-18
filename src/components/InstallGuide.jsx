import { useSyncExternalStore } from "react";
import Icon from "./Icon.jsx";
import { useModal, useModalClose } from "./modal/ModalProvider.jsx";
import { install } from "../lib/install.js";

/* =========================================================
   Putting Synora on the home screen.

   Chrome, Edge and Android can install with one button (the
   browser's own prompt). iPhone and iPad can't be prompted from
   a web page — there it's Share → Add to Home Screen — so this
   shows the steps for the browser being used, with the same
   icons the person will see.
   ========================================================= */

const ShareGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);
const MoreGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
  </svg>
);
const AddGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></svg>
);

function IosSteps() {
  const close = useModalClose();
  const browser = install.iosBrowser();
  const steps = browser === "chrome"
    ? [
        [<ShareGlyph key="i" />, <>Tap <strong>Share</strong> at the right of the address bar.</>],
        [<AddGlyph key="i" />, <>Choose <strong>Add to Home Screen</strong> (scroll the list if you don't see it).</>],
        [<Icon key="i" name="check" size={18} />, <>Tap <strong>Add</strong>. Synora appears on your home screen with its logo.</>],
      ]
    : [
        [<ShareGlyph key="i" />, <>Tap <strong>Share</strong> in Safari's toolbar. On newer iPhones it's inside the <MoreGlyph /> menu next to the address bar.</>],
        [<AddGlyph key="i" />, <>Scroll down and choose <strong>Add to Home Screen</strong>.</>],
        [<Icon key="i" name="check" size={18} />, <>Keep <strong>Open as Web App</strong> on, then tap <strong>Add</strong>. Synora appears on your home screen with its logo.</>],
      ];
  return (
    <>
      <div className="modal__body">
        <div className="install-guide__app">
          <img src="/apple-touch-icon.png" alt="" width="60" height="60" />
          <div>
            <strong>Synora</strong>
            <span>Opens full screen, straight into your workspace, and works offline.</span>
          </div>
        </div>
        <ol className="install-guide__steps">
          {steps.map(([icon, text], i) => (
            <li key={i}><span className="install-guide__icon">{icon}</span><span>{text}</span></li>
          ))}
        </ol>
        {browser === "other" && (
          <p className="text-small muted" style={{ margin: "12px 0 0" }}>
            Using another browser? Open this page in <strong>Safari</strong> for the most reliable install.
          </p>
        )}
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--primary" onClick={close}>Got it</button>
      </div>
    </>
  );
}

/* Opens the right thing for this browser; returns false when there's
   nothing to install (already installed, or a desktop browser without a
   prompt — then Settings explains the menu route). */
export function useInstall() {
  const modal = useModal();
  return async () => {
    const state = install.state();
    if (state === "available") return install.prompt();
    if (state === "ios") {
      modal.open({ title: "Add Synora to your Home Screen", content: <IosSteps /> });
      return true;
    }
    return false;
  };
}

/* The dashboard card: shown on phones and browsers that can install,
   until it's installed or closed. */
export function InstallBanner() {
  const state = useSyncExternalStore(install.subscribe, install.state);
  const dismissed = useSyncExternalStore(install.subscribe, install.dismissed);
  const start = useInstall();
  if (dismissed || (state !== "ios" && state !== "available")) return null;
  return (
    <div className="card install-banner">
      <img src="/apple-touch-icon.png" alt="" width="44" height="44" />
      <div className="install-banner__text">
        <strong>Put Synora on your home screen</strong>
        <span>One tap to open, full screen, even offline.</span>
      </div>
      <button type="button" className="btn btn--primary btn--sm" onClick={start}>
        {state === "ios" ? "Show me how" : "Install"}
      </button>
      <button type="button" className="icon-btn install-banner__close" aria-label="Hide this" onClick={() => install.dismiss()}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
