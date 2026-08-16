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

  /* =======================================================
     The user's face, wherever it appears.

     One function builds it, so the sidebar, topbar, dashboard
     and settings can never disagree. If an avatar was chosen it
     is shown; otherwise the fallback is the person's initials,
     taken from their FIRST and LAST name — "Manan Kochhar" is
     MK, never MA.
     ======================================================= */

  function avatarHTML(size, className) {
    var profile = Synora.profile.get();
    var px = size || 36;
    var cls = "avatar" + (className ? " " + className : "");

    /* avatars.js decides between an illustration and initials and
       falls back on its own, so there is no branch to get wrong here. */
    return '<span class="' + cls + ' avatar--art" style="width:' + px + "px;height:" + px + 'px">' +
             Synora.avatars.html(profile.avatar, px, profile.initials) +
           "</span>";
  }

  /* =======================================================
     Auth guard.

     ONE gate: are you signed in? If not, the sign-in page.

     There used to be a second gate that bounced anyone who
     hadn't finished Personalize Synora back into it. That made
     the two choices on the confirmation screen a lie — "Go to
     dashboard" sent you to the dashboard, which immediately
     sent you to onboarding — and it did the same to "Skip for
     now". Setting up a workspace is an offer, not a toll gate.

     An unfinished setup is surfaced instead of enforced: the
     dashboard shows a card offering to finish it, and Settings
     keeps the same route open indefinitely.
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
    var profile = Synora.profile.get();
    var name = profile.fullName || profile.username;

    /* The old sidebar said "Student" under every name, which told the
       person nothing they didn't already know. Their handle does. */
    var sub = profile.username ? "@" + profile.username : profile.program;

    var html = "";
    html += '<a class="sidebar__brand logo logo--lockup" href="dashboard.html" aria-label="Synora — dashboard">' +
              '<img class="logo__light" src="../assets/logo-lockup-light.png" alt="Synora" width="1040" height="267">' +
              '<img class="logo__dark" src="../assets/logo-lockup-dark.png" alt="" aria-hidden="true" width="1040" height="267">' +
            "</a>";

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
              '<a class="sidebar-user" href="settings.html">' +
                avatarHTML(38) +
                '<span class="sidebar-user__meta">' +
                  '<span class="sidebar-user__name">' + util.escapeHTML(name) + "</span>" +
                  '<span class="sidebar-user__sub">' + util.escapeHTML(sub) + "</span>" +
                "</span>" +
              "</a>" +
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
    var profile = Synora.profile.get();
    var name = profile.fullName || profile.username;
    /* Program and semester are TWO lines, not one joined string.

       Joined with " · " they were a single run of text in a 250px
       dropdown, so the browser wrapped wherever it ran out of room —
       which for "B.E CSE AIML · Semester 3" meant orphaning the "3"
       onto its own line. Splitting them means each wraps only at its
       own boundary, and it works for any length of program name.

       Falls back to the handle when neither is set, so a profile that
       skipped onboarding still shows something. */
    var subLines = [];
    if (profile.program) subLines.push(profile.program);
    if (profile.semester) subLines.push("Semester " + profile.semester);
    if (!subLines.length) subLines.push("@" + profile.username);

    var subHTML = subLines.map(function (line) {
      return '<span class="profile-pop__line">' + util.escapeHTML(line) + "</span>";
    }).join("");

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
                avatarHTML(30) +
                '<span class="profile-chip__name">' + util.escapeHTML(name) + "</span>" +
              "</button>" +
              '<div class="menu-pop" data-profile-pop role="menu" style="width:250px">' +
                '<div class="menu-pop__head" style="gap:10px">' +
                  avatarHTML(38) +
                  '<span class="profile-pop__who">' +
                    '<strong class="profile-pop__name">' + util.escapeHTML(name) + "</strong>" +
                    '<span class="profile-pop__meta">' + subHTML + "</span>" +
                  "</span>" +
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

    /* Remove every notification matching a key prefix. Used to retire
       alerts whose cause has gone away — see the attendance pass below. */
    dropByPrefix: function (prefix, keepKeys) {
      store.update("notifications", function (list) {
        return list.filter(function (n) {
          if (!n.key || n.key.indexOf(prefix) !== 0) return true;
          return keepKeys.indexOf(n.key) !== -1;
        });
      });
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

      /* ---- Attendance below target -------------------------------
         This used to fire the moment a row existed, which is why
         adding or renaming a subject produced "… is at 0%": a row
         mid-edit has a class count but nothing attended yet, and the
         alert it raised was never taken back once the numbers were
         filled in.

         Two changes fix it at the source rather than hiding it:

         1. A row only counts as real data when it is attached to a
            named subject AND has classes held. A half-typed row is
            not a warning, it is a row being typed.

         2. The alerts are reconciled, not just added. Every pass
            works out which subjects are genuinely below target and
            drops any older "attn:" notification not in that set — so
            fixing your attendance, editing the subject or deleting it
            clears the warning instead of leaving it stuck. The alert
            also carries the percentage in its key, so a subject that
            drops further re-announces itself with the new number. */
      var attendance = derive.attendance();
      var target = attendance.target;
      var liveKeys = [];

      /* derive.attendance() already walks ONLY the subjects with
         trackAttendance = true, so a subject the student opted out of
         can never reach this loop — which is what stopped alerts like
         "Cyber Security is at 0%" being raised for a subject nobody
         ever takes a register for. */
      attendance.subjects.forEach(function (row) {
        // No classes recorded yet is not a warning, it is an empty row.
        if (!row.recorded) return;
        if (row.pct >= target) return;

        var key = "attn:" + row.subjectId + ":" + Math.round(row.pct);
        liveKeys.push(key);

        notifications.add({
          key: key,
          type: "warning",
          title: "Attendance warning",
          body: row.subject + " is at " + row.pct.toFixed(0) +
                "% — below your " + target + "% target."
        });
      });

      notifications.dropByPrefix("attn:", liveKeys);
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

  /* Grade scales — shared by the CGPA page, its chart and the dashboard.

     The 10-point scale follows the usual Indian letter set, with O
     (Outstanding) at the top. `ladder` is the order the chart plots
     from the bottom up: B, B+, A, A+, O. Grades below B still count
     towards the CGPA — they simply sit under the chart's floor, which
     is what the "at least a pass" band is for. */
  /* ---- The Synora grading system -----------------------------
     One 10-point scale. A single grade carries the whole result,
     pass or fail, which is why there is no separate "exam status"
     field any more: two controls describing one outcome could
     disagree with each other, and did.

       PASSES          FAILURES
       O  = 10         E1  failed the internals
       A+ =  9         E2  failed the end-term exam
       A  =  8         E3  failed both
       B+ =  7
       B  =  6

     Grade points for E1/E2/E3
     -------------------------
     A failure earns ZERO grade points but still carries its
     credits into the denominator — the standard way a backlog
     drags a CGPA down, and the assumption this project states
     openly rather than leaving implied. It is not a positive
     grade and must never be plotted as one.                    */

  var GRADES = {
    "O":  { point: 10, pass: true,  label: "Outstanding" },
    "A+": { point: 9,  pass: true,  label: "Excellent" },
    "A":  { point: 8,  pass: true,  label: "Very good" },
    "B+": { point: 7,  pass: true,  label: "Good" },
    "B":  { point: 6,  pass: true,  label: "Above average" },
    "E1": { point: 0,  pass: false, label: "Failed in Internals" },
    "E2": { point: 0,  pass: false, label: "Failed in End Term Exam" },
    "E3": { point: 0,  pass: false, label: "Failed in Both Internals and End Term" }
  };

  /* Reading upwards from the baseline — the positive Y axis. */
  var GRADE_LADDER = ["B", "B+", "A", "A+", "O"];

  /* Hanging below the baseline — the negative Y axis. Three distinct
     results, never collapsed into one "E1/E2/E3" label. */
  var FAIL_LADDER = ["E1", "E2", "E3"];

  var GRADE_MAX = 10;

  function gradePoint(grade) {
    return GRADES[grade] ? GRADES[grade].point : undefined;
  }

  function isFailGrade(grade) {
    return !!GRADES[grade] && !GRADES[grade].pass;
  }

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

    /* Today's classes, with each entry's subject name resolved from the
       central list. Entries store a subjectId, never a name. */
    todaysClasses: function () {
      var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      var today = dayNames[new Date().getDay()];
      return store.get("timetable")
        .filter(function (c) { return c.day === today; })
        .map(function (c) {
          var subject = store.subjects.byId(c.subjectId);
          return {
            id: c.id,
            subject: subject ? subject.name : "",
            start: c.startTime || "",
            end: c.endTime || "",
            room: c.room || "",
            teacher: c.teacher || ""
          };
        })
        .filter(function (c) { return c.subject; })
        .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    },

    /* Weighted CGPA, or null if nothing is gradeable yet.

         CGPA = Σ(credits × grade point) / Σ(credits)

       Credits come from the subject record, the grade from the CGPA
       record — so changing a subject's credits in one place updates
       the CGPA everywhere, with no second copy to keep in step. */
    /* Every graded subject counts, whether or not its attendance is
       tracked. CGPA and attendance are independent systems — a subject
       you don't keep a register for still has credits and a grade. */
    cgpa: function () {
      var data = store.get("cgpa");
      var totalCredits = 0, weighted = 0, counted = 0, failed = 0;

      (data.subjects || []).forEach(function (row) {
        var subject = store.subjects.byId(row.subjectId);
        if (!subject) return;
        var credits = Number(subject.credits);
        var point = gradePoint(row.grade);
        if (credits > 0 && point !== undefined) {
          totalCredits += credits;
          weighted += credits * point;
          counted++;
          if (isFailGrade(row.grade)) failed++;
        }
      });

      if (!totalCredits) return null;
      return {
        value: weighted / totalCredits,
        totalCredits: totalCredits,
        count: counted,
        failed: failed,
        max: GRADE_MAX
      };
    },

    /* Overall attendance plus a per-subject breakdown.

         attendance % = attended / held × 100

       Percentages are computed here, never stored — there is one set
       of counts, and everything else is derived from it. */
    /* Driven by the SUBJECT list, not by the attendance list.

       The subjects with trackAttendance = true are the definition of
       what attendance covers; the stored rows only hold counts. Walking
       the subjects means a newly-added subject appears immediately at
       0/0, and — the part that matters — a subject whose tracking is
       switched off disappears from the page, the chart and the warnings
       at the same instant, with no stale row left behind to explain.

       A subject with trackAttendance = false is not represented here at
       all, so nothing downstream has to remember to exclude it. */
    attendance: function () {
      var target = Number(Synora.profile.get().targetAttendance) || 75;
      var counts = {};
      store.get("attendance").forEach(function (a) { counts[a.subjectId] = a; });

      var totalHeld = 0, totalAttended = 0;

      var rows = store.subjects.tracked().map(function (s) {
        var a = counts[s.id] || {};
        var total = Math.max(0, Number(a.total) || 0);
        var attended = util.clamp(Number(a.attended) || 0, 0, total);
        totalHeld += total;
        totalAttended += attended;
        return {
          id: a.id || null,
          subjectId: s.id,
          subject: s.name,
          total: total,
          attended: attended,
          /* held = 0 is "nothing recorded", not 0% and never NaN. */
          pct: total ? (attended / total) * 100 : 0,
          recorded: total > 0
        };
      });

      return {
        overall: totalHeld ? (totalAttended / totalHeld) * 100 : null,
        target: target,
        subjects: rows
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
  Synora.avatarHTML = avatarHTML;
  Synora.GRADES = GRADES;
  Synora.GRADE_LADDER = GRADE_LADDER;
  Synora.FAIL_LADDER = FAIL_LADDER;
  Synora.GRADE_MAX = GRADE_MAX;
  Synora.gradePoint = gradePoint;
  Synora.isFailGrade = isFailGrade;
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

    /* Nothing is seeded here. A new account's workspace is empty until
       the person fills it — the only pre-filled data in Synora belongs
       to the arsh2309 demo account, and demo-data.js writes that when
       that specific account signs in. */
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
