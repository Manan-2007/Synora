/* =========================================================
   Synora — Achievements page
   Renders the badges. The unlock logic and definitions live
   in app.js (Synora.achievements) so they can fire from any
   page as you work; this page just displays progress.

   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  function initPage() {
    var root = document.querySelector("[data-achievements-page]");
    if (!root) return;

    Synora.achievements.evaluate(false);   // catch up silently on load
    var list = Synora.achievements.list();
    var unlocked = list.filter(function (a) { return a.unlocked; }).length;

    var summary =
      '<div class="dash-hero" style="margin-bottom:24px">' +
        '<span class="ach-badge" style="width:52px;height:52px;margin:0">' + Synora.icon("trophy", 24) + "</span>" +
        "<div><div class=\"dash-hero__greet\">" + unlocked + " of " + list.length + " unlocked</div>" +
        '<div class="dash-hero__sub">Small wins, marked. Keep going to unlock the rest.</div></div>' +
        '<div class="dash-hero__streak"><span class="pill">' + Synora.icon("flame", 14) +
          "<strong>" + Synora.streak.current() + "</strong> day streak</span></div>" +
      "</div>";

    var cards = list.map(function (a) {
      var pct = Math.round((a.current / a.goal) * 100);
      var status = a.unlocked
        ? "Unlocked" + (a.unlockedAt ? " · " + Synora.util.formatDate(Synora.util.toISODate(new Date(a.unlockedAt))) : "")
        : a.current + " / " + a.goal;
      return '<div class="ach-card' + (a.unlocked ? "" : " is-locked") + '">' +
        '<span class="ach-badge">' + Synora.icon(a.unlocked ? a.icon : "trophy", 26) + "</span>" +
        '<h3 class="ach-card__title">' + Synora.util.escapeHTML(a.title) + "</h3>" +
        '<p class="ach-card__desc">' + Synora.util.escapeHTML(a.desc) + "</p>" +
        (a.unlocked ? "" :
          '<div class="meter" style="margin-bottom:10px"><span class="meter__fill" style="width:' + pct + '%"></span></div>') +
        '<p class="ach-card__status">' + status + "</p>" +
      "</div>";
    }).join("");

    root.innerHTML = summary + '<div class="ach-grid">' + cards + "</div>";
  }

  document.addEventListener("synora:ready", initPage);
})();
