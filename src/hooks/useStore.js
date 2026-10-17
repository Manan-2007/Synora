import { useSyncExternalStore } from "react";
import { subscribe, getVersion } from "../lib/storage.js";

/* Subscribes a component to the localStorage-backed store. The returned
   version changes after every write; read the data itself through
   src/lib (store, profile, derive, …) during render. */
export default function useStore() {
  return useSyncExternalStore(subscribe, getVersion);
}
