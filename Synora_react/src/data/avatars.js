/* =========================================================
   Avatars — two ways to have a face, exactly one active:

     1. one of TWELVE illustrated avatars   (src/assets/avatars)
     2. your initials on one of SIX colours (drawn as SVG)

   Stored as { type: "illustration", id: "avatar-03" }
          or { type: "initials",     id: "sage" }.

   The illustrations are the "Lorelei" style from DiceBear by
   Lisa Wischofsky, released under CC0 1.0 — only that style's
   licence is relied on (several other DiceBear styles are
   CC-BY-4.0). They are bundled files, so they render with no
   network and nothing about the user is sent anywhere.
   ========================================================= */

const FILES = import.meta.glob("../assets/avatars/*.svg", { eager: true, import: "default" });

/* Labels describe the picture, so the radio group reads sensibly to a
   screen reader instead of "Avatar 7". */
export const ILLUSTRATIONS = [
  { id: "avatar-01", label: "Illustrated avatar: long straight hair" },
  { id: "avatar-02", label: "Illustrated avatar: voluminous curls" },
  { id: "avatar-03", label: "Illustrated avatar: blunt bob with a fringe" },
  { id: "avatar-04", label: "Illustrated avatar: short tousled curls" },
  { id: "avatar-05", label: "Illustrated avatar: hair tied up in a bun" },
  { id: "avatar-06", label: "Illustrated avatar: short dark hair" },
  { id: "avatar-07", label: "Illustrated avatar: swept-back wavy hair" },
  { id: "avatar-08", label: "Illustrated avatar: high ponytail" },
  { id: "avatar-09", label: "Illustrated avatar: shoulder-length waves" },
  { id: "avatar-10", label: "Illustrated avatar: long loose curls" },
  { id: "avatar-11", label: "Illustrated avatar: short side-parted hair" },
  { id: "avatar-12", label: "Illustrated avatar: cropped curly hair" },
].map((a) => ({ ...a, src: FILES["../assets/avatars/" + a.id + ".svg"] }));

/* Derived from the Synora palette rather than six versions of the brand
   green. Each background/foreground pair clears WCAG AA for large text. */
export const AVATAR_COLORS = [
  { id: "sage",  label: "Sage",  bg: "#53655C", fg: "#FFFFFF" },
  { id: "ink",   label: "Ink",   bg: "#22252B", fg: "#FFFFFF" },
  { id: "taupe", label: "Taupe", bg: "#B09F95", fg: "#22252B" },
  { id: "slate", label: "Slate", bg: "#6B7F86", fg: "#FFFFFF" },
  { id: "clay",  label: "Clay",  bg: "#C0574E", fg: "#FFFFFF" },
  { id: "mist",  label: "Mist",  bg: "#E5E8EB", fg: "#22252B" },
];

export const ILLUSTRATION_BY_ID = Object.fromEntries(ILLUSTRATIONS.map((a) => [a.id, a]));
export const COLOR_BY_ID = Object.fromEntries(AVATAR_COLORS.map((c) => [c.id, c]));
