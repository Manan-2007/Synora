/* =========================================================
   Synora — Landing page behaviour
   Mobile nav, FAQ accordion, anchor scrolling, header state,
   and a light scroll reveal. All optional: the page is fully
   readable and usable without any of it.
   ========================================================= */

(function () {
  "use strict";

  var MOBILE_QUERY = "(max-width: 860px)";
  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  /* ---------------------------------------------------- Header state */

  var header = document.getElementById("site-header");

  if (header) {
    var ticking = false;

    var updateHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateHeader);
      },
      { passive: true }
    );

    updateHeader();
  }

  /* ---------------------------------------------------- Mobile nav */

  var navToggle = document.getElementById("nav-toggle");
  var navPanel = document.getElementById("nav-panel");

  function setNavOpen(open) {
    if (!navToggle || !navPanel) return;
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navPanel.classList.toggle("is-open", open);
    if (open) {
      navPanel.removeAttribute("hidden");
    } else {
      navPanel.setAttribute("hidden", "");
    }
  }

  if (navToggle && navPanel) {
    navToggle.addEventListener("click", function () {
      setNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
    });

    navPanel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNavOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (navToggle.getAttribute("aria-expanded") !== "true") return;
      setNavOpen(false);
      navToggle.focus();
    });

    /* Leaving mobile widths with the panel open would strand it. */
    if (window.matchMedia) {
      var mobile = window.matchMedia(MOBILE_QUERY);
      var onBreakpoint = function (event) {
        if (!event.matches) setNavOpen(false);
      };
      if (mobile.addEventListener) {
        mobile.addEventListener("change", onBreakpoint);
      } else if (mobile.addListener) {
        mobile.addListener(onBreakpoint);
      }
    }
  }

  /* ---------------------------------------------------- FAQ accordion */

  var triggers = document.querySelectorAll(".faq-trigger");

  Array.prototype.forEach.call(triggers, function (trigger) {
    var panel = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!panel) return;

    trigger.addEventListener("click", function () {
      var open = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!open));
      panel.classList.toggle("is-open", !open);
      if (open) {
        panel.setAttribute("hidden", "");
      } else {
        panel.removeAttribute("hidden");
      }
    });
  });

  /* ---------------------------------------------------- Anchor scrolling */

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;

    var hash = link.getAttribute("href");
    if (!hash || hash === "#") return;

    var target = document.getElementById(hash.slice(1));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: reduceMotion.matches ? "auto" : "smooth",
      block: "start"
    });

    /* Send keyboard focus along with the viewport. */
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });

    if (window.history && window.history.pushState) {
      window.history.pushState(null, "", hash);
    }
  });

  /* ---------------------------------------------------- Scroll reveal */

  var revealables = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    document.documentElement.classList.add("no-reveal");
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    Array.prototype.forEach.call(revealables, function (el) {
      observer.observe(el);
    });
  }

  /* ---------------------------------------------------- Footer year */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
