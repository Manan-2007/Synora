import { useState } from "react";
import { Link } from "react-router";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import AuthField from "./AuthField.jsx";
import FormAlert from "./FormAlert.jsx";
import usePageMeta from "../../hooks/usePageMeta.js";
import { requestReset } from "../../lib/auth.js";

const ASIDE = {
  photo: "login",
  quote: "Locked out happens. Your week is still right where you left it.",
  points: ["A one-time link by email", "Valid for 30 minutes", "Your workspace stays untouched"],
};

/* Step 1 of a password reset: ask for the username or email and send a
   one-time link (server: POST /api/password/forgot). The answer is the
   same whether or not an account matched. */
export default function Forgot() {
  usePageMeta("Forgot password — Synora", "Reset your Synora password by email.");
  const [who, setWho] = useState("");
  const [error, setError] = useState("");
  const [alert, setAlert] = useState("");
  const [state, setState] = useState("form");   // form | sent | not-set-up
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setAlert("");
    if (!who.trim()) { setError("Enter your username or the email on your account."); return; }
    setBusy(true);
    const result = await requestReset(who.trim());
    setBusy(false);
    if (result === "error") { setAlert("Couldn't reach the server. Check your connection and try again."); return; }
    setState(result);
  }

  return (
    <AuthLayout aside={ASIDE}>
      {state === "form" && (
        <div className="auth-view">
          <div className="auth-head">
            <h1>Forgot your password?</h1>
            <p>Enter your username or email and we'll send you a link to choose a new one.</p>
          </div>
          <form className="auth-form" noValidate onSubmit={submit}>
            <FormAlert message={alert} />
            <AuthField name="who" label="Username or email" error={error} inputProps={{
              type: "text", autoComplete: "username", required: true, autoFocus: true, value: who,
              onChange: (e) => { setWho(e.target.value); setError(""); },
            }} />
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p className="auth-alt">Remembered it? <Link to="/login">Back to sign in</Link></p>
        </div>
      )}

      {state === "sent" && (
        <div className="auth-view">
          <div className="auth-head">
            <h1>Check your email</h1>
            <p>
              If an account matches <strong>{who.trim()}</strong>, a reset link is on its way. It works once, for 30
              minutes. Can't see it? Look in your spam folder.
            </p>
          </div>
          <p className="auth-alt"><Link to="/login">Back to sign in</Link></p>
        </div>
      )}

      {state === "not-set-up" && (
        <div className="auth-view">
          <div className="auth-head">
            <h1>Reset by email isn't set up yet</h1>
            <p>
              This copy of Synora hasn't been connected to an email service, so it can't send reset links. If you
              still know your password on another device, sign in there and change it in Settings.
            </p>
          </div>
          <p className="auth-alt"><Link to="/login">Back to sign in</Link></p>
        </div>
      )}
    </AuthLayout>
  );
}
