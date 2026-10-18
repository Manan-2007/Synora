import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import Landing from "./pages/landing/Landing.jsx";
import { applyStoredTheme } from "./lib/theme.js";
import { session, profile } from "./lib/storage.js";

/* Code splitting: only the landing page loads with the first visit; the
   app shell and every other page are their own chunks, fetched when
   they're opened. Once the browser is idle they're all fetched in the
   background anyway, so moving between pages stays instant and the
   installed app has them offline. */
const PAGES = {
  AppLayout: () => import("./layouts/AppLayout.jsx"),
  Login: () => import("./pages/auth/Login.jsx"),
  Signup: () => import("./pages/auth/Signup.jsx"),
  Forgot: () => import("./pages/auth/Forgot.jsx"),
  Reset: () => import("./pages/auth/Reset.jsx"),
  Onboarding: () => import("./pages/onboarding/Onboarding.jsx"),
  Dashboard: () => import("./pages/Dashboard.jsx"),
  Tasks: () => import("./pages/Tasks.jsx"),
  Calendar: () => import("./pages/Calendar.jsx"),
  Timetable: () => import("./pages/timetable/Timetable.jsx"),
  Notes: () => import("./pages/Notes.jsx"),
  Focus: () => import("./pages/Focus.jsx"),
  Cgpa: () => import("./pages/Cgpa.jsx"),
  Attendance: () => import("./pages/Attendance.jsx"),
  Achievements: () => import("./pages/Achievements.jsx"),
  Notifications: () => import("./pages/Notifications.jsx"),
  Settings: () => import("./pages/Settings.jsx"),
};
const AppLayout = lazy(PAGES.AppLayout);
const Login = lazy(PAGES.Login);
const Signup = lazy(PAGES.Signup);
const Forgot = lazy(PAGES.Forgot);
const Reset = lazy(PAGES.Reset);
const Onboarding = lazy(PAGES.Onboarding);
const Dashboard = lazy(PAGES.Dashboard);
const Tasks = lazy(PAGES.Tasks);
const Calendar = lazy(PAGES.Calendar);
const Timetable = lazy(PAGES.Timetable);
const Notes = lazy(PAGES.Notes);
const Focus = lazy(PAGES.Focus);
const Cgpa = lazy(PAGES.Cgpa);
const Attendance = lazy(PAGES.Attendance);
const Achievements = lazy(PAGES.Achievements);
const Notifications = lazy(PAGES.Notifications);
const Settings = lazy(PAGES.Settings);

function prefetchPages() {
  const run = () => Object.values(PAGES).forEach((load) => load().catch(() => {}));
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}


/* Someone who is already signed in has no reason to see the landing or
   sign-in pages: opening the site takes them straight back to their
   workspace (or to onboarding, if that isn't finished). Decided once, when
   the page opens — so signing in on /login still shows its "You're signed
   in" screen. Each route gets its own `key`, so the check runs again on
   every visit. */
function GuestOnly({ children }) {
  const [home] = useState(() => {
    if (!session.isAuthed()) return null;
    return profile.get().onboarded ? "/dashboard" : "/onboarding";
  });
  return home ? <Navigate to={home} replace /> : children;
}

export default function App() {
  const { pathname, hash } = useLocation();
  const lastPath = useRef(null);

  /* Each vanilla page load re-read the saved theme and opened at the top;
     a route change does the same. A #section link on the same page keeps
     its own scroll. */
  useLayoutEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    applyStoredTheme();
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  useEffect(prefetchPages, []);

  return (
    <Suspense fallback={<div className="route-loading" aria-hidden="true" />}>
    <Routes>
      <Route path="/" element={<GuestOnly key="landing"><Landing /></GuestOnly>} />
      <Route path="/login" element={<GuestOnly key="login"><Login /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly key="signup"><Signup /></GuestOnly>} />
      <Route path="/forgot" element={<GuestOnly key="forgot"><Forgot /></GuestOnly>} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/cgpa" element={<Cgpa />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
