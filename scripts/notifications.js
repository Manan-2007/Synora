/* =========================================================
   Synora — Notifications page
   The full notification centre. The engine (generation,
   dedupe, read/unread) lives in app.js (Synora.notifications);
   this page lists them and offers mark-read / clear.

   Depends on: storage.js, app.js
   ========================================================= */

(function () {
  "use strict";

  var util = Synora.util;

  function initPage() {
    var root = document.querySelector("[data-notifications-page]");
    if (!root) return;

    function timeAgo(iso) {
      var mins = Math.round((Date.now() - new Date(iso)) / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return mins + "m ago";
      var hrs = Math.round(mins / 60);
      if (hrs < 24) return hrs + "h ago";
      return util.formatDate(util.toISODate(new Date(iso)));
    }

    function render() {
      var items = Synora.notifications.all();
      var unread = Synora.notifications.unreadCount();

      var head =
        '<div class="toolbar" style="justify-content:space-between">' +
          '<span class="text-small muted">' + (unread ? unread + " unread" : "All caught up") + "</span>" +
          '<div class="row" style="gap:8px">' +
            '<button type="button" class="btn btn--ghost btn--sm" data-readall>Mark all read</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-clear>Clear all</button>' +
          "</div>" +
        "</div>";

      if (!items.length) {
        root.innerHTML = head + '<div class="card"><div class="empty">' +
          '<span class="empty__icon">' + Synora.icon("bell", 26) + "</span>" +
          '<p class="empty__title">No notifications</p>' +
          '<p class="empty__text">Deadline reminders, attendance warnings and unlocked achievements will show up here.</p>' +
          "</div></div>";
        wire();
        return;
      }

      var rows = items.map(function (n) {
        var tint = n.type === "danger" ? "tint-danger" : n.type === "warning" ? "tint-warning" :
                   n.type === "success" ? "tint-success" : "tint-brand";
        var ic = n.type === "danger" ? "alert" : n.type === "success" ? "trophy" :
                 n.type === "warning" ? "clock" : "info";
        return '<div class="notif-item' + (n.read ? "" : " is-unread") + '" data-id="' + n.id + '">' +
          '<span class="notif-item__icon ' + tint + '">' + Synora.icon(ic, 16) + "</span>" +
          '<span style="min-width:0;flex:1"><span class="notif-item__title">' + util.escapeHTML(n.title) + "</span>" +
          '<span class="notif-item__body">' + util.escapeHTML(n.body) + "</span>" +
          '<span class="notif-item__time">' + timeAgo(n.createdAt) + "</span></span>" +
          '<span class="row" style="gap:2px">' +
            (n.read ? "" : '<button type="button" class="icon-btn" data-read="' + n.id + '" aria-label="Mark read">' + Synora.icon("check", 15) + "</button>") +
            '<button type="button" class="icon-btn" data-remove="' + n.id + '" aria-label="Delete">' + Synora.icon("trash", 15) + "</button>" +
          "</span>" +
        "</div>";
      }).join("");

      root.innerHTML = head + '<div class="card">' + rows + "</div>";
      wire();
    }

    function wire() {
      var readall = root.querySelector("[data-readall]");
      if (readall) readall.addEventListener("click", function () {
        Synora.notifications.markAllRead(); Synora.renderBellBadge(); render();
      });
      var clear = root.querySelector("[data-clear]");
      if (clear) clear.addEventListener("click", function () {
        Synora.confirm({ title: "Clear all notifications?", message: "This removes every notification.", confirmLabel: "Clear", danger: true })
          .then(function (ok) { if (ok) { Synora.notifications.clearAll(); Synora.renderBellBadge(); render(); } });
      });
      root.querySelectorAll("[data-read]").forEach(function (b) {
        b.addEventListener("click", function () { Synora.notifications.markRead(b.getAttribute("data-read")); Synora.renderBellBadge(); render(); });
      });
      root.querySelectorAll("[data-remove]").forEach(function (b) {
        b.addEventListener("click", function () { Synora.notifications.remove(b.getAttribute("data-remove")); Synora.renderBellBadge(); render(); });
      });
    }

    render();
  }

  document.addEventListener("synora:ready", initPage);
})();
