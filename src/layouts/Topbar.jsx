import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import Icon from "../components/Icon.jsx";
import NotificationIcon from "../components/NotificationIcon.jsx";
import { UserAvatar } from "../components/AvatarArt.jsx";
import { profile, session } from "../lib/storage.js";
import { notifications, refresh } from "../lib/engine.js";
import { toggleTheme } from "../lib/theme.js";

export default function Topbar({ title, onMenuToggle }) {
  const [openPop, setOpenPop] = useState(null);   // "bell" | "profile" | null
  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  const p = profile.get();
  const name = p.fullName || p.username;
  /* Program and semester are TWO lines, not one joined string — joined,
     the 250px dropdown wrapped wherever it ran out of room and orphaned
     the "3" of "Semester 3". Falls back to the handle when neither is set. */
  const subLines = [];
  if (p.program) subLines.push(p.program);
  if (p.semester) subLines.push("Semester " + p.semester);
  if (!subLines.length) subLines.push("@" + p.username);

  const unseen = notifications.unseenCount();
  const latest = notifications.all().slice(0, 6);

  // Only one dropdown at a time; outside clicks and Escape close them.
  useEffect(() => {
    const onClick = (e) => {
      if (!bellRef.current?.contains(e.target) && !profileRef.current?.contains(e.target)) setOpenPop(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpenPop(null); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function togglePop(which, e) {
    e.stopPropagation();
    if (openPop === which) { setOpenPop(null); return; }
    setOpenPop(which);
    // Opening the bell clears the red count, without marking items read.
    if (which === "bell") notifications.markAllSeen();
  }

  function signOut() {
    session.signOut();
    navigate("/");
  }

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={onMenuToggle}>
        <Icon name="menu" size={18} />
      </button>
      <h1 className="topbar__title">{title}</h1>

      <div className="topbar__actions">
        <button type="button" className="icon-btn" aria-label="Toggle dark mode" onClick={toggleTheme}>
          <span className="only-light"><Icon name="moon" size={18} /></span>
          <span className="only-dark"><Icon name="sun" size={18} /></span>
        </button>

        <div className="bell" ref={bellRef}>
          <button type="button" className="icon-btn" aria-label="Notifications" aria-haspopup="true"
            onClick={(e) => togglePop("bell", e)}>
            <Icon name="bell" size={18} />
            <span className={"bell__badge" + (unseen > 0 ? " is-shown" : "")}>
              {unseen > 0 ? (unseen > 9 ? "9+" : unseen) : ""}
            </span>
          </button>
          <div className={"menu-pop" + (openPop === "bell" ? " is-open" : "")} role="menu">
            <div className="menu-pop__head">
              <strong>Notifications</strong>
              <button type="button" onClick={() => { notifications.markAllRead(); refresh(); }}>Mark all read</button>
            </div>
            <div className="menu-pop__list">
              {latest.length ? latest.map((n) => (
                <div key={n.id} className={"notif-item" + (n.read ? "" : " is-unread")}>
                  <NotificationIcon type={n.type} />
                  <span style={{ minWidth: 0 }}>
                    <span className="notif-item__title">{n.title}</span>
                    <span className="notif-item__body">{n.body}</span>
                  </span>
                </div>
              )) : (
                <p className="muted text-small" style={{ padding: 24, textAlign: "center" }}>You're all caught up.</p>
              )}
            </div>
            <Link className="menu-link" to="/notifications"
              style={{ justifyContent: "center", fontWeight: 600, color: "var(--color-brand)" }}>See all</Link>
          </div>
        </div>

        <div className="bell" ref={profileRef}>
          <button type="button" className="profile-chip" aria-haspopup="true" onClick={(e) => togglePop("profile", e)}>
            <UserAvatar size={30} />
            <span className="profile-chip__name">{name}</span>
          </button>
          <div className={"menu-pop" + (openPop === "profile" ? " is-open" : "")} role="menu" style={{ width: 250 }}>
            <div className="menu-pop__head" style={{ gap: 10 }}>
              <UserAvatar size={38} />
              <span className="profile-pop__who">
                <strong className="profile-pop__name">{name}</strong>
                <span className="profile-pop__meta">
                  {subLines.map((line) => <span key={line} className="profile-pop__line">{line}</span>)}
                </span>
              </span>
            </div>
            <Link className="menu-link" to="/settings"><Icon name="settings" size={16} />Settings</Link>
            <Link className="menu-link" to="/"><Icon name="grid" size={16} />Landing page</Link>
            <button type="button" className="menu-link menu-link--danger" onClick={signOut}>
              <Icon name="logout" size={16} />Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
