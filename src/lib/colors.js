/* =========================================================
   Subject colours.

   Each subject has a colour from this palette (subjects.color,
   e.g. "teal"), used across the app: timetable blocks, calendar
   chips, task tags, charts and the dashboard schedule. The
   actual shades live in tokens.css as --subject-<name>, with a
   lighter variant for dark mode. Components set --subject on an
   element (subjectVar) and their CSS reads var(--subject).
   ========================================================= */

export const SUBJECT_COLORS = [
  { id: "sage", label: "Sage" },
  { id: "teal", label: "Teal" },
  { id: "sky", label: "Sky" },
  { id: "indigo", label: "Indigo" },
  { id: "plum", label: "Plum" },
  { id: "rose", label: "Rose" },
  { id: "clay", label: "Clay" },
  { id: "amber", label: "Amber" },
  { id: "olive", label: "Olive" },
  { id: "stone", label: "Stone" },
];

const IDS = SUBJECT_COLORS.map((c) => c.id);

export const isSubjectColor = (id) => IDS.includes(id);

/* The first colour no other subject uses yet (round-robin once all ten are
   taken). */
export function nextColor(subjects) {
  const used = new Set(subjects.map((s) => s.color).filter(Boolean));
  return IDS.find((id) => !used.has(id)) || IDS[subjects.length % IDS.length];
}

/* style={subjectVar(color)} → the element's --subject is that colour. */
export function subjectVar(color) {
  return { "--subject": "var(--subject-" + (isSubjectColor(color) ? color : "stone") + ")" };
}
