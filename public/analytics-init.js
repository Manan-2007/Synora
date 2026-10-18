/* Vercel Web Analytics: queue events until /_vercel/insights/script.js loads. */
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

/* The script itself exists only on Vercel; on this computer it would just 404. */
if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  var va = document.createElement("script");
  va.defer = true;
  va.src = "/_vercel/insights/script.js";
  document.head.appendChild(va);
}
