import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
// Mirrors every save into the MySQL database, and links a signed-in account
// to it whenever the API becomes reachable.
import "./lib/sync.js";
// Service worker + the browser's "install app" offer.
import "./lib/install.js";
import { startAutoConnect } from "./lib/auth.js";

// Global design system. Page-specific stylesheets are mounted per route (usePageStyles).
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

startAutoConnect();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Plain (non-transition) navigation, so a route change and the data
        change that caused it (e.g. signing out) render together. */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
