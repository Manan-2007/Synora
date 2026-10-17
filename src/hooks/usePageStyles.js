import { useInsertionEffect } from "react";

const mounted = new Map();   // css text -> { el, users }

/* Mounts a page-specific stylesheet only while the page is on screen.

   The vanilla build gave each page its own <link>: the landing page loaded
   landing.css, the app pages app.css, and so on. Those files were never
   loaded together and they reuse names (.card, .loader, a landing-only
   :root override), so loading them all globally would change how pages
   look. Scoping them to their route keeps every page's cascade exactly
   what it was. Pass the CSS imported with Vite's `?inline` suffix. */
export default function usePageStyles(css) {
  useInsertionEffect(() => {
    let entry = mounted.get(css);
    if (!entry) {
      const el = document.createElement("style");
      el.textContent = css;
      document.head.appendChild(el);
      entry = { el, users: 0 };
      mounted.set(css, entry);
    }
    entry.users += 1;
    return () => {
      entry.users -= 1;
      if (entry.users === 0) {
        entry.el.remove();
        mounted.delete(css);
      }
    };
  }, [css]);
}
