const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nilaygoyal/Documents/Github/zenvi frontend website/audit/zenvi-pro/flora-hero-build';
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(`${OUT}/${f}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('zenvi-intro-done','1'); } catch(e){} });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  for (const [i, y] of [0, 200, 500, 800, 1100, 1400, 1700].entries()) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/frame-${String(i).padStart(2,'0')}-y${y}.png` });
  }

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/mobile.png` });
  await browser.close();
})();
