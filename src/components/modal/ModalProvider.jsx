import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../Icon.jsx";

/* =========================================================
   Modals.

   open({ title, size, content, onClose }) shows a dialog; the
   content renders its own .modal__body and .modal__footer and
   closes itself with useModalClose(). Dialogs stack, fade and
   scale in, and close on ×, the backdrop or Escape — Escape
   only ever closes the top one, and the page stays scroll-
   locked until the last one is gone.

   confirm({ title, message, confirmLabel, cancelLabel, danger })
   resolves true or false.
   ========================================================= */

const ModalContext = createContext(null);
const CloseContext = createContext(null);
let nextId = 1;

const EXIT_MS = 220;

export function ModalProvider({ children }) {
  const [modals, setModals] = useState([]);

  const remove = useCallback((id) => {
    setModals((list) => list.map((m) => (m.id === id ? { ...m, closing: true } : m)));
    window.setTimeout(() => setModals((list) => list.filter((m) => m.id !== id)), EXIT_MS);
  }, []);

  const open = useCallback((config) => {
    const id = nextId++;
    setModals((list) => [...list, { ...config, id, closing: false }]);
    return id;
  }, []);

  const confirm = useCallback((config) => new Promise((resolve) => {
    open({
      title: config.title || "Are you sure?",
      size: "sm",
      content: <ConfirmContent {...config} onAnswer={resolve} />,
      onClose: () => resolve(false),
    });
  }), [open]);

  const api = useMemo(() => ({ open, confirm }), [open, confirm]);

  const live = modals.filter((m) => !m.closing);
  const topId = live.length ? live[live.length - 1].id : null;
  const anyOpen = live.length > 0;

  useLayoutEffect(() => {
    if (!anyOpen) return undefined;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [anyOpen]);

  return (
    <ModalContext.Provider value={api}>
      {children}
      {modals.map((m) => <ModalFrame key={m.id} modal={m} isTop={m.id === topId} remove={remove} />)}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}

/* For content inside a dialog: closes that dialog. */
export function useModalClose() {
  return useContext(CloseContext);
}

function ModalFrame({ modal, isTop, remove }) {
  const [entered, setEntered] = useState(false);
  const modalRef = useRef(null);
  const closedRef = useRef(false);
  const titleId = useId();
  const { id, onClose } = modal;

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (typeof onClose === "function") onClose();
    remove(id);
  }, [id, onClose, remove]);

  useEffect(() => {
    // Fade/scale in on the next frame, then focus the first field.
    const raf = requestAnimationFrame(() => setEntered(true));
    const focusTimer = window.setTimeout(() => {
      const body = modalRef.current && modalRef.current.querySelector(".modal__body");
      const first = body && body.querySelector("input, select, textarea, button");
      if (first) first.focus();
    }, 60);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(focusTimer);
    };
  }, []);

  useEffect(() => {
    if (!isTop) return undefined;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, isTop]);

  return createPortal(
    <div className={"modal-backdrop" + (entered && !modal.closing ? " is-open" : "")}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={modalRef} className={"modal" + (modal.size ? " modal--" + modal.size : "")}
        role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__header">
          <h2 className="modal__title" id={titleId}>{modal.title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <CloseContext.Provider value={close}>{modal.content}</CloseContext.Provider>
      </div>
    </div>,
    document.body
  );
}

function ConfirmContent({ message, cancelLabel, confirmLabel, danger, onAnswer }) {
  const close = useModalClose();
  const answer = (value) => { onAnswer(value); close(); };
  return (
    <>
      <div className="modal__body"><p className="muted">{message}</p></div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={() => answer(false)}>
          {cancelLabel || "Cancel"}
        </button>
        <button type="button" className={"btn " + (danger ? "btn--danger" : "btn--primary")}
          onClick={() => answer(true)}>
          {confirmLabel || "Confirm"}
        </button>
      </div>
    </>
  );
}
