/* Vercel serverless function: every /api/* request on the live site is
   rewritten here (vercel.json) and handled by the same Express app that
   runs locally (server/app.js). */

import app from "../server/app.js";

export default function handler(req, res) {
  /* vercel.json rewrites /api/<path> to /api?path=<path>; give Express the
     original URL back so its routes match. */
  const url = new URL(req.url, "http://localhost");
  const path = url.searchParams.get("path");
  if (path !== null) {
    url.searchParams.delete("path");
    req.url = "/api/" + path + (url.search || "");
  }
  return app(req, res);
}
