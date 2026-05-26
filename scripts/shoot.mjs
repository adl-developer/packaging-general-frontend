// Screenshot routes at desktop + mobile widths for visual parity checks.
// Usage: node scripts/shoot.mjs [route ...]   (bare names, no leading slash —
//   e.g. `node scripts/shoot.mjs checkout design-system`; no args = home).
//   Bare names avoid Git-Bash/MSYS mangling a leading "/" into a path.
// Requires the dev server running on http://localhost:3000.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const routes = (args.length ? args : [""]).map((r) => "/" + r.replace(/^\/+/, ""));
const widths = [
  { name: "desktop", width: 1512, height: 982 },
  { name: "mobile", width: 393, height: 852 },
];

const browser = await chromium.launch();
for (const route of routes) {
  for (const w of widths) {
    const page = await browser.newPage({
      viewport: { width: w.width, height: w.height },
      deviceScaleFactor: 1,
      // Motion branch uses scroll-triggered Reveal/Stagger; without this, full-page
      // screenshots capture sections at opacity:0 because IntersectionObserver
      // never fires (Playwright fullPage expands the viewport, doesn't scroll).
      reducedMotion: "reduce",
    });
    await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" });
    // Scroll the page top-to-bottom in viewport-sized steps so all whileInView
    // (motion Reveal/Stagger) animations trigger. Without this, fullPage
    // captures sections below the initial viewport at opacity:0.
    await page.evaluate(async (vh) => {
      await new Promise((resolve) => {
        const step = Math.max(200, Math.floor(vh * 0.8));
        let y = 0;
        const tick = () => {
          window.scrollTo(0, y);
          if (y >= document.documentElement.scrollHeight) { resolve(); return; }
          y += step;
          setTimeout(tick, 60);
        };
        tick();
      });
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 200));
    }, w.height);
    const slug = route === "/" ? "home" : route.replace(/\//g, "-").replace(/^-/, "");
    await page.screenshot({ path: `shots/${slug}-${w.name}.png`, fullPage: true });
    console.log(`captured ${slug}-${w.name}`);
    await page.close();
  }
}
await browser.close();
