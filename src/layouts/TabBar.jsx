import { NavLink } from "react-router";
import Icon from "../components/Icon.jsx";

/* Phones: an iOS-style floating tab bar for the places used most, with
   "More" opening the full sidebar. Hidden above 760px (styles/app.css). */
const TABS = [
  { to: "/dashboard", label: "Home", icon: "grid" },
  { to: "/tasks", label: "Tasks", icon: "check" },
  { to: "/calendar", label: "Calendar", icon: "calendar" },
  { to: "/focus", label: "Focus", icon: "timer" },
];

export default function TabBar({ onMore }) {
  return (
    <nav className="tabbar" aria-label="Quick navigation">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => "tabbar__item" + (isActive ? " is-active" : "")}>
          <Icon name={t.icon} size={21} />
          <span>{t.label}</span>
        </NavLink>
      ))}
      <button type="button" className="tabbar__item" onClick={onMore} aria-label="More pages">
        <Icon name="menu" size={21} />
        <span>More</span>
      </button>
    </nav>
  );
}
