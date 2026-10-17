import { useSyncExternalStore } from "react";
import Icon from "./Icon.jsx";
import { subscribeToasts, getToasts } from "../lib/toast.js";

const ICON_FOR = { success: "checkCircle", error: "alert", info: "info" };

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);

  return (
    <div className="toast-region" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={"toast toast--" + t.type + (t.leaving ? " is-leaving" : "")} role="status">
          <span className="toast__icon"><Icon name={ICON_FOR[t.type] || "info"} size={18} /></span>
          <span className="toast__body">
            <strong>{t.title}</strong>
            {t.message && <span>{t.message}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
