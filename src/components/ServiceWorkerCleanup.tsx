"use client";

import { useEffect } from "react";

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    let cancelled = false;

    const cleanup = async () => {
      if (typeof window === "undefined") return;

      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
      } catch {
        // Ignore cleanup errors.
      }

      try {
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
      } catch {
        // Ignore cleanup errors.
      }

      if (!cancelled) {
        const markerKey = "__sw_cleanup_done__";
        const done = sessionStorage.getItem(markerKey);
        if (!done) {
          sessionStorage.setItem(markerKey, "1");
          window.location.reload();
        }
      }
    };

    cleanup();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
