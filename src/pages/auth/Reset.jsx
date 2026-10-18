import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import AuthField from "./AuthField.jsx";
import FormAlert from "./FormAlert.jsx";
import usePageMeta from "../../hooks/usePageMeta.js";
import { passwordProblem, resetPassword } from "../../lib/auth.js";

const ASIDE = {
  photo: "login",
  quote: "A fresh password, and straight back to your week.",
  points: ["Signs you out everywhere else", "Your workspace stays untouched", "The link works only once"],
};

/* Step 2: the link from the email (/reset?u=<username>&token=<token>). */
export default function Reset() {
  usePageMeta("Choose a new password — Synora", "Choose a new password for your Synora account.");
  const [params] = useSearchParams();
  const username = params.get("u") || "";
  const token = params.get("token") || "";
  const [v, setV] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const broken = !username || !/^[0-9a-f]{64}$/.test(token);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const found = {};
    const pw = passwordProblem(v.password);
    if (pw) found.password = pw;
    if (v.confirm !== v.password) found.confirm = "Passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = await resetPassword(username, token, v.password);
    setBusy(false);
    if (Object.keys(res).length) { setErrors(res); return; }
    setDone(true);
  }

  const change = (k) => (e) => { setV((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: "" })); };

  return (
    <AuthLayout aside={ASIDE}>
      <div className="auth-view">
        {broken ? (
          <div className="auth-head">
            <h1>This link isn't complete</h1>
            <p>Open the link straight from the email, or ask for a new one.</p>
          </div>
        ) : done ? (
          <div className="auth-head">
            <h1>Password changed</h1>
            <p>You can now sign in as <strong>{username}</strong> with your new password. Every other device was signed out.</p>
          </div>
        ) : (
          <>
            <div className="auth-head">
              <h1>Choose a new password</h1>
              <p>For the account <strong>{username}</strong>.</p>
            </div>
            <form className="auth-form" noValidate onSubmit={submit}>
              <FormAlert message={errors.form || ""} />
              <AuthField name="password" label="New password" error={errors.password}
                hint="At least 8 characters, with a letter and a number." inputProps={{
                  type: "password", autoComplete: "new-password", required: true, autoFocus: true,
                  value: v.password, onChange: change("password"),
                }} />
              <AuthField name="confirm" label="Confirm new password" error={errors.confirm} inputProps={{
                type: "password", autoComplete: "new-password", required: true,
                value: v.confirm, onChange: change("confirm"),
              }} />
              <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
                {busy ? "Saving…" : "Save new password"}
              </button>
            </form>
          </>
        )}
        <p className="auth-alt">
          {done ? <Link to="/login">Sign in</Link> : <>Need a new link? <Link to="/forgot">Send another</Link></>}
        </p>
      </div>
    </AuthLayout>
  );
}
