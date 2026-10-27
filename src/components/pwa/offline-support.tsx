"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Registers the offline shell in production. Development is intentionally
 * excluded so cached assets never mask a local change.
 */
export function OfflineSupport() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const register = () => {
        void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return <div role="status" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[90] mx-auto flex max-w-md items-center gap-2 rounded-full border border-line bg-ink px-4 py-2.5 text-xs font-medium text-white shadow-lg"><WifiOff size={14} aria-hidden="true" /> Offline — your saved plan and edits still work.</div>;
}
