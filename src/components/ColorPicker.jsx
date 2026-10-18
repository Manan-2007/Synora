import { SUBJECT_COLORS, subjectVar } from "../lib/colors.js";

/* A row of colour swatches (radio buttons) for a subject. */
export default function ColorPicker({ value, onChange, name = "subject-color" }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Colour">
      {SUBJECT_COLORS.map((c) => (
        <label key={c.id} className="swatch" style={subjectVar(c.id)} title={c.label}>
          <input type="radio" name={name} value={c.id} checked={value === c.id}
            onChange={() => onChange(c.id)} />
          <span className="visually-hidden">{c.label}</span>
        </label>
      ))}
    </div>
  );
}
