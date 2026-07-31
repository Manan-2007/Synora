/* =========================================================
   Synora — Theme
   Loaded synchronously in <head> so the correct theme is
   applied before first paint (no flash of the wrong theme).

   Contract shared with the app:
     storage key   "synora-theme"
     values        "light" | "dark"
     applied as    <html data-theme="...">
   ========================================================= */

(function () {
  "use strict";

  var STORAGE_KEY = "synora-theme";
  var root = document.documentElement;

  root.classList.remove("no-js");

  /* localStorage can throw in private mode or with cookies blocked. */
  function readStored() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (err) {
      return null;
    }
  }

  function writeStored(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      /* Preference just won't persist — not worth surfacing. */
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
  }

  /* --- First paint --------------------------------------- */
  var stored = readStored();
  apply(stored || systemTheme());

  /* --- Wiring (needs the DOM) ---------------------------- */
  function labelFor(theme) {
    return theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  }

  function syncToggles() {
    var theme = root.getAttribute("data-theme");
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].setAttribute("aria-label", labelFor(theme));
      toggles[i].setAttribute("aria-pressed", String(theme === "dark"));
    }
  }

  function setTheme(theme) {
    apply(theme);
    writeStored(theme);
    syncToggles();
  }

  function init() {
    syncToggles();

    document.addEventListener("click", function (event) {
      var toggle = event.target.closest("[data-theme-toggle]");
      if (!toggle) return;
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });

    /* Follow the system while the user hasn't picked a side. */
    if (window.matchMedia) {
      var query = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function (event) {
        if (readStored()) return;
        apply(event.matches ? "dark" : "light");
        syncToggles();
      };
      if (query.addEventListener) {
        query.addEventListener("change", onChange);
      } else if (query.addListener) {
        query.addListener(onChange);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
