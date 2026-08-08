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

// The account matters: the publisher and admin screens render a "no access"
// state for a reader, which a status check happily reports as fine.
const EMAIL = process.env.E2E_EMAIL ?? 'leyla@kitabdostu.az';
const PASSWORD = process.env.E2E_PASSWORD ?? 'password123';

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Routes with a `:id` segment are filled in at run time from the API.
 *
 * They used to hardcode the mock's prefixed ids (`b_1`, `au_1`). Those are not
 * ids the real backend has ever issued — it uses uuids — so every detail screen
 * silently exercised an error path instead of the screen it was meant to test.
 */
const ROUTES = [
  ['home', '/'],
  ['explore', '/explore'],
  ['shelves', '/shelves'],
  ['quotes', '/quotes'],
  ['profile', '/profile'],
  ['book-detail', '/book/{bookId}'],
  ['book-reviews', '/book/{bookId}/reviews'],
  ['author', '/author/{authorId}'],
  ['shelf', '/shelf/{shelfId}'],
  ['badges', '/badges'],
  ['lists', '/lists'],
  ['list-detail', '/list/{listId}'],
  ['sessions', '/sessions'],
  ['read-timer', '/read/{bookId}'],
  ['leaderboard', '/leaderboard'],
  ['notifications', '/notifications'],
  ['buddy-reads', '/buddy-reads'],
  ['buddy-read', '/buddy-reads/{buddyId}'],
  ['quote-detail', '/quote/{quoteId}'],
  ['quote-new', '/quote/new'],
  ['review-new', '/review/new?bookId={bookId}'],
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
  ['admin-users', '/admin/users'],
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

// "Failed to load resource: 500" in the console does not say *which* resource,
// which is useless when the page makes thirty requests. Record the response
// itself so a failure names its own URL.
page.on('response', (res) => {
  const status = res.status();
  if (status >= 400) {
    const url = res.url();
    // Expo's dev server 404s a few probes by design; only real API calls matter.
    if (url.includes('/api/') || status >= 500) {
      errors.push(`HTTP ${status} ${res.request().method()} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
    }
  }
});

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
  await page.keyboard.type(EMAIL);
  await inputs[1].click();
  await page.keyboard.type(PASSWORD);
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

/* ------------------------- resolve real ids ------------------------------ */

/**
 * Reads ids out of the running app rather than assuming them.
 *
 * Taken from the rendered links on each list screen, so they are whatever the
 * app itself is working with — mock ids against the mock, uuids against the
 * real backend, with no branch here for either.
 */
const API = process.env.E2E_API_BASE ?? 'http://localhost:4000/api/v1';

const resolved = await page.evaluate(async (api) => {
  // Scraping links does not work: most navigation is a `Pressable` calling
  // `router.push`, which react-native-web renders as a div with no href. Asking
  // the API is simpler and gives exactly the ids the screens will be handed.
  const token = window.localStorage.getItem('kd.auth.access');
  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  async function first(path, pluck) {
    try {
      const res = await fetch(`${api}${path}`, { headers: auth });
      if (!res.ok) return null;
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [json?.data];
      const row = rows[0];
      return (pluck ? pluck(row) : row?.id) ?? null;
    } catch {
      return null;
    }
  }

  const book = await first('/books?limit=1', (b) => b);

  return {
    bookId: book?.id ?? null,
    authorId: book?.authorId ?? null,
    listId: await first('/lists?limit=1'),
    quoteId: await first('/quotes?limit=1'),
    buddyId: await first('/buddy-reads?limit=1'),
    shelfId: await first('/shelves'),
  };
}, API);

console.log('\nresolved ids:', JSON.stringify(resolved), '\n');

function fillIds(path) {
  return path.replace(/\{(\w+)\}/g, (match, key) => resolved[key] ?? match);
}

/* --------------------------- walk every route ---------------------------- */

for (const [name, rawPath] of ROUTES) {
  const path = fillIds(rawPath);
  // A route whose id could not be resolved would silently test an error page.
  if (path.includes('{')) {
    console.log(` SKIP ${name.padEnd(22)} could not resolve ${rawPath}`);
    report.push({ name, path: rawPath, skipped: true, errors: [] });
    continue;
  }
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
