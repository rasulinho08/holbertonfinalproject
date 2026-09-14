/**
 * Adds the manifest and the Apple-specific tags to the exported `index.html`.
 *
 * Why a post-processing step rather than `app/+html.tsx`: that file is only
 * honoured when `web.output` is `static`. This project exports as a single-page
 * app, where Expo builds the HTML from its own internal template with no hook
 * to extend it — so the tags are added here, after the export.
 *
 * What they buy: without them, "Add to Home Screen" on an iPhone produces a
 * Safari bookmark that opens with the browser chrome and uses a screenshot as
 * its icon. With them it launches like an installed app. That matters because
 * iOS has no free way to install a real build — see MOBILE.md — so the
 * home-screen install is the entire iPhone story.
 *
 * iOS ignores `manifest.json` for this and reads the `apple-*` tags instead,
 * so both sets have to be present; the manifest serves Android and desktop.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const indexPath = join(process.cwd(), 'dist', 'index.html');

const MARKER = '<!-- pwa-head -->';

const TAGS = `${MARKER}
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="KitabDostu" />
    <link rel="apple-touch-icon" href="/icon-1024.png" />
    <meta name="description" content="Oxuduğun kitabları izlə, sitat paylaş və Azərbaycanın kitabsevərlər icmasına qoşul." />`;

const html = await readFile(indexPath, 'utf8');

if (html.includes(MARKER)) {
  console.log('inject-pwa-head: artıq əlavə olunub, keçildi');
  process.exit(0);
}

if (!html.includes('</head>')) {
  // Failing loudly beats shipping a build that silently lost the tags: the
  // symptom otherwise appears weeks later as "the icon looks wrong on iPhone".
  console.error('inject-pwa-head: dist/index.html içində </head> tapılmadı — Expo şablonu dəyişib?');
  process.exit(1);
}

// `viewport-fit=cover` lets the app paint under the notch and the home
// indicator; without it a standalone iPhone launch shows white bars.
const withViewport = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);

await writeFile(indexPath, withViewport.replace('</head>', `${TAGS}\n  </head>`), 'utf8');

console.log('inject-pwa-head: manifest və iOS teqləri əlavə olundu');
