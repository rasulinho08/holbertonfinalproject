/**
 * Exports the mock dataset to `backend-guide/seed-data/*.json`.
 *
 * The backend repository seeds from those files, so the app looks identical
 * before and after the cutover from the mock API to the live one. Keeping the
 * export as a script rather than a hand-maintained copy means the two can never
 * drift: re-run this whenever `src/api/mock/seed.ts` or `catalog.json` changes.
 *
 *   node scripts/export-seed.mjs
 *
 * `seed.ts` is TypeScript with `@/` path aliases, and the repo has no runtime
 * TS loader — so rather than adding one, this transpiles the two modules it
 * needs with the TypeScript compiler already in `node_modules`, rewrites their
 * specifiers, and imports the result from a temp directory.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'backend-guide/seed-data');
const TMP = resolve(ROOT, 'node_modules/.seed-export');

function transpile(tsPath) {
  const source = readFileSync(resolve(ROOT, tsPath), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      // Types are erased; `import type` never reaches the output, so the
      // `@/types` alias needs no resolution at all.
      isolatedModules: true,
    },
  }).outputText;
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

writeFileSync(resolve(TMP, 'images.mjs'), transpile('src/lib/images.ts'));

const catalog = readFileSync(resolve(ROOT, 'src/api/mock/catalog.json'), 'utf8');
writeFileSync(resolve(TMP, 'catalog.mjs'), `export default ${catalog};`);

const seedJs = transpile('src/api/mock/seed.ts')
  .replace(/from ['"]@\/lib\/images['"]/g, "from './images.mjs'")
  .replace(/from ['"]\.\/catalog\.json['"]/g, "from './catalog.mjs'");
writeFileSync(resolve(TMP, 'seed.mjs'), seedJs);

const seed = await import(pathToFileURL(resolve(TMP, 'seed.mjs')).href);

/* --------------------------------- write ---------------------------------- */

mkdirSync(OUT, { recursive: true });

const write = (name, data) => {
  writeFileSync(resolve(OUT, `${name}.json`), JSON.stringify(data, null, 2));
  console.log(`  ${name}.json`.padEnd(30), Array.isArray(data) ? `${data.length} records` : '');
  return Array.isArray(data) ? data.length : 0;
};

console.log('Exporting seed data…\n');

const counts = {
  publishers: write('publishers', seed.publishers),
  authors: write('authors', seed.authors),
  books: write('books', seed.books),
  users: write('users', seed.users),
  shelves: write('shelves', seed.shelves),
  shelf_entries: write('shelf_entries', seed.shelfEntries),
  reviews: write('reviews', seed.reviews),
  quotes: write('quotes', seed.quotes),
  reading_sessions: write('reading_sessions', seed.readingSessions),
  book_lists: write('book_lists', seed.bookLists),
  buddy_reads: write('buddy_reads', seed.buddyReads),
  buddy_read_messages: write('buddy_read_messages', seed.buddyMessages),
  reports: write('reports', seed.reports),
  badges: write('badges', seed.BADGE_DEFS),
  quote_backgrounds: write('quote_backgrounds', seed.QUOTE_BACKGROUNDS),
};

rmSync(TMP, { recursive: true, force: true });

const withCovers = seed.books.filter((b) => b.coverUrl).length;
const withPhotos = seed.authors.filter((a) => a.photoUrl).length;

console.log(
  `\n${counts.books} books (${withCovers} with a cover), ` +
    `${counts.authors} authors (${withPhotos} with a photo).`,
);
console.log('Done.');
