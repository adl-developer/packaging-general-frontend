import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 600 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Account" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "shots/account-menu-loggedin.png" });
console.log("captured account-menu-loggedin");
await browser.close();
