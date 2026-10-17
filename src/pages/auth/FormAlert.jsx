/* The form-level message banner (.form-alert), shown when `message` is set. */
export default function FormAlert({ message }) {
  return (
    <div className={"form-alert" + (message ? " is-shown" : "")} role="alert">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
