/* =========================================================
   Synora — Theme toggle
   This is the ONLY JavaScript on the site. Everything else
   (menu, accordion, smooth scrolling) is done in CSS.

   Loaded synchronously in <head> so the theme is applied
   before the first paint — otherwise a dark-mode user sees
   a white flash while the page loads.

   Contract shared with the app:
     storage key   "synora-theme"
     values        "light" | "dark"
     applied as    <html data-theme="...">
   ========================================================= */

(function () {
  "use strict";

  var STORAGE_KEY = "synora-theme";
  var root = document.documentElement;   // the <html> element

  /* ---- 1. Pick the theme -------------------------------
     Priority: the user's saved choice, else what their
     operating system is set to, else light.               */

  var saved = localStorage.getItem(STORAGE_KEY);
  var systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var theme = saved || (systemPrefersDark ? "dark" : "light");

  root.setAttribute("data-theme", theme);

  /* ---- 2. Wire up the toggle buttons -------------------
     There are two on the page (header and footer), so we
     loop over every element carrying data-theme-toggle.
     DOMContentLoaded is needed because this script runs in
     <head>, before the buttons exist.                     */

  document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll("[data-theme-toggle]");

    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";

        root.setAttribute("data-theme", next);   // CSS reacts instantly
        localStorage.setItem(STORAGE_KEY, next); // remember for next visit
      });
    }
  });
})();
