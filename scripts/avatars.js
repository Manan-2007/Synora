/* =========================================================
   Synora — Avatars

   Two ways to have a face in Synora, and exactly one of them
   is active at a time:

     1. one of TWELVE illustrated avatars   (assets/avatars/)
     2. your initials on one of SIX colours (drawn in CSS/SVG)

   The stored value says which:

     { type: "illustration", id: "avatar-03" }
     { type: "initials",     id: "sage" }

   ---------------------------------------------------------
   Where the illustrations come from, and the licence
   ---------------------------------------------------------
   They are the "Lorelei" style from DiceBear, by the
   designer Lisa Wischofsky, released under CC0 1.0 (public
   domain — no attribution required, commercial use allowed).

     style   https://www.dicebear.com/styles/lorelei/
     origin  https://www.figma.com/community/file/1198749693280469639
     licence CC0 1.0

   Only that one style is used, and only its licence is being
   relied on. DiceBear's styles do NOT share a single licence
   — several others are CC-BY-4.0 and would need visible
   credit — so "DiceBear is CC0" would be the wrong claim to
   make. Each file keeps its own <metadata> licence block.

   The twelve SVGs were generated once and SAVED INTO THE
   REPO rather than requested from the API at runtime. That
   matters for a project like this: the avatars render with no
   network, nothing about the user is sent to a third party,
   and the grid can't half-load in front of an examiner. They
   are vectors, so 28px in the sidebar is as crisp as 96px in
   onboarding.

   They were curated, not taken as the first twelve generated.
   Twenty-four were rendered and half were rejected — the ones
   with squinting, scowling or otherwise odd expressions — to
   leave twelve friendly faces with genuinely different hair,
   over a rotating set of Synora-tinted backgrounds. The style
   is a single ink line, so the set reads as one family.

   Public API
     Synora.avatars.list()              → [{ id, label, src }]
     Synora.avatars.colors()            → [{ id, label, bg, fg }]
     Synora.avatars.has(avatar)         → boolean
     Synora.avatars.html(avatar, size, initials) → HTML string
   ========================================================= */

window.Synora = window.Synora || {};

(function () {
  "use strict";

  /* Pages live at the root (index.html) and one level down (app/*.html),
     so the path to assets/ is not the same from both. Work it out once
     from the URL instead of making every caller pass a prefix. */
  var BASE = (window.location.pathname.indexOf("/app/") !== -1) ? "../" : "./";

  /* ---- The twelve illustrations -----------------------------
     Labels describe the picture, so the radio group reads
     sensibly to a screen reader instead of "Avatar 7".        */

  var ILLUSTRATIONS = [
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
    { id: "avatar-12", label: "Illustrated avatar: cropped curly hair" }
  ];

  function srcFor(id) { return BASE + "assets/avatars/" + id + ".svg"; }

  var ILL_BY_ID = {};
  ILLUSTRATIONS.forEach(function (a) { ILL_BY_ID[a.id] = a; });

  /* ---- The six initials colours ------------------------------
     Derived from the Synora palette — sage, taupe, ink, slate
     plus a cooler and a warmer neighbour — rather than six
     versions of the brand green, which would not be a choice.
     Each pairs a background with a foreground that clears
     WCAG AA for large text against it.                        */

  var COLORS = [
    { id: "sage",   label: "Sage",   bg: "#53655C", fg: "#FFFFFF" },
    { id: "ink",    label: "Ink",    bg: "#22252B", fg: "#FFFFFF" },
    { id: "taupe",  label: "Taupe",  bg: "#B09F95", fg: "#22252B" },
    { id: "slate",  label: "Slate",  bg: "#6B7F86", fg: "#FFFFFF" },
    { id: "clay",   label: "Clay",   bg: "#C0574E", fg: "#FFFFFF" },
    { id: "mist",   label: "Mist",   bg: "#E5E8EB", fg: "#22252B" }
  ];

  var COLOR_BY_ID = {};
  COLORS.forEach(function (c) { COLOR_BY_ID[c.id] = c; });

  /* ---- Rendering ---------------------------------------------
     One function builds the face wherever it appears, so the
     sidebar, topbar, dashboard, settings and onboarding can
     never disagree about what someone looks like.             */

  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* An illustration, as an <img>. Kept as a file reference rather
     than inlined markup so the browser caches it once and reuses it
     across every page.

     Deliberately NOT loading="lazy". These are 28-96px and always
     above the fold — the sidebar, the topbar, the dashboard greeting.
     Deferring them delays the most identity-carrying thing on screen,
     and in any context where the page is rendered off-screen a lazy
     image is never considered visible, so it never loads at all. */
  function illustrationHTML(id, size, label) {
    var px = size || 80;
    return '<img class="avatar-art" src="' + srcFor(id) + '" width="' + px +
           '" height="' + px + '" alt="' + escapeHTML(label || "") + '" ' +
           'decoding="async">';
  }

  /* Initials on a colour. Drawn as SVG rather than a styled <span> so it
     scales exactly like the illustrations do and can sit in the same grid
     cell without a second set of size rules. */
  function initialsHTML(colorId, size, initials) {
    var c = COLOR_BY_ID[colorId] || COLORS[0];
    var px = size || 80;
    var text = escapeHTML(initials || "S");

    return '<svg class="avatar-art" width="' + px + '" height="' + px + '" ' +
             'viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" ' +
             'role="img" aria-label="' + text + '">' +
             '<rect width="80" height="80" rx="40" fill="' + c.bg + '"/>' +
             '<text x="40" y="40" fill="' + c.fg + '" ' +
               'font-family="Manrope, Inter, system-ui, sans-serif" ' +
               'font-size="30" font-weight="700" letter-spacing="0.5" ' +
               'text-anchor="middle" dominant-baseline="central">' + text + "</text>" +
           "</svg>";
  }

  /* Is this stored value something we can still draw? */
  function has(avatar) {
    if (!avatar || !avatar.type) return false;
    if (avatar.type === "illustration") return !!ILL_BY_ID[avatar.id];
    if (avatar.type === "initials") return !!COLOR_BY_ID[avatar.id];
    return false;
  }

  /* The one entry point. Given whatever is stored on the profile,
     return the markup for it — falling back to initials on the
     default colour when nothing valid is chosen. */
  function html(avatar, size, initials) {
    if (avatar && avatar.type === "illustration" && ILL_BY_ID[avatar.id]) {
      return illustrationHTML(avatar.id, size, ILL_BY_ID[avatar.id].label);
    }
    if (avatar && avatar.type === "initials" && COLOR_BY_ID[avatar.id]) {
      return initialsHTML(avatar.id, size, initials);
    }
    return initialsHTML(COLORS[0].id, size, initials);
  }

  Synora.avatars = {
    list: function () {
      return ILLUSTRATIONS.map(function (a) {
        return { id: a.id, label: a.label, src: srcFor(a.id) };
      });
    },
    colors: function () {
      return COLORS.map(function (c) {
        return { id: c.id, label: c.label, bg: c.bg, fg: c.fg };
      });
    },
    has: has,
    html: html,
    illustrationHTML: illustrationHTML,
    initialsHTML: initialsHTML,

    /* Licence, kept next to the thing it applies to so the README and
       the notes page can quote it rather than restate it. */
    licence: {
      style: "Lorelei",
      author: "Lisa Wischofsky",
      licence: "CC0 1.0",
      source: "https://www.dicebear.com/styles/lorelei/"
    }
  };
})();
