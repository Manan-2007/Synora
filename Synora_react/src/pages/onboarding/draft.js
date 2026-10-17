/* The onboarding answers live in an explicit draft object — the rendered
   step is a VIEW of it, so moving back and forth (or reloading halfway)
   cannot lose an answer. It is mirrored to synora:<user>:onboarding on
   every change and cleared once setup finishes. */

import { readJSON, writeJSON, removeKey, store, profile, userKey } from "../../lib/storage.js";
import { uid } from "../../lib/util.js";
import { getTheme, saveThemePreference } from "../../lib/theme.js";

const draftKey = () => userKey("onboarding");

export function blankSubject() {
  return { id: uid("sub"), name: "", credits: "", trackAttendance: true };
}

function freshDraft(p) {
  return {
    step: 0,
    avatar: p.avatar || null,
    program: p.program || "",
    semester: p.semester || "",
    subjects: store.get("subjects").map((s) => ({
      id: s.id,
      name: s.name,
      credits: s.credits,
      trackAttendance: s.trackAttendance !== false,
    })),
    targetAttendance: p.targetAttendance || 75,
    appearance: getTheme(),
  };
}

/* A saved draft is merged over a fresh one, so a field added later still
   gets a sensible default. */
export function loadDraft(p) {
  const draft = freshDraft(p);
  const saved = readJSON(draftKey(), null);
  if (saved && typeof saved === "object") {
    Object.keys(draft).forEach((k) => {
      if (saved[k] !== undefined && saved[k] !== null) draft[k] = saved[k];
    });
  }
  if (!Array.isArray(draft.subjects)) draft.subjects = [];
  // Start with one empty subject row so the step isn't a blank slate.
  if (!draft.subjects.length) draft.subjects.push(blankSubject());
  return draft;
}

export function saveDraft(draft) {
  writeJSON(draftKey(), draft);
}

export function clearDraft() {
  removeKey(draftKey());
}

/* What is typed is kept as typed; the draft's stored values are trimmed
   whenever the person moves on, as they were in the vanilla build. */
export function tidy(draft) {
  return {
    ...draft,
    program: String(draft.program).trim(),
    subjects: draft.subjects.map((s) => ({ ...s, name: String(s.name).trim() })),
  };
}

/* Write whatever has been answered so far: the profile fields and the
   canonical subject list. `complete` decides whether this also marks
   setup as finished. The theme is remembered for the next page. */
export function persistAnswers(d, complete) {
  profile.save({
    avatar: d.avatar,
    program: d.program,
    semester: d.semester,
    targetAttendance: d.targetAttendance,
    appearance: d.appearance,
    onboarded: complete ? true : profile.get().onboarded,
  });
  store.subjects.setAll(d.subjects
    .filter((s) => s.name)
    .map((s) => ({ id: s.id, name: s.name, credits: Number(s.credits) || 0, trackAttendance: s.trackAttendance !== false })));
  saveThemePreference(d.appearance);
}

/* Each check returns an error message, or null when the step is satisfied. */
export function checkAcademic(draft) {
  if (!draft.program) return "Add your program so your dashboard knows what you study.";
  if (!draft.semester) return "Choose the semester you're in.";
  return null;
}

export function checkSubjects(draft) {
  const named = draft.subjects.filter((s) => s.name);
  if (!named.length) return "Add at least one subject — the rest of Synora is built around them.";
  if (named.some((s) => !s.credits)) return "Give every subject its credit value so your CGPA can be worked out.";

  const seen = new Set();
  const duplicate = named.some((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
  if (duplicate) return "Two subjects share a name — give each one its own.";
  return null;
}
