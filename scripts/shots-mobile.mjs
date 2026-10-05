import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--hide-scrollbars']
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:5174/solo-leveling-/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const at = async (sel, off = 0) =>
  page.evaluate((s, o) => window.scrollTo(0, document.querySelector(s).offsetTop + o), sel, off);

const aw = await page.evaluate(() => document.querySelector('.awaken').offsetHeight);
await page.evaluate(y => window.scrollTo(0, y), (aw - 844) * 0.75);
await new Promise(r => setTimeout(r, 2200));
await page.screenshot({ path: '../_raw/m1-awaken.png' });

await at('.monarch'); await new Promise(r => setTimeout(r, 2200));
await page.screenshot({ path: '../_raw/m2-monarch.png' });

await at('.reveal'); await new Promise(r => setTimeout(r, 2200));
await page.screenshot({ path: '../_raw/m3-reveal.png' });

console.log(errs.length ? 'ERRORS ' + errs.join('|') : 'no page errors');
await browser.close();
