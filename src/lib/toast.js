/* Toasts can be raised from anywhere — a page, a form, or the
   achievements engine — so the queue lives outside React and
   <Toaster> subscribes to it. Each toast times itself out here,
   so one raised just before leaving the app can't linger. */

const LEAVE_MS = 200;   // matches the toast-out animation (--duration-base)

let toasts = [];
let nextId = 1;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToasts() {
  return toasts;
}

export function clearToasts() {
  toasts = [];
  emit();
}

/* toast(title, { type: "info" | "success" | "error", message, duration }) */
export function toast(title, opts = {}) {
  const id = nextId++;
  const life = opts.duration || 3600;
  toasts = [...toasts, { id, title, type: opts.type || "info", message: opts.message || "", leaving: false }];
  emit();

  window.setTimeout(() => {
    toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
    emit();
  }, life);
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, life + LEAVE_MS);
}

toast.success = (title, message) => toast(title, { type: "success", message });
toast.error = (title, message) => toast(title, { type: "error", message });
toast.info = (title, message) => toast(title, { type: "info", message });
