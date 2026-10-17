import { useEffect, useState } from "react";
import { Link } from "react-router";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import AuthField from "./AuthField.jsx";
import AuthDone from "./AuthDone.jsx";
import usePageMeta from "../../hooks/usePageMeta.js";
import { ensureDemoAccount, validateSignup, createAccount } from "../../lib/auth.js";

const ASIDE = {
  photo: "signup",
  quote: "Six notebooks, three apps and a group chat is not a system.",
  points: ["Tasks, timetable, notes and grades in one place", "Free, with no ads and no paid tier", "Your workspace follows you to any device"],
};

const EMPTY = { firstName: "", lastName: "", username: "", email: "", password: "", confirm: "" };

export default function Signup() {
  usePageMeta("Create your account — Synora", "Create a free Synora account and start with a clear week.");
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [doneName, setDoneName] = useState(null);
  const [busy, setBusy] = useState(false);

  // The demo account exists everywhere, so its username is always taken.
  useEffect(() => { ensureDemoAccount(); }, []);

  function change(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const v = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      username: values.username.trim(),
      email: values.email.trim(),
      password: values.password,
      confirm: values.confirm,
    };
    const found = validateSignup(v);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const refused = await createAccount(v);
    setBusy(false);
    if (Object.keys(refused).length) { setErrors(refused); return; }
    setDoneName(v.firstName);
  }

  const passwordType = showPassword ? "text" : "password";
  const field = (name, label, props, hint) => (
    <AuthField name={name} label={label} error={errors[name]} hint={hint}
      inputProps={{ ...props, value: values[name], onChange: change }} />
  );

  return (
    <AuthLayout aside={ASIDE}>
      <div className="auth-view" id="form-view" hidden={doneName !== null}>
        <div className="auth-head">
          <h1>Create your account</h1>
          <p>Your details set up your workspace — you'll personalize it in the next step.</p>
        </div>

        <form className="auth-form" id="signup-form" noValidate onSubmit={submit}>
          <div className="auth-form__row">
            {field("firstName", "First name", { type: "text", autoComplete: "given-name", placeholder: "Manan", required: true })}
            {field("lastName", "Last name", { type: "text", autoComplete: "family-name", placeholder: "Kochhar", required: true })}
          </div>

          {field("username", "Username",
            { type: "text", autoComplete: "username", placeholder: "manan_07", minLength: 3, maxLength: 20, required: true },
            "3–20 characters. Letters, numbers and underscores.")}
          {field("email", "Email",
            { type: "email", autoComplete: "email", placeholder: "you@example.com", required: true },
            "Only used for your account — never shared or shown to anyone.")}
          {field("password", "Password",
            { type: passwordType, autoComplete: "new-password", minLength: 8, required: true },
            "At least 8 characters, with a letter and a number.")}
          {field("confirm", "Confirm password", { type: passwordType, autoComplete: "new-password", required: true })}

          <div className="auth-options">
            <span className="check-row">
              <input type="checkbox" id="show-password" checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)} />
              <label htmlFor="show-password">Show password</label>
            </span>
          </div>

          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>Create account</button>
        </form>

        <p className="auth-alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>

      <AuthDone name={doneName} lead="Welcome to Synora," primary="onboarding"
        note="You can personalize later from Settings — nothing is locked in." />
    </AuthLayout>
  );
}
