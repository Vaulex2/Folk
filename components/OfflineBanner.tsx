"use client";
import { useSyncExternalStore } from "react";
import { useT } from "@/components/I18nProvider";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return !navigator.onLine;
}

// navigator is unavailable during SSR; assume online, then the client corrects after hydration.
function getServerSnapshot() {
  return false;
}

export default function OfflineBanner() {
  const t = useT();
  const offline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!offline) return null;
  return <div className="offline-banner">{t("pwa.offlineBanner")}</div>;
}
