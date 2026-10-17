/* Apply the saved theme before the first paint, so a dark-mode user never
   sees a white flash while the app loads (see src/lib/theme.js). A plain,
   blocking script in <head>: kept out of index.html so the Content Security
   Policy (vercel.json) can allow scripts from this site only. */
(function () {
  var saved = null;
  try { saved = localStorage.getItem("synora-theme"); } catch (e) { /* storage blocked */ }
  var systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", saved || (systemPrefersDark ? "dark" : "light"));
})();
