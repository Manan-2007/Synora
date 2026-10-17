import { useSyncExternalStore } from "react";
import { getTheme, subscribeTheme } from "../lib/theme.js";

/* The current theme, for the few places that render differently by
   theme in markup (most theming is pure CSS via [data-theme]). */
export default function useTheme() {
  return useSyncExternalStore(subscribeTheme, getTheme);
}
