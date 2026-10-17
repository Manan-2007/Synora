import { ILLUSTRATIONS, AVATAR_COLORS } from "../data/avatars.js";
import { IllustrationArt, InitialsArt } from "./AvatarArt.jsx";

/* The avatar picker shared by onboarding and Settings.

   Both kinds of avatar are ONE radio group, so "exactly one avatar" is
   enforced by the browser rather than by a flag someone has to clear.
   Real radio inputs: arrow keys, a checked state and labels come free. */
export default function AvatarPicker({ name, value, onChange, initials, artSize, note, ...fieldsetProps }) {
  const isSelected = (type, id) => !!value && value.type === type && value.id === id;

  return (
    <fieldset {...fieldsetProps}>
      <legend className="picker-legend">Illustrations</legend>
      <div className="avatar-grid">
        {ILLUSTRATIONS.map((a) => {
          const checked = isSelected("illustration", a.id);
          return (
            <label key={a.id} className={"avatar-option" + (checked ? " is-selected" : "")}>
              <input type="radio" name={name} value={"illustration:" + a.id} checked={checked}
                onChange={() => onChange({ type: "illustration", id: a.id })} />
              <span className="avatar-option__art"><IllustrationArt id={a.id} size={artSize} /></span>
              <span className="avatar-option__check" aria-hidden="true">✓</span>
              <span className="visually-hidden">{a.label}</span>
            </label>
          );
        })}
      </div>

      <div className="picker-or"><span>or</span></div>

      <legend className="picker-legend">Use your initials</legend>
      {note && <p className="picker-legend__note">{note}</p>}
      <div className="avatar-swatches">
        {AVATAR_COLORS.map((c) => {
          const checked = isSelected("initials", c.id);
          return (
            <label key={c.id} className={"avatar-swatch" + (checked ? " is-selected" : "")}>
              <input type="radio" name={name} value={"initials:" + c.id} checked={checked}
                onChange={() => onChange({ type: "initials", id: c.id })} />
              <span className="avatar-swatch__art"><InitialsArt colorId={c.id} size={56} initials={initials} /></span>
              <span className="avatar-swatch__check" aria-hidden="true">✓</span>
              <span className="visually-hidden">{"Your initials on " + c.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
