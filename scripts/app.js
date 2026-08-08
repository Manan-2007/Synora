/* =========================================================
   Synora — App shell
   Loaded on every page inside app/. It:
     • guards the app (redirects to login if signed out)
     • builds the sidebar and topbar so there's one source
       of truth for navigation
     • provides shared UI: toasts, modals, confirm dialogs
     • runs the cross-cutting engines: notifications,
       achievements and the completion streak

   Feature pages (tasks.js, notes.js, …) call Synora.refresh()
   after they change data so badges and engines stay in sync.

   Depends on: storage.js  (must load first)
   ========================================================= */

window.Synora = window.Synora || {};

(function () {
  "use strict";

  var store = Synora.store;
  var util = Synora.util;

  /* =======================================================
     Icons — a small inline SVG set so the whole app shares
     one consistent, dependency-free icon style.
     ======================================================= */

  var ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    check: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9.5L21 14.5V5a2 2 0 0 0-2-2Z"/><path d="M15 21v-5a1 1 0 0 1 1-1h5"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12.5" y="8" width="3" height="10" rx="1"/><rect x="18" y="5" width="3" height="13" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3a2 2 0 0 1 0 4h-1M7 5H4a2 2 0 0 0 0 4h1"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    flame: '<path d="M12 2c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
  };

  function icon(name, size) {
    var s = size || 20;
    var body = ICONS[name] || "";
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  }

  /* =======================================================
     Navigation model — one list drives the sidebar and the
     page titles.
     ======================================================= */

  var NAV = [
    { group: "" , items: [
      { id: "dashboard", label: "Dashboard", href: "dashboard.html", icon: "grid" },
      { id: "tasks", label: "Tasks", href: "tasks.html", icon: "check" },
      { id: "calendar", label: "Calendar", href: "calendar.html", icon: "calendar" },
      { id: "timetable", label: "Timetable", href: "timetable.html", icon: "clock" },
      { id: "notes", label: "Quick Notes", href: "notes.html", icon: "note" }
    ]},
    { group: "Academics", items: [
      { id: "cgpa", label: "CGPA", href: "cgpa.html", icon: "chart" },
      { id: "attendance", label: "Attendance", href: "attendance.html", icon: "users" },
      { id: "achievements", label: "Achievements", href: "achievements.html", icon: "trophy" }
    ]},
    { group: "Account", items: [
      { id: "notifications", label: "Notifications", href: "notifications.html", icon: "bell" },
      { id: "settings", label: "Settings", href: "settings.html", icon: "settings" }
    ]}
  ];

  function initials(name) {
    if (!name) return "S";
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* =======================================================
     Auth guard.
     ======================================================= */

  function guard() {
    if (!Synora.session.isAuthed()) {
      window.location.href = "./login.html";
      return false;
    }
    return true;
  }

  /* =======================================================
     Build the sidebar.
     ======================================================= */

  function buildSidebar() {
    var host = document.querySelector("[data-sidebar]");
    if (!host) return;

    var page = document.body.dataset.page;
    var user = Synora.session.user() || {};
    var profile = store.get("profile");
    var name = profile.fullName || user.fullName || user.username || "Student";
    var sub = [profile.program, profile.semester ? "Sem " + profile.semester : ""]
      .filter(Boolean).join(" · ") || "Student";

    var html = "";
    html += '<a class="sidebar__brand" href="dashboard.html">' +
              '<span class="sidebar__brand-dot" aria-hidden="true"></span>Synora</a>';

    html += '<nav class="sidebar__nav" aria-label="Primary">';
    NAV.forEach(function (section) {
      if (section.group) {
        html += '<span class="sidebar__section-label">' + section.group + "</span>";
      }
      section.items.forEach(function (item) {
        var active = item.id === page ? " is-active" : "";
        var badge = "";
        if (item.id === "notifications") {
          badge = '<span class="nav-item__badge" data-nav-notif hidden></span>';
        }
        html += '<a class="nav-item' + active + '" href="' + item.href + '"' +
          (active ? ' aria-current="page"' : "") + ">" +
          icon(item.icon, 18) + "<span>" + item.label + "</span>" + badge + "</a>";
      });
    });
    html += "</nav>";

    html += '<div class="sidebar__footer">' +
              '<div class="sidebar-user">' +
                '<span class="avatar">' + util.escapeHTML(initials(name)) + "</span>" +
                '<span class="sidebar-user__meta">' +
                  '<span class="sidebar-user__name">' + util.escapeHTML(name) + "</span>" +
                  '<span class="sidebar-user__sub">' + util.escapeHTML(sub) + "</span>" +
                "</span>" +
              "</div>" +
            "</div>";

    host.innerHTML = html;
    host.classList.add("sidebar");
  }

  /* =======================================================
     Build the topbar.
     ======================================================= */

  function buildTopbar() {
    var host = document.querySelector("[data-topbar]");
    if (!host) return;

    var page = document.body.dataset.page;
    var title = document.body.dataset.title || titleFor(page) || "Synora";
    var user = Synora.session.user() || {};
    var profile = store.get("profile");
    var name = profile.fullName || user.fullName || user.username || "Student";
    var program = profile.program || "Student";

    var html = "";
    html += '<button type="button" class="icon-btn menu-btn" data-menu-toggle aria-label="Open menu">' + icon("menu", 18) + "</button>";
    html += '<h1 class="topbar__title">' + util.escapeHTML(title) + "</h1>";

    html += '<div class="topbar__actions">';

    // Theme toggle (wired here, not by theme.js, to avoid ordering issues)
    html += '<button type="button" class="icon-btn" data-app-theme-toggle aria-label="Toggle dark mode">' +
              '<span class="only-light">' + icon("moon", 18) + "</span>" +
              '<span class="only-dark">' + icon("sun", 18) + "</span>" +
            "</button>";

    // Notification bell + dropdown
    html += '<div class="bell" data-bell-wrap>' +
              '<button type="button" class="icon-btn" data-bell aria-label="Notifications" aria-haspopup="true">' +
                icon("bell", 18) +
                '<span class="bell__badge" data-bell-badge></span>' +
              "</button>" +
              '<div class="menu-pop" data-bell-pop role="menu">' +
                '<div class="menu-pop__head"><strong>Notifications</strong>' +
                  '<button type="button" data-notif-readall>Mark all read</button></div>' +
                '<div class="menu-pop__list" data-notif-list></div>' +
                '<a class="menu-link" href="notifications.html" style="justify-content:center;font-weight:600;color:var(--color-brand)">See all</a>' +
              "</div>" +
            "</div>";

    // Profile chip + dropdown
    html += '<div class="bell" data-profile-wrap>' +
              '<button type="button" class="profile-chip" data-profile aria-haspopup="true">' +
                '<span class="avatar" style="width:30px;height:30px;font-size:.75rem">' + util.escapeHTML(initials(name)) + "</span>" +
                '<span class="profile-chip__name">' + util.escapeHTML(name) + "</span>" +
              "</button>" +
              '<div class="menu-pop" data-profile-pop role="menu" style="width:240px">' +
                '<div class="menu-pop__head" style="gap:10px">' +
                  '<span class="avatar">' + util.escapeHTML(initials(name)) + "</span>" +
                  '<span style="min-width:0"><strong style="display:block">' + util.escapeHTML(name) + "</strong>" +
                  '<span class="text-small muted">' + util.escapeHTML(program) + "</span></span>" +
                "</div>" +
                '<a class="menu-link" href="settings.html">' + icon("settings", 16) + "Settings</a>" +
                '<a class="menu-link" href="../index.html">' + icon("grid", 16) + "Landing page</a>" +
                '<button type="button" class="menu-link menu-link--danger" data-signout>' + icon("logout", 16) + "Sign out</button>" +
              "</div>" +
            "</div>";

    html += "</div>";
    host.innerHTML = html;
    host.classList.add("topbar");
  }

  function titleFor(page) {
    var found = null;
    NAV.forEach(function (s) { s.items.forEach(function (i) { if (i.id === page) found = i.label; }); });
    return found;
  }

  /* =======================================================
     Wire shell interactions.
     ======================================================= */

  function wireShell() {
    var body = document.body;

    // Mobile drawer
    var backdrop = document.createElement("div");
    backdrop.className = "drawer-backdrop";
    body.appendChild(backdrop);

    function closeDrawer() { body.classList.remove("nav-open"); }
    var menuBtn = document.querySelector("[data-menu-toggle]");
    if (menuBtn) menuBtn.addEventListener("click", function () { body.classList.toggle("nav-open"); });
    backdrop.addEventListener("click", closeDrawer);

    // Theme toggle
    var themeBtn = document.querySelector("[data-app-theme-toggle]");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var root = document.documentElement;
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        localStorage.setItem(Synora.keys.theme, next);
      });
    }

    // Dropdowns (bell + profile) — only one open at a time
    var pops = [
      { btn: "[data-bell]", pop: "[data-bell-pop]" },
      { btn: "[data-profile]", pop: "[data-profile-pop]" }
    ].map(function (cfg) {
      return { btn: document.querySelector(cfg.btn), pop: document.querySelector(cfg.pop) };
    });

    function closeAllPops(except) {
      pops.forEach(function (p) { if (p.pop && p.pop !== except) p.pop.classList.remove("is-open"); });
    }

    pops.forEach(function (p) {
      if (!p.btn || !p.pop) return;
      p.btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = p.pop.classList.contains("is-open");
        closeAllPops();
        if (!isOpen) {
          p.pop.classList.add("is-open");
          if (p.pop.matches("[data-bell-pop]")) Synora.notifications.markAllSeen();
          renderBellBadge();
        }
      });
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest("[data-bell-wrap]") && !e.target.closest("[data-profile-wrap]")) {
        closeAllPops();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeAllPops(); closeDrawer(); }
    });

    // Sign out
    var signout = document.querySelector("[data-signout]");
    if (signout) signout.addEventListener("click", function () {
      Synora.session.signOut();
      window.location.href = "../index.html";
    });

    // Mark all notifications read (from bell dropdown)
    var readAll = document.querySelector("[data-notif-readall]");
    if (readAll) readAll.addEventListener("click", function () {
      Synora.notifications.markAllRead();
      Synora.refresh();
    });
  }

  /* =======================================================
     Toasts.
     ======================================================= */

  function toastRegion() {
    var region = document.querySelector(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    return region;
  }

  function toast(title, opts) {
    opts = opts || {};
    var type = opts.type || "info";
    var iconName = type === "success" ? "checkCircle" : type === "error" ? "alert" : "info";
    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.setAttribute("role", "status");
    el.innerHTML =
      '<span class="toast__icon">' + icon(iconName, 18) + "</span>" +
      '<span class="toast__body"><strong>' + util.escapeHTML(title) + "</strong>" +
      (opts.message ? "<span>" + util.escapeHTML(opts.message) + "</span>" : "") + "</span>";
    toastRegion().appendChild(el);
    var life = opts.duration || 3600;
    window.setTimeout(function () {
      el.classList.add("is-leaving");
      el.addEventListener("animationend", function () { el.remove(); });
    }, life);
  }
  toast.success = function (t, m) { toast(t, { type: "success", message: m }); };
  toast.error = function (t, m) { toast(t, { type: "error", message: m }); };
  toast.info = function (t, m) { toast(t, { type: "info", message: m }); };

  /* =======================================================
     Modals.
     ======================================================= */

  function openModal(config) {
    // config: { title, content(HTMLElement|string), size, footer:[{label,variant,onClick,close}], onClose }
    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    var modal = document.createElement("div");
    modal.className = "modal" + (config.size === "sm" ? " modal--sm" : "");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    var header = document.createElement("div");
    header.className = "modal__header";
    header.innerHTML = '<h2 class="modal__title">' + util.escapeHTML(config.title || "") + "</h2>" +
      '<button type="button" class="icon-btn" data-modal-close aria-label="Close">' + icon("x", 18) + "</button>";

    var bodyEl = document.createElement("div");
    bodyEl.className = "modal__body";
    if (typeof config.content === "string") bodyEl.innerHTML = config.content;
    else if (config.content) bodyEl.appendChild(config.content);

    modal.appendChild(header);
    modal.appendChild(bodyEl);

    var footEl = null;
    if (config.footer && config.footer.length) {
      footEl = document.createElement("div");
      footEl.className = "modal__footer";
      modal.appendChild(footEl);
    }

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";

    function close() {
      backdrop.classList.remove("is-open");
      document.body.style.overflow = "";
      window.setTimeout(function () { backdrop.remove(); }, 220);
      document.removeEventListener("keydown", onKey);
      if (typeof config.onClose === "function") config.onClose();
    }

    function onKey(e) { if (e.key === "Escape") close(); }

    var api = { el: modal, body: bodyEl, close: close };

    if (footEl) {
      config.footer.forEach(function (btn) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn " + (btn.variant ? "btn--" + btn.variant : "btn--ghost");
        b.textContent = btn.label;
        b.addEventListener("click", function () {
          var keepOpen = btn.onClick ? btn.onClick(api) : undefined;
          if (btn.close !== false && keepOpen !== true) close();
        });
        footEl.appendChild(b);
      });
    }

    header.querySelector("[data-modal-close]").addEventListener("click", close);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", onKey);

    // Fade/scale in
    requestAnimationFrame(function () { backdrop.classList.add("is-open"); });

    // Focus first field
    var firstInput = bodyEl.querySelector("input, select, textarea, button");
    if (firstInput) window.setTimeout(function () { firstInput.focus(); }, 60);

    return api;
  }

  function confirmDialog(config) {
    return new Promise(function (resolve) {
      openModal({
        title: config.title || "Are you sure?",
        size: "sm",
        content: '<p class="muted">' + util.escapeHTML(config.message || "") + "</p>",
        footer: [
          { label: config.cancelLabel || "Cancel", variant: "ghost", onClick: function () { resolve(false); } },
          { label: config.confirmLabel || "Confirm", variant: config.danger ? "danger" : "primary",
            onClick: function () { resolve(true); } }
        ],
        onClose: function () { resolve(false); }
      });
    });
  }

  /* =======================================================
     Streak — consecutive days with at least one completion.
     ======================================================= */

  var streak = {
    recordCompletion: function () {
      store.update("meta", function (m) {
        var today = util.todayISO();
        if (m.lastCompletionDate === today) return m;   // already counted today
        var yesterday = util.toISODate(new Date(Date.now() - 86400000));
        if (m.lastCompletionDate === yesterday) m.streak = (m.streak || 0) + 1;
        else m.streak = 1;
        m.lastCompletionDate = today;
        return m;
      });
    },
    current: function () {
      var m = store.get("meta");
      // A streak is only "live" if it includes today or yesterday.
      if (!m.lastCompletionDate) return 0;
      var days = Math.abs(util.daysUntil(m.lastCompletionDate));
      return days <= 1 ? (m.streak || 0) : 0;
    }
  };

  /* =======================================================
     Notifications engine.
     ======================================================= */

  var notifications = {
    all: function () {
      return store.get("notifications").slice().sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    },

    add: function (n) {
      // Dedupe by stable key when provided.
      var list = store.get("notifications");
      if (n.key && list.some(function (x) { return x.key === n.key; })) return null;
      var record = {
        id: util.uid("ntf"),
        key: n.key || null,
        type: n.type || "info",
        title: n.title,
        body: n.body || "",
        createdAt: new Date().toISOString(),
        read: false,
        seen: false
      };
      list.push(record);
      store.set("notifications", list);
      return record;
    },

    markAllRead: function () {
      store.update("notifications", function (list) {
        list.forEach(function (n) { n.read = true; n.seen = true; });
        return list;
      });
    },

    markRead: function (id) {
      store.update("notifications", function (list) {
        list.forEach(function (n) { if (n.id === id) { n.read = true; n.seen = true; } });
        return list;
      });
    },

    // "seen" = the bell was opened; clears the red count without
    // marking each item as read (they stay bold in the list).
    markAllSeen: function () {
      store.update("notifications", function (list) {
        list.forEach(function (n) { n.seen = true; });
        return list;
      });
    },

    clearAll: function () { store.set("notifications", []); },

    remove: function (id) {
      store.update("notifications", function (list) {
        return list.filter(function (n) { return n.id !== id; });
      });
    },

    unreadCount: function () {
      return store.get("notifications").filter(function (n) { return !n.read; }).length;
    },

    unseenCount: function () {
      return store.get("notifications").filter(function (n) { return !n.seen; }).length;
    },

    // Scan data and create any new deadline / overdue / attendance alerts.
    refresh: function () {
      var tasks = store.get("tasks");
      tasks.forEach(function (t) {
        if (t.status === "completed" || !t.deadline) return;
        var days = util.daysUntil(t.deadline);
        if (days === null) return;
        if (days < 0) {
          notifications.add({
            key: "overdue:" + t.id + ":" + t.deadline,
            type: "danger",
            title: "Overdue task",
            body: '"' + t.title + '" was due ' + util.relativeDay(t.deadline).toLowerCase() + "."
          });
        } else if (days === 0) {
          notifications.add({
            key: "due:" + t.id + ":" + t.deadline,
            type: "warning",
            title: "Due today",
            body: '"' + t.title + '" is due today.'
          });
        } else if (days === 1) {
          notifications.add({
            key: "due:" + t.id + ":" + t.deadline,
            type: "warning",
            title: "Due tomorrow",
            body: '"' + t.title + '" is due tomorrow.'
          });
        }
      });

      // Attendance below target
      var profile = store.get("profile");
      var target = Number(profile.targetAttendance) || 75;
      store.get("attendance").forEach(function (a) {
        if (!a.total) return;
        var pct = (a.attended / a.total) * 100;
        if (pct < target) {
          notifications.add({
            key: "attn:" + a.id + ":below",
            type: "warning",
            title: "Attendance warning",
            body: a.subject + " is at " + pct.toFixed(0) + "% (target " + target + "%)."
          });
        }
      });
    }
  };

  /* =======================================================
     Achievements engine.
     ======================================================= */

  var ACHIEVEMENTS = [
    { id: "first-step", title: "First Step", desc: "Complete your first task.", icon: "check", goal: 1,
      measure: function (c) { return c.completed; } },
    { id: "getting-started", title: "Getting Started", desc: "Complete 5 tasks.", icon: "checkCircle", goal: 5,
      measure: function (c) { return c.completed; } },
    { id: "productive", title: "Productive", desc: "Complete 10 tasks.", icon: "trophy", goal: 10,
      measure: function (c) { return c.completed; } },
    { id: "consistent", title: "Consistent", desc: "Reach a 3-day completion streak.", icon: "flame", goal: 3,
      measure: function (c) { return c.streak; } },
    { id: "deadline-master", title: "Deadline Master", desc: "Finish 3 tasks before their deadline.", icon: "clock", goal: 3,
      measure: function (c) { return c.beforeDeadline; } },
    { id: "academic-planner", title: "Academic Planner", desc: "Add your class timetable.", icon: "calendar", goal: 1,
      measure: function (c) { return c.timetable; } },
    { id: "organized", title: "Organized", desc: "Write 5 quick notes.", icon: "note", goal: 5,
      measure: function (c) { return c.notes; } }
  ];

  function achievementContext() {
    var tasks = store.get("tasks");
    var completed = tasks.filter(function (t) { return t.status === "completed"; });
    var beforeDeadline = completed.filter(function (t) {
      return t.deadline && t.completedAt &&
        util.toISODate(new Date(t.completedAt)) <= t.deadline;
    }).length;
    return {
      completed: completed.length,
      beforeDeadline: beforeDeadline,
      notes: store.get("notes").length,
      timetable: store.get("timetable").length,
      streak: streak.current()
    };
  }

  var achievements = {
    list: function () {
      var ctx = achievementContext();
      var unlocked = store.get("achievements").unlocked || {};
      return ACHIEVEMENTS.map(function (a) {
        var current = Math.min(a.measure(ctx), a.goal);
        return {
          id: a.id, title: a.title, desc: a.desc, icon: a.icon,
          goal: a.goal, current: current,
          unlocked: !!unlocked[a.id],
          unlockedAt: unlocked[a.id] || null
        };
      });
    },

    // Unlock any newly-earned achievements; toast + notify for each.
    evaluate: function (announce) {
      var ctx = achievementContext();
      var data = store.get("achievements");
      data.unlocked = data.unlocked || {};
      var newly = [];
      ACHIEVEMENTS.forEach(function (a) {
        if (!data.unlocked[a.id] && a.measure(ctx) >= a.goal) {
          data.unlocked[a.id] = new Date().toISOString();
          newly.push(a);
        }
      });
      if (newly.length) {
        store.set("achievements", data);
        newly.forEach(function (a) {
          notifications.add({ type: "success", title: "Achievement unlocked", body: a.title });
          if (announce !== false) toast.success("Achievement unlocked 🏆", a.title);
        });
      }
      return newly;
    }
  };

  /* =======================================================
     Shared derived data (used by the dashboard & others).
     ======================================================= */

  /* Grade scales — shared by the CGPA page and the dashboard. */
  var GRADE_SCALES = {
    "10": {
      label: "10-point (Indian)",
      max: 10,
      points: { "A+": 10, "A": 9, "B+": 8, "B": 7, "C+": 6, "C": 5, "D": 4, "F": 0 }
    },
    "4": {
      label: "4.0 GPA (US)",
      max: 4,
      points: { "A": 4, "A-": 3.7, "B+": 3.3, "B": 3, "B-": 2.7, "C+": 2.3, "C": 2, "C-": 1.7, "D": 1, "F": 0 }
    }
  };

  var derive = {
    taskStats: function () {
      var tasks = store.get("tasks");
      var stats = { total: tasks.length, completed: 0, pending: 0, overdue: 0, dueToday: 0, upcoming: 0 };
      tasks.forEach(function (t) {
        if (t.status === "completed") { stats.completed++; return; }
        stats.pending++;
        var days = t.deadline ? util.daysUntil(t.deadline) : null;
        if (days === null) return;
        if (days < 0) stats.overdue++;
        else if (days === 0) stats.dueToday++;
        else stats.upcoming++;
      });
      return stats;
    },

    upcomingDeadlines: function (limit) {
      return store.get("tasks")
        .filter(function (t) { return t.status !== "completed" && t.deadline; })
        .sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; })
        .slice(0, limit || 5);
    },

    todaysClasses: function () {
      var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      var today = dayNames[new Date().getDay()];
      return store.get("timetable")
        .filter(function (c) { return c.day === today; })
        .sort(function (a, b) { return (a.start || "") < (b.start || "") ? -1 : 1; });
    },

    // Weighted CGPA from the stored subjects, or null if none valid.
    cgpa: function () {
      var data = store.get("cgpa");
      var scale = GRADE_SCALES[data.scaleId] || GRADE_SCALES["10"];
      var totalCredits = 0, weighted = 0, counted = 0;
      (data.subjects || []).forEach(function (s) {
        var credits = Number(s.credits);
        var point = scale.points[s.grade];
        if (credits > 0 && point !== undefined) {
          totalCredits += credits;
          weighted += credits * point;
          counted++;
        }
      });
      if (!totalCredits) return null;
      return { value: weighted / totalCredits, totalCredits: totalCredits, count: counted, max: scale.max };
    },

    // Overall attendance across all subjects, plus each subject's %.
    attendance: function () {
      var list = store.get("attendance");
      var target = Number(store.get("profile").targetAttendance) || 75;
      var totalHeld = 0, totalAttended = 0;
      var subjects = list.map(function (a) {
        totalHeld += Number(a.total) || 0;
        totalAttended += Number(a.attended) || 0;
        return { subject: a.subject, pct: a.total ? (a.attended / a.total) * 100 : 0 };
      });
      return {
        overall: totalHeld ? (totalAttended / totalHeld) * 100 : null,
        target: target,
        subjects: subjects
      };
    }
  };

  /* =======================================================
     Badge rendering (bell + sidebar).
     ======================================================= */

  function renderBellBadge() {
    var count = notifications.unseenCount();
    document.querySelectorAll("[data-bell-badge]").forEach(function (b) {
      if (count > 0) { b.textContent = count > 9 ? "9+" : count; b.classList.add("is-shown"); }
      else b.classList.remove("is-shown");
    });
    var navBadge = document.querySelector("[data-nav-notif]");
    if (navBadge) {
      var unread = notifications.unreadCount();
      if (unread > 0) { navBadge.textContent = unread > 9 ? "9+" : unread; navBadge.hidden = false; }
      else navBadge.hidden = true;
    }
  }

  function renderBellList() {
    var host = document.querySelector("[data-notif-list]");
    if (!host) return;
    var list = notifications.all().slice(0, 6);
    if (!list.length) {
      host.innerHTML = '<p class="muted text-small" style="padding:24px;text-align:center">You\'re all caught up.</p>';
      return;
    }
    host.innerHTML = list.map(function (n) {
      var tint = n.type === "danger" ? "tint-danger" : n.type === "warning" ? "tint-warning" :
                 n.type === "success" ? "tint-success" : "tint-brand";
      var ic = n.type === "danger" ? "alert" : n.type === "success" ? "trophy" :
               n.type === "warning" ? "clock" : "info";
      return '<div class="notif-item' + (n.read ? "" : " is-unread") + '">' +
               '<span class="notif-item__icon ' + tint + '">' + icon(ic, 16) + "</span>" +
               '<span style="min-width:0"><span class="notif-item__title">' + util.escapeHTML(n.title) + "</span>" +
               '<span class="notif-item__body">' + util.escapeHTML(n.body) + "</span></span>" +
             "</div>";
    }).join("");
  }

  /* =======================================================
     Sample data for brand-new accounts (real, editable data —
     not fake UI). Called once from auth.js on sign-up.
     ======================================================= */

  Synora.seedSampleData = function () {
    var meta = store.get("meta");
    if (meta.seeded) return;

    var d = function (offset) { return util.toISODate(new Date(Date.now() + offset * 86400000)); };

    store.set("tasks", [
      { id: util.uid("tsk"), title: "Finish DBMS assignment 4", subject: "DBMS", description: "Normalization exercises, Q1–Q6.", deadline: d(1), priority: "high", status: "in-progress", createdAt: new Date().toISOString(), completedAt: null },
      { id: util.uid("tsk"), title: "Read Chapter 7 — Computer Networks", subject: "Networks", description: "", deadline: d(3), priority: "medium", status: "not-started", createdAt: new Date().toISOString(), completedAt: null },
      { id: util.uid("tsk"), title: "Prepare for OS quiz", subject: "Operating Systems", description: "Scheduling + deadlocks.", deadline: d(5), priority: "critical", status: "not-started", createdAt: new Date().toISOString(), completedAt: null },
      { id: util.uid("tsk"), title: "Submit lab record", subject: "DBMS", description: "", deadline: d(-1), priority: "low", status: "completed", createdAt: new Date().toISOString(), completedAt: new Date().toISOString() }
    ]);

    store.set("notes", [
      { id: util.uid("nte"), title: "Networks — key terms", body: "OSI vs TCP/IP layers. Remember: encapsulation adds headers at each layer.", category: "Networks", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: util.uid("nte"), title: "Weekend plan", body: "Sat: revise OS.\nSun: DBMS practice problems.", category: "Personal", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]);

    store.set("timetable", [
      { id: util.uid("cls"), day: "Monday", start: "09:00", end: "10:00", subject: "Computer Networks", room: "LT-3", teacher: "Dr. Rao", note: "" },
      { id: util.uid("cls"), day: "Monday", start: "11:30", end: "13:00", subject: "DBMS Lab", room: "Block C", teacher: "Prof. Iyer", note: "" },
      { id: util.uid("cls"), day: "Wednesday", start: "10:00", end: "11:00", subject: "Operating Systems", room: "LT-1", teacher: "Dr. Menon", note: "" },
      { id: util.uid("cls"), day: "Friday", start: "14:00", end: "15:30", subject: "Networks Lab", room: "Block C", teacher: "Dr. Rao", note: "" }
    ]);

    store.set("attendance", [
      { id: util.uid("att"), subject: "Computer Networks", total: 40, attended: 34, target: 75 },
      { id: util.uid("att"), subject: "DBMS", total: 38, attended: 26, target: 75 },
      { id: util.uid("att"), subject: "Operating Systems", total: 42, attended: 39, target: 75 }
    ]);

    store.set("cgpa", { scaleId: "10", subjects: [
      { id: util.uid("sub"), name: "DBMS", credits: 4, grade: "A" },
      { id: util.uid("sub"), name: "Computer Networks", credits: 3, grade: "A+" },
      { id: util.uid("sub"), name: "Operating Systems", credits: 4, grade: "B+" }
    ]});

    store.update("meta", function (m) { m.seeded = true; return m; });
  };

  /* =======================================================
     Public refresh — call after any data change.
     ======================================================= */

  Synora.refresh = function () {
    notifications.refresh();
    achievements.evaluate();
    renderBellBadge();
    renderBellList();
  };

  /* =======================================================
     Expose the API + boot.
     ======================================================= */

  Synora.icon = icon;
  Synora.GRADE_SCALES = GRADE_SCALES;
  Synora.toast = toast;
  Synora.openModal = openModal;
  Synora.confirm = confirmDialog;
  Synora.notifications = notifications;
  Synora.achievements = achievements;
  Synora.streak = streak;
  Synora.derive = derive;
  Synora.renderBellBadge = renderBellBadge;

  function boot() {
    if (!guard()) return;
    // First app entry for a new account: add starter data once.
    // (auth.js can't do this — app.js isn't loaded on the auth pages.)
    if (!store.get("meta").seeded) Synora.seedSampleData();
    buildSidebar();
    buildTopbar();
    wireShell();
    Synora.refresh();
    // Signal to page scripts that the shell is ready.
    document.dispatchEvent(new CustomEvent("synora:ready"));
  }

  /* Boot on DOMContentLoaded — NOT immediately. Deferred scripts run
     with readyState === "interactive", and the feature scripts
     (tasks.js, dashboard.js, …) load AFTER this one. Waiting for
     DOMContentLoaded guarantees their "synora:ready" listeners are
     registered before we dispatch the event. */
  if (document.readyState === "complete") {
    window.setTimeout(boot, 0);
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
