import Icon from "../components/Icon.jsx";
import NotificationIcon from "../components/NotificationIcon.jsx";
import { useModal } from "../components/modal/ModalProvider.jsx";
import useStore from "../hooks/useStore.js";
import { notifications } from "../lib/engine.js";
import { formatDate, toISODate } from "../lib/util.js";

/* The full notification centre. Generation, dedupe and read state live
   in the engine; this page lists them and offers mark-read / clear. */

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return formatDate(toISODate(new Date(iso)));
}

export default function Notifications() {
  useStore();
  const modal = useModal();
  const items = notifications.all();
  const unread = notifications.unreadCount();

  async function clearAll() {
    const ok = await modal.confirm({
      title: "Clear all notifications?",
      message: "This removes every notification.",
      confirmLabel: "Clear",
      danger: true,
    });
    if (ok) notifications.clearAll();
  }

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Deadlines, attendance warnings and unlocked achievements — all in one place.</p>
      </div>

      <div>
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <span className="text-small muted">{unread ? unread + " unread" : "All caught up"}</span>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => notifications.markAllRead()}>Mark all read</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>Clear all</button>
          </div>
        </div>

        {items.length ? (
          <div className="card">
            {items.map((n) => (
              <div key={n.id} className={"notif-item" + (n.read ? "" : " is-unread")}>
                <NotificationIcon type={n.type} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="notif-item__title">{n.title}</span>
                  <span className="notif-item__body">{n.body}</span>
                  <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
                </span>
                <span className="row" style={{ gap: 2 }}>
                  {!n.read && (
                    <button type="button" className="icon-btn" aria-label="Mark read" onClick={() => notifications.markRead(n.id)}>
                      <Icon name="check" size={15} />
                    </button>
                  )}
                  <button type="button" className="icon-btn" aria-label="Delete" onClick={() => notifications.remove(n.id)}>
                    <Icon name="trash" size={15} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="empty">
              <span className="empty__icon"><Icon name="bell" size={26} /></span>
              <p className="empty__title">No notifications</p>
              <p className="empty__text">Deadline reminders, attendance warnings and unlocked achievements will show up here.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
