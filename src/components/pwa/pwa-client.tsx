"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/**
 * Non-standard install-flow events. Not yet part of TypeScript's DOM lib, so
 * they're declared here rather than cast away at each call site.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

/**
 * Registers the network-only service worker and reports PWA install signals
 * to analytics. See `docs/superpowers/specs/2026-07-30-pwa-design.md` §3.
 *
 * Three distinct signals, each meaning something different:
 *  - `beforeinstallprompt`  → how many visitors were *eligible* to install
 *    (Chromium-only; Safari/iOS never fires this).
 *  - `appinstalled`         → an actual install — the real conversion number.
 *  - `display-mode: standalone` → share of sessions launched from the
 *    installed app rather than the browser. This is the only signal that
 *    also catches iOS installs (Share → Add to Home Screen), and only after
 *    the fact — iOS installs are otherwise invisible to us, so install
 *    counts will systematically under-report iOS. That's a known, accepted
 *    gap, not a bug.
 */
export function PwaClient() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures (unsupported browser, dev-mode quirks, etc.)
        // must never break the app — the site works fine with no SW at all.
      });
    }

    function onBeforeInstallPrompt() {
      track("pwa_install_prompt_shown");
    }
    function onAppInstalled() {
      track("pwa_installed");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    if (standaloneQuery.matches) {
      track("pwa_running_standalone");
    }
    function onDisplayModeChange(event: MediaQueryListEvent) {
      if (event.matches) track("pwa_running_standalone");
    }
    standaloneQuery.addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      standaloneQuery.removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  return null;
}
