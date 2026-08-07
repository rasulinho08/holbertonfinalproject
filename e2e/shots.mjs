/**
 * Visual audit harness.
 *
 * Signs in once, then walks every route in the app and writes a screenshot per
 * route in both colour schemes. Console errors are collected per route so a
 * screen that renders but throws still shows up in the report.
 *
 * Usage:
 *   npm run web            # in one terminal
 *   node e2e/shots.mjs [outDir] [light|dark]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const OUT = process.argv[2] ?? 'e2e/audit';
const SCHEME = process.argv[3] ?? 'light';

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = [
  ['home', '/'],
  ['explore', '/explore'],
  ['shelves', '/shelves'],
  ['quotes', '/quotes'],
  ['profile', '/profile'],
  ['book-detail', '/book/b_1'],
  ['book-reviews', '/book/b_1/reviews'],
  ['author', '/author/au_1'],
  ['shelf', '/shelf/sh_1_1'],
  ['badges', '/badges'],
  ['lists', '/lists'],
  ['list-detail', '/list/bl_1'],
  ['sessions', '/sessions'],
  ['read-timer', '/read/b_1'],
  ['leaderboard', '/leaderboard'],
  ['notifications', '/notifications'],
  ['buddy-reads', '/buddy-reads'],
  ['buddy-read', '/buddy-reads/br_1'],
  ['quote-detail', '/quote/q_1'],
  ['quote-new', '/quote/new'],
  ['review-new', '/review/new?bookId=b_1'],
  ['cart', '/cart'],
  ['checkout', '/checkout'],
  ['orders', '/orders'],
  ['settings', '/settings'],
  ['settings-appearance', '/settings/appearance'],
  ['settings-profile', '/settings/profile'],
  ['settings-security', '/settings/security'],
  ['user-profile', '/user/reshad'],
  ['user-followers', '/user/reshad/followers'],
  ['publisher', '/publisher'],
  ['publisher-books', '/publisher/books'],
  ['publisher-new-book', '/publisher/books/new'],
  ['publisher-orders', '/publisher/orders'],
  ['publisher-analytics', '/publisher/analytics'],
  ['admin', '/admin'],
  ['admin-reports', '/admin/reports'],
  ['admin-reviews', '/admin/reviews'],
  ['admin-quotes', '/admin/quotes'],
  ['not-found', '/definitely-not-a-route'],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=430,932'],
  defaultViewport: { width: 430, height: 932, deviceScaleFactor: 2 },
});

const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: SCHEME }]);

let errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 400));
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 400)}`));

const report = [];

async function waitForText(needle, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate((n) => document.body.innerText.includes(n), needle)) return true;
    await sleep(250);
  }
  return false;
}

async function clickText(needle, exact = false) {
  const rect = await page.evaluate(
    (n, isExact) => {
      const nodes = [...document.querySelectorAll('div,span,button,a,input')];
      const matches = nodes.filter((el) => {
        const text = (el.innerText ?? el.value ?? '').trim();
        return isExact ? text === n : text === n || text.startsWith(n);
      });
      const el = matches[matches.length - 1];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    },
    needle,
    exact,
  );
  if (!rect) return false;
  await page.mouse.click(rect.x, rect.y);
  await sleep(300);
  return true;
}

/* ------------------------------- sign in -------------------------------- */

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

// Skip onboarding if it is showing.
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

/* --------------------------- walk every route ---------------------------- */

for (const [name, path] of ROUTES) {
  errors = [];
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(2200); // let queries settle + animations land
    const text = await page.evaluate(() => document.body.innerText);
    const metrics = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      empty: document.body.innerText.trim().length < 30,
    }));
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    report.push({
      name,
      path,
      overflowX: metrics.scrollW > metrics.clientW + 1 ? metrics.scrollW - metrics.clientW : 0,
      blank: metrics.empty,
      textLen: text.length,
      errors: [...new Set(errors)],
    });
    console.log(
      `${metrics.empty ? 'BLANK' : '  ok '} ${name.padEnd(22)} ${
        metrics.scrollW > metrics.clientW + 1 ? `overflowX +${metrics.scrollW - metrics.clientW}` : ''
      } ${errors.length ? `errors:${new Set(errors).size}` : ''}`,
    );
  } catch (err) {
    report.push({ name, path, crashed: err.message.slice(0, 200), errors: [...new Set(errors)] });
    console.log(` FAIL ${name.padEnd(22)} ${err.message.slice(0, 120)}`);
  }
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

console.log('\n--- unique console errors across all routes ---');
const all = [...new Set(report.flatMap((r) => r.errors ?? []))].filter(
  (e) => !e.includes('React DevTools') && !e.includes('favicon'),
);
all.slice(0, 40).forEach((e) => console.log('•', e));
if (!all.length) console.log('(none)');

await browser.close();
