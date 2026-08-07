/**
 * Palette comparison shots.
 *
 * Renders the same three screens under each accent palette, in both colour
 * schemes, so the six-way comparison can be made by looking rather than by
 * reading hex codes.
 *
 *   node e2e/palettes.mjs [outDir]
 */
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const OUT = process.argv[2] ?? 'e2e/palettes';

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PALETTES = ['ink', 'forest', 'violet'];
const SCHEMES = ['light', 'dark'];
const SCREENS = [
  ['home', '/'],
  ['explore', '/explore'],
  ['book', '/book/b_1'],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 430, height: 932, deviceScaleFactor: 2 },
});

const page = await browser.newPage();

async function waitForText(needle, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate((n) => document.body.innerText.includes(n), needle)) return true;
    await sleep(250);
  }
  return false;
}

async function clickText(needle) {
  const rect = await page.evaluate((n) => {
    const nodes = [...document.querySelectorAll('div,span,button,a,input')];
    const el = nodes.filter((e) => (e.innerText ?? '').trim().startsWith(n)).pop();
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width && r.height ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  }, needle);
  if (!rect) return false;
  await page.mouse.click(rect.x, rect.y);
  await sleep(300);
  return true;
}

/* Sign in once; the session and the prefs both live in localStorage. */
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await waitForText('Kitab dostunu tap', 60000);

const inputs = await page.$$('input');
if (inputs.length >= 2) {
  await inputs[0].click();
  await page.keyboard.type('leyla@kitabdostu.az');
  await inputs[1].click();
  await page.keyboard.type('password123');
}
await clickText('Daxil ol');
await sleep(2500);

if (await page.evaluate(() => document.body.innerText.includes('Hansı janrları sevirsən'))) {
  for (const g of ['Roman', 'Detektiv', 'Klassik']) await clickText(g);
  await sleep(300);
  await clickText('Növbəti');
  await sleep(900);
  await clickText('Növbəti');
  await sleep(900);
  await clickText('Başlayaq');
  await sleep(2000);
}

for (const scheme of SCHEMES) {
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);

  for (const palette of PALETTES) {
    // Written straight into the zustand-persist blob, then reloaded — the store
    // rehydrates from it on boot, which is the same path a real preference takes.
    await page.evaluate(
      (name, mode) => {
        const key = 'kd.prefs';
        const raw = JSON.parse(localStorage.getItem(key) ?? '{"state":{},"version":0}');
        raw.state = { ...raw.state, themeName: name, themeMode: mode };
        localStorage.setItem(key, JSON.stringify(raw));
      },
      palette,
      scheme,
    );

    for (const [name, path] of SCREENS) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 45000 });
      await sleep(2200);
      const file = `${OUT}/${palette}-${scheme}-${name}.png`;
      await page.screenshot({ path: file });
      console.log(`  ${file}`);
    }
  }
}

await browser.close();
console.log('\nDone.');
