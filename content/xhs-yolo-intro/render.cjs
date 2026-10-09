// Render each .poster to output/<id>.png
const path = require('path');
const { chromium } = require(process.env.PW_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const ids = await page.$$eval('.poster', els => els.map(e => e.id));
  for (const id of ids) {
    await page.locator('#' + id).screenshot({ path: path.join(__dirname, 'output', id + '.png') });
    console.log('rendered', id);
  }
  await browser.close();
})();
