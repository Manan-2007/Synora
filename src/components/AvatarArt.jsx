import { ILLUSTRATION_BY_ID, AVATAR_COLORS, COLOR_BY_ID } from "../data/avatars.js";
import { profile } from "../lib/storage.js";

/* Deliberately NOT loading="lazy": avatars are small and always above the
   fold, and a lazy image inside a hidden container never loads. */
export function IllustrationArt({ id, size = 80, label = "" }) {
  return (
    <img className="avatar-art" src={ILLUSTRATION_BY_ID[id].src}
      width={size} height={size} alt={label} decoding="async" />
  );
}

/* Initials on a colour, drawn as SVG so it scales exactly like the
   illustrations and fits the same grid cell. */
export function InitialsArt({ colorId, size = 80, initials }) {
  const c = COLOR_BY_ID[colorId] || AVATAR_COLORS[0];
  const text = initials || "S";
  return (
    <svg className="avatar-art" width={size} height={size} viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label={text}>
      <rect width="80" height="80" rx="40" fill={c.bg} />
      <text x="40" y="40" fill={c.fg} fontFamily="Manrope, Inter, system-ui, sans-serif"
        fontSize="30" fontWeight="700" letterSpacing="0.5"
        textAnchor="middle" dominantBaseline="central">{text}</text>
    </svg>
  );
}

/* Whatever is stored on the profile, drawn — falling back to initials on
   the default colour when nothing valid is chosen. */
export function AvatarArt({ avatar, size, initials }) {
  if (avatar && avatar.type === "illustration" && ILLUSTRATION_BY_ID[avatar.id]) {
    return <IllustrationArt id={avatar.id} size={size} label={ILLUSTRATION_BY_ID[avatar.id].label} />;
  }
  if (avatar && avatar.type === "initials" && COLOR_BY_ID[avatar.id]) {
    return <InitialsArt colorId={avatar.id} size={size} initials={initials} />;
  }
  return <InitialsArt colorId={AVATAR_COLORS[0].id} size={size} initials={initials} />;
}

/* The signed-in person's face, wherever it appears — one component, so
   the sidebar, topbar, dashboard and settings can never disagree. */
export function UserAvatar({ size = 36, className }) {
  const p = profile.get();
  return (
    <span className={"avatar" + (className ? " " + className : "") + " avatar--art"}
      style={{ width: size, height: size }}>
      <AvatarArt avatar={p.avatar} size={size} initials={p.initials} />
    </span>
  );
}
