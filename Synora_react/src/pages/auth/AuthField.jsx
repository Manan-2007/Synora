/* A labelled input with its hint and error, styled by .field / .is-invalid. */
export default function AuthField({ name, label, error, hint, inputProps }) {
  return (
    <div className={"field" + (error ? " is-invalid" : "")}>
      <label className="field__label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} {...inputProps} />
      {hint && <p className="field__hint">{hint}</p>}
      <p className="field__error">{error || ""}</p>
    </div>
  );
}
