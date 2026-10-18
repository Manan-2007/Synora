/* Small illustrations for empty states. Drawn in the app's own colour
   tokens (classes below → styles/app.css .empty-art), so they follow the
   theme. Decorative: hidden from screen readers; the empty state's text
   says what's going on. */

const ART = {
  /* A clipboard with a ticked list */
  tasks: (
    <>
      <circle className="ea-bg" cx="80" cy="64" r="48" />
      <circle className="ea-bg2" cx="122" cy="30" r="8" />
      <rect className="ea-paper" x="50" y="30" width="60" height="76" rx="9" />
      <rect className="ea-brand" x="65" y="23" width="30" height="13" rx="5" />
      <rect className="ea-brand" x="61" y="48" width="12" height="12" rx="3" />
      <path className="ea-check" d="m64 54 3 3 5-6" />
      <path className="ea-line" d="M80 54h20" />
      <rect className="ea-box" x="61" y="68" width="12" height="12" rx="3" />
      <path className="ea-line" d="M80 74h16" />
      <rect className="ea-box" x="61" y="88" width="12" height="12" rx="3" />
      <path className="ea-line" d="M80 94h12" />
    </>
  ),
  /* Two notes and a pencil */
  notes: (
    <>
      <circle className="ea-bg" cx="80" cy="64" r="48" />
      <rect className="ea-paper ea-paper--warm" x="44" y="36" width="54" height="62" rx="8" transform="rotate(-9 71 67)" />
      <rect className="ea-paper" x="62" y="32" width="54" height="64" rx="8" />
      <path className="ea-line" d="M72 48h34M72 60h34M72 72h22" />
      <path className="ea-pencil" d="m100 100 26-26 7 7-26 26-9 2z" />
      <path className="ea-ink" d="m121 79 7 7" />
    </>
  ),
  /* A week grid and a clock */
  timetable: (
    <>
      <circle className="ea-bg" cx="78" cy="62" r="48" />
      <rect className="ea-paper" x="40" y="32" width="70" height="62" rx="9" />
      <rect className="ea-brand" x="40" y="32" width="70" height="14" rx="7" />
      <rect className="ea-brand" x="40" y="39" width="70" height="7" />
      <g className="ea-dots">
        <circle cx="54" cy="60" r="3.5" /><circle cx="68" cy="60" r="3.5" /><circle cx="82" cy="60" r="3.5" /><circle cx="96" cy="60" r="3.5" />
        <circle cx="54" cy="76" r="3.5" /><circle cx="68" cy="76" r="3.5" /><circle cx="82" cy="76" r="3.5" />
      </g>
      <circle className="ea-paper" cx="112" cy="86" r="20" />
      <path className="ea-brand-stroke" d="M112 75v11l7 5" />
    </>
  ),
  /* Rising bars and a star */
  grades: (
    <>
      <circle className="ea-bg" cx="80" cy="64" r="48" />
      <path className="ea-ink" d="M44 100h74" />
      <rect className="ea-bar ea-bar--1" x="50" y="74" width="14" height="26" rx="3" />
      <rect className="ea-bar ea-bar--2" x="72" y="58" width="14" height="42" rx="3" />
      <rect className="ea-brand" x="94" y="40" width="14" height="60" rx="3" />
      <path className="ea-star" d="m120 22 3.4 7 7.6 1.1-5.5 5.4 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" />
    </>
  ),
  /* A calendar page with ticks */
  attendance: (
    <>
      <circle className="ea-bg" cx="80" cy="64" r="48" />
      <rect className="ea-paper" x="44" y="30" width="72" height="72" rx="10" />
      <path className="ea-ink" d="M60 24v12M100 24v12" />
      <path className="ea-line" d="M44 48h72" />
      <circle className="ea-brand" cx="62" cy="64" r="7" /><path className="ea-check" d="m59 64 2 2 4-4" />
      <circle className="ea-brand" cx="80" cy="64" r="7" /><path className="ea-check" d="m77 64 2 2 4-4" />
      <circle className="ea-box" cx="98" cy="64" r="7" />
      <circle className="ea-brand" cx="62" cy="84" r="7" /><path className="ea-check" d="m59 84 2 2 4-4" />
      <circle className="ea-box" cx="80" cy="84" r="7" />
    </>
  ),
  /* A quiet bell */
  bell: (
    <>
      <circle className="ea-bg" cx="80" cy="64" r="48" />
      <path className="ea-paper" d="M80 30c-15 0-24 11-24 26 0 18-8 24-8 24h64s-8-6-8-24c0-15-9-26-24-26Z" />
      <path className="ea-brand-stroke" d="M72 90a8 8 0 0 0 16 0" />
      <path className="ea-ink" d="M108 30h10l-10 11h10M122 18h7l-7 8h7" />
    </>
  ),
  /* A stack of books in subject colours */
  subjects: (
    <>
      <circle className="ea-bg" cx="80" cy="64" r="48" />
      <rect className="ea-book" style={{ fill: "var(--subject-teal)" }} x="46" y="80" width="70" height="16" rx="3" />
      <rect className="ea-book" style={{ fill: "var(--subject-amber)" }} x="52" y="63" width="62" height="16" rx="3" />
      <rect className="ea-book" style={{ fill: "var(--subject-plum)" }} x="44" y="46" width="66" height="16" rx="3" />
      <path className="ea-pages" d="M50 54h50M58 71h46M52 88h56" />
      <path className="ea-star" d="m120 30 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" />
    </>
  ),
  /* A cup of tea: nothing due */
  calm: (
    <>
      <circle className="ea-bg" cx="80" cy="64" r="48" />
      <path className="ea-paper" d="M52 60h50v16a22 22 0 0 1-22 22h-6a22 22 0 0 1-22-22Z" />
      <path className="ea-ink" d="M102 66h5a9 9 0 0 1 0 18h-6" />
      <path className="ea-ink" d="M44 104h70" />
      <path className="ea-steam" d="M66 50c-4-5 4-8 0-14M78 50c-4-5 4-8 0-14M90 50c-4-5 4-8 0-14" />
    </>
  ),
};

export default function EmptyArt({ name }) {
  return (
    <svg className="empty-art" viewBox="0 0 160 120" width="160" height="120" aria-hidden="true" focusable="false">
      {ART[name] || ART.tasks}
    </svg>
  );
}
