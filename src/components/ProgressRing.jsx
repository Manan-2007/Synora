/* A ring with a value inside it (CGPA and attendance summaries).
   frac is 0–1; color overrides the default brand stroke. */
export default function ProgressRing({ frac, value, label, color }) {
  const r = 46;
  const C = 2 * Math.PI * r;
  return (
    <div className="ring-wrap">
      <svg className="ring" width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
        <circle className="ring__track" cx="64" cy="64" r={r} strokeWidth="12"></circle>
        {/* Colour as an inline style: .ring__fill sets stroke in CSS, which beats an attribute. */}
        <circle className="ring__fill" cx="64" cy="64" r={r} strokeWidth="12" style={color ? { stroke: color } : undefined}
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}></circle>
      </svg>
      <span className="ring-wrap__center">
        <span className="ring-wrap__value">{value}</span>
        <span className="ring-wrap__label">{label}</span>
      </span>
    </div>
  );
}
