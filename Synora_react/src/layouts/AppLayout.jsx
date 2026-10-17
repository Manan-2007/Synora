import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Toaster from "../components/Toaster.jsx";
import { ModalProvider } from "../components/modal/ModalProvider.jsx";
import useStore from "../hooks/useStore.js";
import usePageStyles from "../hooks/usePageStyles.js";
import useBodyClass from "../hooks/useBodyClass.js";
import usePageMeta from "../hooks/usePageMeta.js";
import { session } from "../lib/storage.js";
import { refresh } from "../lib/engine.js";
import { clearToasts } from "../lib/toast.js";
import { navItemFor } from "../data/nav.js";
import appCss from "../styles/app.css?inline";

/* The shell around every signed-in page: sidebar, topbar, toasts and
   dialogs. ONE gate — are you signed in? An unfinished setup is offered
   on the dashboard, never enforced here. */
export default function AppLayout() {
  usePageStyles(appCss);
  useStore();
  const { pathname } = useLocation();
  const authed = session.isAuthed();
  const item = navItemFor(pathname);

  const lastPath = useRef(null);

  usePageMeta((item ? item.label : "Synora") + " — Synora");

  /* Each page opens with fresh deadline / attendance alerts and
     achievements; toasts raised on the previous page go with it. */
  useLayoutEffect(() => {
    if (!authed) return;
    if (lastPath.current !== null && lastPath.current !== pathname) clearToasts();
    lastPath.current = pathname;
    refresh();
  }, [authed, pathname]);

  if (!authed) return <Navigate to="/login" replace />;

  /* Keyed by page: every page starts with the drawer, menus and dialogs
     closed — as a fresh page load did — rather than animating shut. */
  return <AppShell key={pathname} title={item ? item.label : "Synora"} />;
}

function AppShell({ title }) {
  const [navOpen, setNavOpen] = useState(false);
  useBodyClass(navOpen ? "app nav-open" : "app");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setNavOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ModalProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="app-content">
          <Topbar title={title} onMenuToggle={() => setNavOpen((open) => !open)} />
          <main className="page">
            <Outlet />
          </main>
        </div>
      </div>
      <div className="drawer-backdrop" onClick={() => setNavOpen(false)} />
      <Toaster />
    </ModalProvider>
  );
}
