/* =========================================================
   Synora as an installed app (PWA).

   Registers the service worker (public/sw.js) in production
   builds, and keeps the browser's "install this app" offer so
   Settings can show an Install button where the browser allows
   it (Chrome, Edge, Android). Safari on iPhone/iPad has no such
   offer: there it's Share → Add to Home Screen.
   ========================================================= */

let offer = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();            // keep it for our own button
    offer = e;
    notify();
  });
  window.addEventListener("appinstalled", () => { offer = null; notify(); });

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}

const DISMISS_KEY = "synora-install-dismissed";

export const install = {
  /* "installed" (running as the app), "available" (we can show the
     browser's prompt), "ios" (Add to Home Screen by hand) or "manual". */
  state() {
    if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone) return "installed";
    if (offer) return "available";
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return ios ? "ios" : "manual";
  },
  /* On iPhone and iPad: which browser, since each puts its Share button
     somewhere else. "safari" | "chrome" | "other". */
  iosBrowser() {
    const ua = navigator.userAgent;
    if (/CriOS/i.test(ua)) return "chrome";
    if (/FxiOS|EdgiOS|OPiOS/i.test(ua)) return "other";
    return "safari";
  },
  /* The dashboard's "add to home screen" card, until it's closed. */
  dismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  },
  dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage blocked */ }
    notify();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async prompt() {
    if (!offer) return false;
    offer.prompt();
    const { outcome } = await offer.userChoice;
    offer = null;
    notify();
    return outcome === "accepted";
  },
};
