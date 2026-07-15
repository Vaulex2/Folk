"use client";
import { useEffect } from "react";

/** Registers the offline service worker. Production only — a SW serving stale
 * chunks during development is far more trouble than it's worth. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }
  }, []);
  return null;
}
