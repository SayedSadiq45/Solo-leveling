import puppeteer from 'puppeteer-core';
const OUT = '../_raw';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--hide-scrollbars', '--force-device-scale-factor=1']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await page.goto('http://localhost:5174/solo-leveling-/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const vh = 900;
async function shoot(name, y) {
  await page.evaluate(v => window.scrollTo(0, v), y);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('  ->', name);
}
async function span(sel) {
  return page.evaluate(s => {
    const el = document.querySelector(s);
    return { top: el.offsetTop, h: el.offsetHeight };
  }, sel);
}

const aw = await span('.awaken');
for (const [n, f] of [['01-awaken-closed', 0.02], ['02-awaken-mid', 0.42], ['03-awaken-glow', 0.75]])
  await shoot(n, aw.top + (aw.h - vh) * f);

const mo = await span('.monarch');
for (const [n, f] of [['04-monarch-a', 0.02], ['04-monarch-b', 0.35], ['04-monarch-c', 0.68], ['04-monarch-d', 0.97]])
  await shoot(n, mo.top + (mo.h - vh) * f);

await shoot('05-reveal', (await span('.reveal')).top);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
await browser.close();
