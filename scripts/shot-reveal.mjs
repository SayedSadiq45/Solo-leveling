import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--hide-scrollbars', '--force-device-scale-factor=1']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:5174/solo-leveling-/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2200));
await page.evaluate(() => window.scrollTo(0, document.querySelector('.reveal').offsetTop));
await new Promise(r => setTimeout(r, 1500));

// sweep across the suit — the area that previously looked unresponsive
for (const [n, tx, ty] of [['reveal-suit', 700, 620], ['reveal-head', 760, 300]]) {
  for (let s = 0; s <= 14; s++) {
    await page.mouse.move(300 + (tx - 300) * s / 14, 250 + (ty - 250) * s / 14);
    await new Promise(r => setTimeout(r, 40));
  }
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: `../_raw/${n}.png` });
  console.log(n);
}
console.log(errs.length ? 'ERRORS ' + errs.join('|') : 'no page errors');
await browser.close();
