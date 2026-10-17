import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
// Mirrors every save into the local MySQL database when its API is running.
import "./lib/sync.js";

// Global design system. Page-specific stylesheets are mounted per route (usePageStyles).
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Plain (non-transition) navigation, so a route change and the data
        change that caused it (e.g. signing out) render together. */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
