/* One list drives the sidebar and the topbar's page titles. */
export const NAV = [
  { group: "", items: [
    { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "grid" },
    { id: "tasks", label: "Tasks", path: "/tasks", icon: "check" },
    { id: "calendar", label: "Calendar", path: "/calendar", icon: "calendar" },
    { id: "timetable", label: "Timetable", path: "/timetable", icon: "clock" },
    { id: "notes", label: "Quick Notes", path: "/notes", icon: "note" },
  ] },
  { group: "Academics", items: [
    { id: "cgpa", label: "CGPA", path: "/cgpa", icon: "chart" },
    { id: "attendance", label: "Attendance", path: "/attendance", icon: "users" },
    { id: "achievements", label: "Achievements", path: "/achievements", icon: "trophy" },
  ] },
  { group: "Account", items: [
    { id: "notifications", label: "Notifications", path: "/notifications", icon: "bell" },
    { id: "settings", label: "Settings", path: "/settings", icon: "settings" },
  ] },
];

export function navItemFor(pathname) {
  for (const section of NAV) {
    const item = section.items.find((i) => i.path === pathname);
    if (item) return item;
  }
  return null;
}
