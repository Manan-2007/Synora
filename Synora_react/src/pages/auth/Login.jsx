import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import AuthField from "./AuthField.jsx";
import AuthDone from "./AuthDone.jsx";
import FormAlert from "./FormAlert.jsx";
import usePageMeta from "../../hooks/usePageMeta.js";
import { ensureDemoAccount, signIn } from "../../lib/auth.js";
import { demo } from "../../lib/demo.js";
import { profile } from "../../lib/storage.js";

const ASIDE = {
  photo: "login",
  quote: "A due date on Friday shouldn't be a surprise on Thursday night.",
  points: ["Your whole week on one timeline", "CGPA and attendance worked out for you", "Nothing uploaded, nothing tracked"],
};

export default function Login() {
  usePageMeta("Sign in — Synora", "Sign in to your Synora workspace.");
  const [values, setValues] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [doneName, setDoneName] = useState(null);
  const submitRef = useRef(null);

  // "Use the demo account" must work on a browser that has never opened Synora.
  useEffect(() => { ensureDemoAccount(); }, []);

  function change(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
    setAlert("");
  }

  function submit(e) {
    e.preventDefault();
    setErrors({});
    setAlert("");

    const username = values.username.trim();
    if (!username) { setErrors({ username: "Enter your username." }); return; }
    if (!values.password) { setErrors({ password: "Enter your password." }); return; }

    const user = signIn(username, values.password);
    if (!user) {
      // Deliberately vague — don't reveal which half was wrong.
      setAlert("That username and password don't match an account.");
      return;
    }
    setDoneName(profile.get().firstName || user.username);
  }

  function fillDemo() {
    setErrors({});
    setAlert("");
    setValues({ username: demo.username, password: demo.password });
    submitRef.current.focus();
  }

  return (
    <AuthLayout aside={ASIDE}>
      <div className="auth-view" id="form-view" hidden={doneName !== null}>
        <div className="auth-head">
          <h1>Welcome back</h1>
          <p>Sign in to pick up your week where you left it.</p>
        </div>

        {/* noValidate: our own messages instead of the browser's bubbles. */}
        <form className="auth-form" id="login-form" noValidate onSubmit={submit}>
          <FormAlert message={alert} />

          <AuthField name="username" label="Username" error={errors.username} inputProps={{
            type: "text", autoComplete: "username", placeholder: "manan_07", required: true, autoFocus: true,
            value: values.username, onChange: change,
          }} />

          <AuthField name="password" label="Password" error={errors.password} inputProps={{
            type: showPassword ? "text" : "password", autoComplete: "current-password", required: true,
            value: values.password, onChange: change,
          }} />

          <div className="auth-options">
            <span className="check-row">
              <input type="checkbox" id="show-password" checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)} />
              <label htmlFor="show-password">Show password</label>
            </span>
          </div>

          <button type="submit" className="btn btn--primary btn--lg btn--block" ref={submitRef}>Sign in</button>
        </form>

        {/* The credential is local to this project and unlocks nothing but
            this browser's localStorage. */}
        <div className="auth-demo">
          <p className="auth-demo__title">Just looking around?</p>
          <p className="auth-demo__text">
            Open the sample workspace for <strong>Arshpreet Kaur</strong> —
            a semester's worth of tasks, notes, attendance and grades already in place.
          </p>
          <button type="button" className="btn btn--ghost btn--block" id="use-demo" onClick={fillDemo}>
            Use the demo account
          </button>
        </div>

        <p className="auth-alt">
          New to Synora? <Link to="/signup">Create an account</Link>
        </p>
      </div>

      <AuthDone name={doneName} lead="Welcome back," primary="dashboard" />
    </AuthLayout>
  );
}
