/**
 * PWA bootstrap (§33): service-worker registration, settings hydration and
 * the install prompt. Offline modes (AI, local, tutorial) work without the
 * server once the app shell is cached.
 */

"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaBootstrap() {
  const hydrate = useSettings((s) => s.hydrate);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    hydrate();

    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch(() => {
            // Offline caching unavailable (e.g. dev without SW) — non-fatal.
          });
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    // §65: manual reduced-motion overrides the OS default so pixel-sensitive
    // players can force calm motion even when their system keeps animations on.
    const applyReducedMotion = () => {
      const setting = useSettings.getState().reducedMotion;
      const root = document.documentElement;
      if (setting === true) root.dataset.reducedMotion = "true";
      else delete root.dataset.reducedMotion;
    };
    applyReducedMotion();
    const unsubscribe = useSettings.subscribe(applyReducedMotion);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      unsubscribe();
    };
  }, [hydrate]);

  if (!installEvent) return null;

  return (
    <div className="fixed bottom-[calc(var(--safe-bottom)+1rem)] right-4 z-40">
      <div className="toast flex items-center gap-3">
        <span className="text-sm">Install Quintara</span>
        <button
          type="button"
          className="btn btn-primary px-3 py-1.5 text-xs"
          onClick={async () => {
            await installEvent.prompt();
            setInstallEvent(null);
          }}
        >
          Install
        </button>
        <button
          type="button"
          className="btn btn-ghost px-2 py-1.5 text-xs"
          onClick={() => setInstallEvent(null)}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
