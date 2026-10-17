import { Fragment } from "react";
import { Link, NavLink } from "react-router";
import Icon from "../components/Icon.jsx";
import LogoArt from "../components/LogoArt.jsx";
import { UserAvatar } from "../components/AvatarArt.jsx";
import { NAV } from "../data/nav.js";
import { profile } from "../lib/storage.js";
import { notifications } from "../lib/engine.js";

export default function Sidebar() {
  const p = profile.get();
  const name = p.fullName || p.username;
  // The handle says more than "Student" under every name.
  const sub = p.username ? "@" + p.username : p.program;
  const unread = notifications.unreadCount();

  return (
    <aside className="sidebar">
      <Link className="sidebar__brand logo logo--lockup" to="/dashboard" aria-label="Synora — dashboard">
        <LogoArt variant="lockup" />
      </Link>

      <nav className="sidebar__nav" aria-label="Primary">
        {NAV.map((section) => (
          <Fragment key={section.group || "main"}>
            {section.group && <span className="sidebar__section-label">{section.group}</span>}
            {section.items.map((item) => (
              <NavLink key={item.id} to={item.path}
                className={({ isActive }) => "nav-item" + (isActive ? " is-active" : "")}>
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.id === "notifications" && (
                  <span className="nav-item__badge" hidden={unread === 0}>
                    {unread > 9 ? "9+" : unread || ""}
                  </span>
                )}
              </NavLink>
            ))}
          </Fragment>
        ))}
      </nav>

      <div className="sidebar__footer">
        <Link className="sidebar-user" to="/settings">
          <UserAvatar size={38} />
          <span className="sidebar-user__meta">
            <span className="sidebar-user__name">{name}</span>
            <span className="sidebar-user__sub">{sub}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
