import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
