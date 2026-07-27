import { chromium } from "playwright";
const OUT = process.env.OUT_DIR;
const SLUGS = ["rsc-carton","archive-box","pizza-box","food-box","packaging-tray",
  "vegetable-carton","yam-box","mango-box","packaging-tape","wrap","shredded-paper"];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 1400 }, deviceScaleFactor: 1 });
page.setDefaultNavigationTimeout(180000);
const bad = [];
page.on("response", (r) => { if (r.status() >= 400 && /_next\/image|\/products\//.test(r.url())) bad.push(`${r.status()} ${r.url()}`); });
const used = new Map();
for (const slug of SLUGS) {
  await page.goto(`http://localhost:3030/products/${slug}`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const d = await page.evaluate(() => {
    const p = document.querySelector("main .lg\\:sticky");
    const main = p.querySelector("img");
    const thumbs = [...p.querySelectorAll('button[aria-label^="Show image"]')];
    const f = (el) => decodeURIComponent(el.currentSrc).match(/products\/[^&?"]+/)?.[0];
    const sel = thumbs.findIndex((t) => t.getAttribute("aria-current") === "true");
    const box = p.querySelector("div").getBoundingClientRect();
    const nw = main?.naturalWidth ?? 0, nh = main?.naturalHeight ?? 0;
    const s = nw ? Math.min((box.width - 48) / nw, (box.height - 48) / nh) : 0;
    return { file: main ? f(main) : "PLACEHOLDER", n: thumbs.length || 1,
      agrees: thumbs.length ? f(main) === f(thumbs[sel].querySelector("img")) : true,
      fill: nw ? Math.round((nw * s) / (box.width - 48) * 100) : 0,
      loaded: main ? main.complete && nw > 0 : false };
  });
  used.set(slug, d.file);
  console.log(`  ${slug.padEnd(18)} ${d.loaded ? "ok" : "!!"} imgs=${d.n} agrees=${d.agrees} fill=${String(d.fill).padStart(3)}%  ${d.file}`);
}
// archive gallery switch
await page.goto("http://localhost:3030/products/archive-box", { waitUntil: "load" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/arch-1.png`, clip: { x: 148, y: 230, width: 545, height: 545 } });
await page.click('button[aria-label="Next image"]'); await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/arch-2.png`, clip: { x: 148, y: 230, width: 545, height: 545 } });
const dupes = [...used.values()].filter((v, i, a) => a.indexOf(v) !== i);
console.log("\nduplicates:", dupes.length ? [...new Set(dupes)] : "none");
console.log("failed image requests:", bad.length ? bad : "none");
await browser.close();
