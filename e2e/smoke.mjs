/**
 * End-to-end smoke test.
 *
 * Drives the running Expo web build in headless Chrome and walks both user
 * flows from the product spec — "add a book to a shelf" and "buy a book" —
 * plus the main navigation surfaces. Prints PASS/FAIL per step, reports any
 * console errors, and writes a screenshot per step.
 *
 * Usage:
 *   npm run web          # in one terminal, wait for "Waiting on http://localhost:8081"
 *   npm run e2e          # in another
 *
 * Set CHROME_PATH if Chrome is not at the default Windows location.
 */
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const OUT = process.argv[2] ?? 'e2e/screenshots';

mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];

function step(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Waits until some element's text content contains `needle`. */
async function waitForText(page, needle, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await page.evaluate(
      (n) => document.body.innerText.includes(n),
      needle,
    );
    if (found) return true;
    await sleep(300);
  }
  return false;
}

/**
 * Clicks the innermost element whose visible text matches, using a real mouse
 * click at its centre — react-native-web drives presses off pointer events, so
 * a synthetic `element.click()` is not always enough.
 */
async function clickText(page, needle, { exact = false } = {}) {
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
  await sleep(350);
  return true;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=430,932'],
  defaultViewport: { width: 430, height: 932 },
});

const page = await browser.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

try {
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 90000 });

  // 1. login screen renders
  step('login screen renders', await waitForText(page, 'Kitab dostunu tap'));
  await page.screenshot({ path: `${OUT}/01-login.png` });

  // 2. sign in with demo credentials
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].click();
    await page.keyboard.type('leyla@kitabdostu.az');
    await inputs[1].click();
    await page.keyboard.type('password123');
  }
  await clickText(page, 'Daxil ol');
  step('sign in navigates to onboarding', await waitForText(page, 'Hansı janrları sevirsən'));
  await page.screenshot({ path: `${OUT}/02-onboarding.png` });

  // 3. onboarding: pick 3 genres, advance to the end
  step('genre chips load', await waitForText(page, 'Roman', 20000));
  for (const genre of ['Roman', 'Detektiv', 'Klassik']) {
    await clickText(page, genre);
    await sleep(200);
  }
  await sleep(400);
  await clickText(page, 'Növbəti');
  await sleep(1200);
  await clickText(page, 'Növbəti');
  await sleep(1200);
  step('onboarding reaches goal step', await waitForText(page, 'Bu il neçə kitab'));
  await clickText(page, 'Başlayaq');

  // 4. home screen
  step('home screen loads', await waitForText(page, 'Trenddə olanlar', 30000));
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/03-home.png` });

  // 5. explore tab + search
  await clickText(page, 'Kəşf et');
  step('explore tab opens', await waitForText(page, 'Populyar janrlar'));
  const searchBox = (await page.$$('input'))[0];
  if (searchBox) {
    await searchBox.click();
    await page.keyboard.type('Əli');
  }
  step('search returns results', await waitForText(page, 'nəticə', 15000));
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/04-explore.png` });

  // 6. open a book -> add to shelf (spec user flow 1)
  await clickText(page, 'Əli və Nino');
  step('book detail opens', await waitForText(page, 'Rəfə əlavə et', 15000));
  await sleep(800);
  await page.screenshot({ path: `${OUT}/05-book.png` });

  await clickText(page, 'Rəfə əlavə et');
  step('shelf picker opens', await waitForText(page, 'Oxumaq istəyirəm', 10000));
  await sleep(900); // let the sheet finish sliding in before aiming at a row
  await clickText(page, 'Oxuyuram', { exact: true });
  await sleep(600);
  await clickText(page, 'Yadda saxla', { exact: true });
  step('book added to shelf', await waitForText(page, 'rəfinə əlavə olundu', 12000));
  await sleep(1000);
  await page.screenshot({ path: `${OUT}/06-shelf-added.png` });

  // 7. add to cart -> cart shows the line (spec user flow 2)
  await clickText(page, 'Səbətə at');
  await sleep(2000);
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle2' });
  step('cart shows the added book', await waitForText(page, 'Sifarişi tamamla', 20000));
  await sleep(1000);
  await page.screenshot({ path: `${OUT}/07-cart.png` });

  // 8. checkout
  await clickText(page, 'Sifarişi tamamla');
  step('checkout address step', await waitForText(page, 'Çatdırılma məlumatları', 15000));
  const fields = await page.$$('input');
  if (fields[1]) {
    await fields[1].click();
    await page.keyboard.type('0501234567');
  }
  // The address line is multiline, so react-native-web renders a <textarea>.
  const areas = await page.$$('textarea');
  if (areas[0]) {
    await areas[0].click();
    await page.keyboard.type('Nizami küç. 12, mənzil 5');
  }
  await sleep(400);
  await clickText(page, 'Növbəti', { exact: true });
  step('checkout payment step', await waitForText(page, 'Ödəniş üsulu', 15000));
  await sleep(1000);
  await page.screenshot({ path: `${OUT}/08-checkout.png` });

  await clickText(page, 'Sifarişi təsdiqlə');
  step('order placed', await waitForText(page, 'Sifarişin qəbul olundu', 20000));
  await sleep(800);
  await page.screenshot({ path: `${OUT}/09-order-success.png` });

  // 9. profile with charts
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' });
  step('profile renders stats', await waitForText(page, 'Janr bölgüsü', 20000));
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/10-profile.png` });

  // 10. quotes feed
  await page.goto(`${BASE}/quotes`, { waitUntil: 'networkidle2' });
  step('quotes feed renders', await waitForText(page, 'Sitatlar', 20000));
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/11-quotes.png` });

  // 11. leaderboard
  await page.goto(`${BASE}/leaderboard`, { waitUntil: 'networkidle2' });
  step('leaderboard renders', await waitForText(page, 'Reytinq cədvəli', 20000));
  await sleep(1000);
  await page.screenshot({ path: `${OUT}/12-leaderboard.png` });
} catch (err) {
  step('run completed without throwing', false, err.message);
} finally {
  console.log('\n--- console errors ---');
  const unique = [...new Set(errors)].filter(
    (e) => !e.includes('Download the React DevTools') && !e.includes('favicon'),
  );
  unique.slice(0, 15).forEach((e) => console.log(e.slice(0, 300)));
  if (unique.length === 0) console.log('(none)');

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} steps passed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}
