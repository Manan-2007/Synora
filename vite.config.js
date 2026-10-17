import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* The local MySQL API (server/, `npm run server`). The app calls /api/*
   on its own origin and Vite forwards those requests to it, on the port
   set in server/.env. Until server/.env exists (MySQL not set up) there is
   no proxy and the app simply runs on browser storage. */
const apiEnv = new URL("./server/.env", import.meta.url);
const apiPort = existsSync(apiEnv) && /^API_PORT=(\d+)/m.exec(readFileSync(apiEnv, "utf8"));
const api = existsSync(apiEnv) ? { "/api": `http://127.0.0.1:${apiPort ? apiPort[1] : 4000}` } : undefined;

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
  build: {
    /* Ship the design-system CSS exactly as written. Minifying it with
       Lightning CSS rewrote vendor-prefixed pairs — it kept only
       -webkit-backdrop-filter on the landing header (so Chrome lost the
       blur) and dropped -moz-osx-font-smoothing. */
    cssMinify: false,
    rolldownOptions: {
      output: {
        // React and the router change far less often than the app — keep them in their own cached chunk.
        codeSplitting: {
          groups: [{ name: "vendor", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ }],
        },
      },
    },
  },
});
