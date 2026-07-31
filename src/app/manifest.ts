import type { MetadataRoute } from "next";

/**
 * Web app manifest (Next 16 native typed route — no static JSON needed).
 *
 * Kept deliberately thin: this is a commerce site, so the manifest exists to
 * make the storefront installable, not to layer on offline app behaviour.
 * See `public/sw.js` / `docs/superpowers/specs/2026-07-30-pwa-design.md` for
 * why the service worker stays network-only for store data.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Packaging General — Digital-First Packaging in West Africa",
    short_name: "Packaging General",
    description:
      "Standardized packaging for SMEs and growing brands across Ghana & West Africa.",
    start_url: "/",
    display: "standalone",
    // Matches the page body background (`--color-background`) so there is no
    // flash between the splash screen and first paint.
    background_color: "#e8e5de",
    // Matches the site header background (`--color-surface`) so the OS status
    // bar / browser chrome blends with the app instead of clashing with it.
    theme_color: "#fefdfb",
    // Same two files serve both purposes. They're safe unmasked: the art is
    // a solid rust square with no transparency (no letterboxing risk), the
    // mark just sits with more padding than a typical edge-to-edge "any"
    // icon would. Contexts that don't apply a circular/rounded mask (desktop
    // taskbar, some launchers) get `purpose:"any"`; adaptive-icon contexts
    // get `purpose:"maskable"`.
    icons: [
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
