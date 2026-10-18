import { useLayoutEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import AppLayout from "./layouts/AppLayout.jsx";
import Landing from "./pages/landing/Landing.jsx";
import Login from "./pages/auth/Login.jsx";
import Signup from "./pages/auth/Signup.jsx";
import Forgot from "./pages/auth/Forgot.jsx";
import Reset from "./pages/auth/Reset.jsx";
import Onboarding from "./pages/onboarding/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tasks from "./pages/Tasks.jsx";
import Calendar from "./pages/Calendar.jsx";
import Timetable from "./pages/timetable/Timetable.jsx";
import Notes from "./pages/Notes.jsx";
import Focus from "./pages/Focus.jsx";
import Cgpa from "./pages/Cgpa.jsx";
import Attendance from "./pages/Attendance.jsx";
import Achievements from "./pages/Achievements.jsx";
import Notifications from "./pages/Notifications.jsx";
import Settings from "./pages/Settings.jsx";
import { applyStoredTheme } from "./lib/theme.js";
import { session, profile } from "./lib/storage.js";

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

  return (
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
  );
}
