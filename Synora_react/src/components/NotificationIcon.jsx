import Icon from "./Icon.jsx";

const TINT = { danger: "tint-danger", warning: "tint-warning", success: "tint-success" };
const ICON = { danger: "alert", success: "trophy", warning: "clock" };

/* The tinted square in front of a notification, shared by the bell
   dropdown and the Notifications page. */
export default function NotificationIcon({ type }) {
  return (
    <span className={"notif-item__icon " + (TINT[type] || "tint-brand")}>
      <Icon name={ICON[type] || "info"} size={16} />
    </span>
  );
}
