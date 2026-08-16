/* =========================================================
   Synora — Contact section

   Two jobs:
     1. fill the contact details from one object, so there is a
        single place to edit them
     2. validate and "send" the Get in Touch form

   About sending
   -------------
   Synora has no backend. This form does NOT email anyone, and
   the code deliberately doesn't pretend otherwise: there is no
   fetch() to a made-up endpoint and no fake network delay
   dressed up as delivery. It validates the message, shows a
   confirmation, and says plainly that nothing left the browser.

   Making it real is a server-side job — a form endpoint or a
   small API that takes these four fields and sends mail. When
   that exists, the one place to change is submit() below.
   ========================================================= */

(function () {
  "use strict";

  /* =======================================================
     PLACEHOLDERS — replace these four values with the real
     ones. Nothing else in the project needs to change; the
     markup reads them from here.
     ======================================================= */
  var CONTACT_INFO = {
    phone: "+91 98654 54345",
    email: "synora@gmail.com",
    office: "Sector 20, Panchkula, India",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Sector+20+Panchkula+India"
  };

  /* ---- Fill in the details ---------------------------------- */

  function applyContactInfo() {
    var phoneEl = document.querySelector("[data-contact-phone]");
    if (phoneEl) {
      phoneEl.textContent = CONTACT_INFO.phone;
      // tel: wants the number without spaces or punctuation.
      phoneEl.setAttribute("href", "tel:" + CONTACT_INFO.phone.replace(/[^\d+]/g, ""));
    }

    var emailEl = document.querySelector("[data-contact-email]");
    if (emailEl) {
      emailEl.textContent = CONTACT_INFO.email;
      emailEl.setAttribute("href", "mailto:" + CONTACT_INFO.email);
    }

    var officeEl = document.querySelector("[data-contact-office]");
    if (officeEl) officeEl.textContent = CONTACT_INFO.office;

    /* No map link is configured yet, and inventing coordinates for an
       address that doesn't exist would be worse than leaving it out —
       so the link hides itself until mapUrl is filled in. */
    var mapEl = document.querySelector("[data-contact-map]");
    if (mapEl) {
      if (CONTACT_INFO.mapUrl) {
        mapEl.setAttribute("href", CONTACT_INFO.mapUrl);
      } else {
        mapEl.hidden = true;
      }
    }
  }

  /* ---- Validation ------------------------------------------- */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* Phone numbers are written a dozen different ways, so this checks
     the shape rather than the format: optional +, then 7–15 digits
     once spaces, dashes and brackets are removed. */
  function isPhone(value) {
    var digits = value.replace(/[\s()\-.]/g, "");
    return /^\+?\d{7,15}$/.test(digits);
  }

  function fieldOf(form, name) {
    return form.querySelector('[data-field="' + name + '"]');
  }

  function setError(form, name, message) {
    var field = fieldOf(form, name);
    if (!field) return;
    field.classList.add("is-invalid");
    var input = field.querySelector(".input");
    if (input) input.setAttribute("aria-invalid", "true");
    var msg = field.querySelector(".field__error");
    if (msg) msg.textContent = message;
  }

  function clearError(field) {
    field.classList.remove("is-invalid");
    var input = field.querySelector(".input");
    if (input) input.removeAttribute("aria-invalid");
    var msg = field.querySelector(".field__error");
    if (msg) msg.textContent = "";
  }

  function validate(form) {
    form.querySelectorAll(".field").forEach(clearError);

    var values = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim()
    };

    var firstBad = null;
    function fail(field, message) {
      setError(form, field, message);
      if (!firstBad) firstBad = field;
    }

    if (!values.name) fail("name", "Please tell us your name.");
    else if (values.name.length < 2) fail("name", "That looks a little short.");

    if (!values.email) fail("email", "We need an email to reply to.");
    else if (!EMAIL_RE.test(values.email)) fail("email", "That doesn't look like an email address.");

    if (!values.phone) fail("phone", "Please add a phone number.");
    else if (!isPhone(values.phone)) fail("phone", "Use 7–15 digits, with an optional country code.");

    if (!values.message) fail("message", "Don't forget the message itself.");
    else if (values.message.length < 10) fail("message", "A little more detail will help us answer.");

    if (firstBad) {
      var input = fieldOf(form, firstBad).querySelector(".input");
      if (input) input.focus();
      return null;
    }
    return values;
  }

  /* ---- Wiring ----------------------------------------------- */

  function init() {
    applyContactInfo();

    var form = document.getElementById("contact-form");
    if (!form) return;

    var sent = document.querySelector("[data-contact-sent]");

    // Clear a field's error the moment it is edited — telling someone
    // their name is wrong while they are still typing it is unhelpful.
    form.querySelectorAll(".input").forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field && field.classList.contains("is-invalid")) clearError(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var values = validate(form);
      if (!values) return;

      /* This is the seam. Today it stops here; a real integration
         would post `values` to an endpoint and show the confirmation
         on success. What it must not do is claim delivery it can't
         perform, which is why nothing here says "email sent". */
      form.hidden = true;
      if (sent) {
        sent.hidden = false;
        sent.querySelector("h4").focus();
      }
    });

    form.addEventListener("reset", function () {
      form.querySelectorAll(".field").forEach(clearError);
    });

    var again = document.querySelector("[data-contact-again]");
    if (again) {
      again.addEventListener("click", function () {
        form.reset();
        form.querySelectorAll(".field").forEach(clearError);
        if (sent) sent.hidden = true;
        form.hidden = false;
        form.name.focus();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
