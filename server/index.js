/* Runs the Synora API on this computer: `npm run server`.
   Vite forwards the app's /api/* requests here (vite.config.js). */

import app from "./app.js";

const port = Number(process.env.API_PORT) || 4000;
app.listen(port, "127.0.0.1", () => {
  console.log(`Synora API listening on http://127.0.0.1:${port}`);
});
