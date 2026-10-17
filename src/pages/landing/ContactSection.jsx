import { useEffect, useRef, useState } from "react";
import CheckMark from "../../components/CheckMark.jsx";
import { EMAIL_RE } from "../../lib/util.js";
import { api } from "../../lib/api.js";

/* PLACEHOLDERS — replace these with the real details; the markup reads
   them from here and nothing else needs to change. */
const CONTACT_INFO = {
  phone: "+91 98654 54345",
  email: "synora@gmail.com",
  office: "Sector 20, Panchkula, India",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Sector+20+Panchkula+India",
};

const FIELDS = ["name", "email", "phone", "message"];
const EMPTY = { name: "", email: "", phone: "", message: "" };

/* Phone numbers are written a dozen ways, so this checks the shape: an
   optional +, then 7–15 digits once spaces, dashes and brackets go. */
function isPhone(value) {
  return /^\+?\d{7,15}$/.test(value.replace(/[\s()\-.]/g, ""));
}

function validate(v) {
  const errors = {};
  if (!v.name) errors.name = "Please tell us your name.";
  else if (v.name.length < 2) errors.name = "That looks a little short.";

  if (!v.email) errors.email = "We need an email to reply to.";
  else if (!EMAIL_RE.test(v.email)) errors.email = "That doesn't look like an email address.";

  if (!v.phone) errors.phone = "Please add a phone number.";
  else if (!isPhone(v.phone)) errors.phone = "Use 7–15 digits, with an optional country code.";

  if (!v.message) errors.message = "Don't forget the message itself.";
  else if (v.message.length < 10) errors.message = "A little more detail will help us answer.";
  return errors;
}

/* The message is stored in the database (POST /api/contact →
   contact_messages); nobody is emailed. "Sent" is only shown once the
   database has it — if it can't be reached, the form says so and keeps
   what was typed. */
const MAX = { name: 100, email: 255, phone: 30, message: 5000 };
export default function ContactSection() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const inputs = useRef({});
  const sentHeading = useRef(null);
  const focusAfterReset = useRef(false);

  useEffect(() => {
    if (sent) sentHeading.current.focus();
    else if (focusAfterReset.current) {
      focusAfterReset.current = false;
      inputs.current.name.focus();
    }
  }, [sent]);

  function change(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    // Clear a field's error the moment it is edited.
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setFailure("");
    const trimmed = Object.fromEntries(FIELDS.map((f) => [f, values[f].trim()]));
    const found = validate(trimmed);
    setErrors(found);
    const firstBad = FIELDS.find((f) => found[f]);
    if (firstBad) {
      inputs.current[firstBad].focus();
      return;
    }
    setBusy(true);
    let ok = false;
    try {
      ok = (await api.contact(trimmed)).status === 201;
    } catch {
      ok = false;
    }
    setBusy(false);
    if (ok) setSent(true);
    else setFailure("Your message couldn't be sent right now. Nothing was lost — please try again in a little while.");
  }

  function reset() {
    setValues(EMPTY);
    setErrors({});
    setFailure("");
  }

  function sendAnother() {
    reset();
    focusAfterReset.current = true;
    setSent(false);
  }

  function field(name, label, input) {
    return (
      <div className={"field" + (errors[name] ? " is-invalid" : "")}>
        <label className="field__label" htmlFor={"contact-" + name}>{label}</label>
        {input}
        <p className="field__error">{errors[name] || ""}</p>
      </div>
    );
  }

  function inputProps(name) {
    return {
      className: "input",
      id: "contact-" + name,
      name,
      required: true,
      maxLength: MAX[name],
      value: values[name],
      onChange: (e) => change(name, e.target.value),
      "aria-invalid": errors[name] ? "true" : undefined,
      ref: (el) => { inputs.current[name] = el; },
    };
  }

  return (
    <section className="section contact" id="contact" aria-labelledby="contact-title">
      <div className="container">
        <div className="section-head section-head--center">
          <h2 id="contact-title">Contact Us</h2>
          <p>Questions, ideas, or something not working? We'd like to hear it.</p>
          <div className="rule" aria-hidden="true"></div>
        </div>

        <div className="contact-grid">
          <div className="contact-info">
            <h3>Contact information</h3>
            <p className="contact-info__lead">
              We're a small student project, so it's usually one of us replying
              rather than a support desk.
            </p>

            <ul className="contact-list">
              <li className="contact-item">
                <span className="contact-item__icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.09 4.18 2 2 0 0 1 4.08 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                  </svg>
                </span>
                <span className="contact-item__body">
                  <span className="contact-item__label">Phone</span>
                  <a className="contact-item__value" href={"tel:" + CONTACT_INFO.phone.replace(/[^\d+]/g, "")}>
                    {CONTACT_INFO.phone}
                  </a>
                  <span className="contact-item__note">Mon–Fri, 10am–6pm IST</span>
                </span>
              </li>

              <li className="contact-item">
                <span className="contact-item__icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m2 7 10 6 10-6" />
                  </svg>
                </span>
                <span className="contact-item__body">
                  <span className="contact-item__label">Email</span>
                  <a className="contact-item__value" href={"mailto:" + CONTACT_INFO.email}>{CONTACT_INFO.email}</a>
                  <span className="contact-item__note">We usually reply within a day or two</span>
                </span>
              </li>

              <li className="contact-item">
                <span className="contact-item__icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span className="contact-item__body">
                  <span className="contact-item__label">Office</span>
                  <span className="contact-item__value">{CONTACT_INFO.office}</span>
                  {/* Hidden until a map link is configured — inventing one would be worse. */}
                  <a className="contact-item__link" href={CONTACT_INFO.mapUrl || "#"} hidden={!CONTACT_INFO.mapUrl}
                    target="_blank" rel="noopener noreferrer">
                    View location
                  </a>
                </span>
              </li>
            </ul>
          </div>

          <div className="contact-form-card">
            <h3>Get in Touch</h3>

            {/* noValidate: our messages, not the browser's bubbles. */}
            <form className="contact-form" id="contact-form" noValidate hidden={sent}
              onSubmit={submit} onReset={reset}>
              {field("name", "Name",
                <input {...inputProps("name")} type="text" autoComplete="name" placeholder="Your name" />)}
              {field("email", "Email",
                <input {...inputProps("email")} type="email" autoComplete="email" placeholder="you@example.com" />)}
              {field("phone", "Phone Number",
                <input {...inputProps("phone")} type="tel" autoComplete="tel" placeholder="+91 98765 43210" />)}
              {field("message", "Message",
                <textarea {...inputProps("message")} className="input contact-form__textarea" rows="5"
                  placeholder="What's on your mind?" />)}

              {failure && <p className="contact-form__failure" role="alert">{failure}</p>}

              <div className="contact-form__actions">
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? "Sending…" : "Send Message"}
                </button>
                <button type="reset" className="btn btn--ghost">Clear</button>
              </div>
            </form>

            <div className="contact-sent" hidden={!sent}>
              <span className="contact-sent__mark" aria-hidden="true"><CheckMark size={24} /></span>
              <h4 tabIndex="-1" ref={sentHeading}>Message sent.</h4>
              <p>Thanks for writing — we'll get back to you at the email you gave.</p>
              <button type="button" className="btn btn--ghost btn--sm" onClick={sendAnother}>
                Send another message
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
