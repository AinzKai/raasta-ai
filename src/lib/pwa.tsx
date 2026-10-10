import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { useLocale } from "@/lib/i18n";

/** Registers the service worker in production only, so dev builds never serve stale assets. */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((e) => console.warn("sw_registration_failed", e));
  });
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function OfflineBanner() {
  const online = useOnline();
  const { T } = useLocale();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-[13px] font-semibold text-primary-foreground"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      {T("offlineBanner")}
    </div>
  );
}
