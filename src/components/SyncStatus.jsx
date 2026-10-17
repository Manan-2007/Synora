import { useSyncExternalStore } from "react";
import Icon from "./Icon.jsx";
import { syncStatus, onSyncStatus } from "../lib/sync.js";

/* Where the signed-in workspace is saved, at a glance (top bar). */
const STATES = {
  saved:   { icon: "cloudCheck", label: "Saved",       text: "All changes are saved to your account." },
  saving:  { icon: "syncing",    label: "Saving…",     text: "Saving your latest change…" },
  offline: { icon: "cloudOff",   label: "Offline",     text: "Can't reach the server. Your changes are kept on this device and will save automatically." },
  error:   { icon: "cloudOff",   label: "Not saved",   text: "A change couldn't be saved to your account. It's kept on this device." },
  local:   { icon: "laptop",     label: "This device", text: "Saved in this browser only: not connected to your online account right now." },
};

export default function SyncStatus() {
  const status = useSyncExternalStore(onSyncStatus, syncStatus);
  const s = STATES[status] || STATES.local;
  /* Only problems are announced to screen readers; routine "Saving… /
     Saved" would interrupt on every edit. */
  const announce = status === "offline" || status === "error" ? s.text : "";
  return (
    <>
      <span className={"sync-pill sync-pill--" + status} role="img" aria-label={s.text} title={s.text}>
        <Icon name={s.icon} size={15} />
        <span className="sync-pill__label" aria-hidden="true">{s.label}</span>
      </span>
      <span className="visually-hidden" role="status" aria-live="polite">{announce}</span>
    </>
  );
}
