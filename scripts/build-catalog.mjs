/**
 * Builds the book catalogue from Open Library.
 *
 * The app ships with a committed catalogue rather than calling Open Library at
 * runtime: the demo has to work offline, open instantly, and look identical on
 * every machine. This script is the only thing that talks to the network, and
 * it is run by hand when the catalogue needs refreshing:
 *
 *   node scripts/build-catalog.mjs                 # ~1000 books
 *   node scripts/build-catalog.mjs --target 300    # smaller, for a quick run
 *
 * Output: src/api/mock/catalog.json  (committed)
 *
 * Two sources feed the catalogue:
 *
 *  1. CURATED — the Azerbaijani shelf. Titles stay in Azerbaijani (this is an
 *     Azerbaijani app); we only ask Open Library for the cover of the original
 *     work, matched by its original-language title.
 *  2. HARVEST — everything else, pulled from `language:aze` / `language:tur`
 *     pools first (books that actually have an Azerbaijani or Turkish edition,
 *     so the catalogue is plausible for a Baku reader) and then from genre
 *     subjects to fill out the long tail.
 *
 * Only works with a cover image are kept, so no screen ever falls back to a
 * placeholder unless the CDN itself is down.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/api/mock/catalog.json');
const CACHE = resolve(ROOT, 'scripts/.ol-cache.json');

const argTarget = Number(process.argv[process.argv.indexOf('--target') + 1]);
const TARGET = Number.isFinite(argTarget) && argTarget > 0 ? argTarget : 1000;

const UA = 'KitabDostu/0.1 (student project; https://github.com/rasulinho08/holbertonfinalproject)';
const FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'author_key',
  'cover_i',
  'first_publish_year',
  'number_of_pages_median',
  'isbn',
  'language',
  'ratings_average',
  'ratings_count',
  'want_to_read_count',
  'subject',
  'first_sentence',
].join(',');

/* ------------------------------- utilities -------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
let cacheDirty = false;

async function getJson(url, { retries = 3 } = {}) {
  if (cache[url]) return cache[url];
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (res.status === 429 || res.status >= 500) throw new Error(`http ${res.status}`);
      if (!res.ok) return null;
      const json = await res.json();
      cache[url] = json;
      cacheDirty = true;
      return json;
    } catch (err) {
      if (attempt === retries) {
        console.warn(`  ! giving up on ${url.slice(0, 90)} — ${err.message}`);
        return null;
      }
      await sleep(800 * 2 ** attempt);
    }
  }
  return null;
}

function saveCache() {
  if (!cacheDirty) return;
  writeFileSync(CACHE, JSON.stringify(cache));
  cacheDirty = false;
}

/** Runs `worker` over `items` with a bounded number in flight. */
async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await worker(items[i], i);
      }
    }),
  );
  return out;
}

const normalize = (s) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/* ---------------------------- genre classification ------------------------ */

/**
 * Open Library subjects are free-form and noisy ("nyt:bestseller=2014-03-23"),
 * and nearly every story carries the subject "Fiction". A naive vote therefore
 * classifies the whole catalogue as `novel`, so needles are weighted: a term
 * that pins down a genre counts for 3, a merely suggestive one for 1. `novel`
 * only survives when nothing sharper outscores it.
 */
const GENRE_RULES = {
  mystery: [
    [3, ['detective', 'mystery', 'crime fiction', 'noir', 'whodunit']],
    [1, ['crime', 'thriller', 'suspense', 'murder', 'spy stories']],
  ],
  scifi: [
    [3, ['science fiction', 'dystopia', 'space opera', 'cyberpunk', 'time travel']],
    [1, ['apocalyp', 'robots', 'extraterrestrial', 'space flight']],
  ],
  fantasy: [
    [3, ['fantasy', 'sword and sorcery', 'dragons', 'wizards']],
    [1, ['magic', 'mythical', 'imaginary places', 'supernatural']],
  ],
  biography: [
    [3, ['biography', 'autobiograph', 'memoir']],
    [1, ['personal narrative', 'diaries', 'correspondence']],
  ],
  history: [
    [3, ['history', 'historical fiction', 'civilization']],
    [1, ['war', 'ancient', 'medieval', 'revolution', 'historiography']],
  ],
  poetry: [
    [3, ['poetry', 'poems', 'sonnet', 'ghazal', 'divan', 'verse drama']],
    [1, ['verse', 'lyric']],
  ],
  psychology: [
    [3, ['psychology', 'psychiatr', 'mental health', 'psychoanalysis']],
    [1, ['cognitive', 'behavior', 'emotions', 'consciousness']],
  ],
  philosophy: [
    [3, ['philosophy', 'metaphysic', 'existential', 'stoic']],
    [1, ['ethics', 'logic', 'aesthetics', 'moral']],
  ],
  business: [
    [3, ['business', 'economics', 'management', 'entrepreneur']],
    [1, ['finance', 'marketing', 'investing', 'leadership', 'commerce']],
  ],
  children: [
    [3, ['juvenile', "children's", 'picture book', 'young adult', 'fairy tale']],
    [1, ['children', 'nursery', 'bedtime']],
  ],
  science: [
    [3, ['physics', 'mathematic', 'astronomy', 'chemistry', 'evolution', 'popular science']],
    [1, ['science', 'biology', 'nature', 'technology', 'medicine']],
  ],
  selfHelp: [
    [3, ['self-help', 'self help', 'self-improvement', 'personal development']],
    [1, ['motivation', 'success', 'habits', 'productivity', 'happiness', 'self-realization']],
  ],
  classic: [
    [3, ['classic literature', 'classics', 'literature, modern']],
    [1, ['classic', 'canon', 'literary criticism']],
  ],
  novel: [
    [2, ['novel', 'domestic fiction', 'love stories', 'romance']],
    // "Fiction" is on almost every record — worth a nudge, never a verdict.
    [1, ['fiction', 'literature', 'short stories']],
  ],
};

function classifyGenres(subjects = [], fallbackHint = '') {
  const votes = new Map();
  const haystack = [...subjects.slice(0, 40), fallbackHint].map((s) => String(s).toLowerCase());

  for (const [genre, tiers] of Object.entries(GENRE_RULES)) {
    let score = 0;
    for (const [weight, needles] of tiers) {
      for (const line of haystack) {
        for (const needle of needles) {
          if (line.includes(needle)) score += weight;
        }
      }
    }
    if (score > 0) votes.set(genre, score);
  }

  const ranked = [...votes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([g]) => g);
  if (ranked.length === 0) return ['novel'];

  // Keep the runner-up only when it is a real signal, not a stray "Fiction".
  const top = ranked.slice(0, 1);
  const second = ranked[1];
  if (second && votes.get(second) >= 3) top.push(second);
  return top;
}

const LANG_MAP = { aze: 'az', tur: 'tr', rus: 'ru', eng: 'en' };

function pickLanguage(langs = [], preferred) {
  if (preferred && langs.includes(preferred)) return LANG_MAP[preferred];
  for (const code of ['aze', 'tur', 'rus', 'eng']) {
    if (langs.includes(code)) return LANG_MAP[code];
  }
  return 'en';
}

/* --------------------------------- search --------------------------------- */

async function search(query, { limit = 100, page = 1, sort = 'want_to_read' } = {}) {
  const url =
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}` +
    `&limit=${limit}&page=${page}&sort=${sort}&fields=${FIELDS}`;
  const json = await getJson(url);
  return json?.docs ?? [];
}

/**
 * The harvest plan.
 *
 * `lang` marks the pool a book came from, so the catalogue can honestly claim
 * "there is an Azerbaijani edition of this". `cap` bounds how many books one
 * query may contribute — without it the first two queries eat the whole target
 * and Explore ends up with a Poetry chip that filters to four books.
 *
 * Genre queries run first for exactly that reason; the language pools then fill
 * whatever is left over.
 */
const HARVEST = [
  // Genre spread first — every filter chip in Explore needs real results.
  { q: 'subject:detective_and_mystery_stories', pages: 2, cap: 60 },
  { q: 'subject:fantasy', pages: 2, cap: 60 },
  { q: 'subject:science_fiction', pages: 2, cap: 60 },
  { q: 'subject:biography', pages: 2, cap: 55 },
  { q: 'subject:history', pages: 2, cap: 55 },
  { q: 'subject:poetry', pages: 3, cap: 50 },
  { q: 'subject:psychology', pages: 2, cap: 50 },
  { q: 'subject:philosophy', pages: 2, cap: 50 },
  { q: 'subject:business', pages: 2, cap: 50 },
  { q: 'subject:self-help', pages: 3, cap: 50 },
  { q: 'subject:juvenile_literature', pages: 2, cap: 55 },
  { q: 'subject:science', pages: 2, cap: 50 },
  { q: 'subject:classic_literature', pages: 2, cap: 50 },
  { q: 'subject:romance', pages: 2, cap: 40 },

  // Books that actually have an Azerbaijani edition — the heart of the catalogue.
  { q: 'language:aze', pages: 8, lang: 'aze', cap: 180 },
  { q: 'language:aze AND subject:fiction', pages: 3, lang: 'aze', cap: 60 },
  { q: 'language:aze AND subject:history', pages: 2, lang: 'aze', cap: 40 },
  { q: 'language:aze AND subject:poetry', pages: 2, lang: 'aze', cap: 30 },

  // Turkish and Russian editions — the neighbouring markets, plausible in Baku.
  { q: 'language:tur', pages: 5, lang: 'tur', cap: 150 },
  { q: 'language:tur AND subject:fiction', pages: 2, lang: 'tur', cap: 60 },
  { q: 'language:rus AND subject:fiction', pages: 3, lang: 'rus', cap: 80 },
  { q: 'language:rus AND subject:classic_literature', pages: 2, lang: 'rus', cap: 40 },
];

/* -------------------------------- curated --------------------------------- */

/**
 * The Azerbaijani shelf. `[title, author, language, genres, year, pages, price, olQuery]`
 * — `olQuery` is the original-language title used to find the real cover; null
 * when Open Library has no record of the work (mostly Soviet-era local prints).
 */
const CURATED = [
  ['Əli və Nino', 'Qurban Səid', 'az', ['novel', 'classic'], 1937, 288, 14.9, 'Ali and Nino Kurban Said'],
  ['Beşmərtəbəli evin altıncı mərtəbəsi', 'Anar', 'az', ['novel'], 1981, 224, 11.5, null],
  ['Ağ liman', 'Anar', 'az', ['novel'], 1970, 176, 9.8, null],
  ['Mahmud və Məryəm', 'Elçin', 'az', ['novel', 'classic'], 1983, 208, 12.4, null],
  ['Ölüm hökmü', 'Elçin', 'az', ['novel'], 1989, 344, 15.2, null],
  ['Yarımçıq əlyazma', 'Kamal Abdulla', 'az', ['novel', 'history'], 2004, 264, 13.7, 'The Incomplete Manuscript Kamal Abdulla'],
  ['Sehrbazlar dərəsi', 'Kamal Abdulla', 'az', ['novel', 'fantasy'], 2006, 232, 12.9, null],
  ['Daş yuxular', 'Əkrəm Əylisli', 'az', ['novel'], 2012, 192, 11.0, 'Stone Dreams Akram Aylisli'],
  ['Qılınc və qələm', 'Məmməd Səid Ordubadi', 'az', ['history', 'classic'], 1948, 640, 19.9, null],
  ['Dumanlı Təbriz', 'Məmməd Səid Ordubadi', 'az', ['history', 'novel'], 1933, 512, 17.5, null],
  ['Kitabi-Dədə Qorqud', 'Xalq dastanı', 'az', ['classic', 'poetry'], 1815, 288, 16.0, 'The Book of Dede Korkut'],
  ['Xəmsə', 'Nizami Gəncəvi', 'az', ['poetry', 'classic'], 1200, 720, 24.5, 'Khamsa Nizami Ganjavi'],
  ['Leyli və Məcnun', 'Məhəmməd Füzuli', 'az', ['poetry', 'classic'], 1535, 208, 13.2, 'Leyli and Majnun Fuzuli'],
  ['Hophopnamə', 'Mirzə Ələkbər Sabir', 'az', ['poetry', 'classic'], 1912, 320, 12.0, null],
  ['Ölülər', 'Cəlil Məmmədquluzadə', 'az', ['classic', 'novel'], 1909, 144, 8.9, null],
  ['Səhər', 'Mehdi Hüseyn', 'az', ['novel', 'history'], 1950, 368, 14.0, null],
  ['Bakı-1501', 'Aqil Abbas', 'az', ['novel', 'history'], 2010, 256, 12.6, null],
  ['Şeyx Sənan', 'Hüseyn Cavid', 'az', ['poetry', 'classic'], 1914, 160, 9.5, null],
  ['Nar bağı', 'Əkrəm Əylisli', 'az', ['novel'], 1975, 184, 10.4, null],
  ['Böyük dayaq', 'Mirzə İbrahimov', 'az', ['novel'], 1957, 400, 15.8, null],

  ['1984', 'George Orwell', 'az', ['scifi', 'classic', 'novel'], 1949, 328, 13.5, '1984 George Orwell'],
  ['Heyvanıstan', 'George Orwell', 'az', ['classic', 'novel'], 1945, 144, 8.5, 'Animal Farm George Orwell'],
  ['Cinayət və cəza', 'Fyodor Dostoyevski', 'az', ['classic', 'psychology'], 1866, 576, 18.9, 'Crime and Punishment Dostoyevsky'],
  ['Karamazov qardaşları', 'Fyodor Dostoyevski', 'az', ['classic', 'philosophy'], 1880, 824, 24.0, 'The Brothers Karamazov'],
  ['Anna Karenina', 'Lev Tolstoy', 'az', ['classic', 'novel'], 1878, 864, 23.5, 'Anna Karenina Tolstoy'],
  ['Müharibə və sülh', 'Lev Tolstoy', 'ru', ['classic', 'history'], 1869, 1225, 29.9, 'War and Peace Tolstoy'],
  ['Kiçik Şahzadə', 'Antoine de Saint-Exupéry', 'az', ['children', 'classic'], 1943, 96, 7.9, 'The Little Prince Saint-Exupery'],
  ['Qürur və qərəz', 'Jane Austen', 'az', ['classic', 'novel'], 1813, 432, 14.2, 'Pride and Prejudice Jane Austen'],
  ['Yüz ilin tənhalığı', 'Gabriel García Márquez', 'az', ['novel', 'classic'], 1967, 448, 17.0, 'One Hundred Years of Solitude'],
  ['Çavdar tarlasında uçurumdan qoruyan', 'J. D. Salinger', 'az', ['novel', 'classic'], 1951, 240, 12.1, 'The Catcher in the Rye Salinger'],
  ['Böyük Getsbi', 'F. Scott Fitzgerald', 'en', ['classic', 'novel'], 1925, 180, 11.4, 'The Great Gatsby Fitzgerald'],
  ['Fahrenheit 451', 'Ray Bradbury', 'az', ['scifi', 'classic'], 1953, 208, 11.9, 'Fahrenheit 451 Bradbury'],
  ['Şəkər Portağalım', 'José Mauro de Vasconcelos', 'az', ['children', 'novel'], 1968, 184, 9.9, 'My Sweet Orange Tree Vasconcelos'],

  ['Üzüklərin Hökmdarı: Üzük Qardaşlığı', 'J. R. R. Tolkien', 'az', ['fantasy'], 1954, 576, 21.5, 'The Fellowship of the Ring Tolkien'],
  ['Hobbit', 'J. R. R. Tolkien', 'az', ['fantasy', 'children'], 1937, 320, 15.0, 'The Hobbit Tolkien'],
  ['Harri Potter və Fəlsəfə Daşı', 'J. K. Rowling', 'az', ['fantasy', 'children'], 1997, 336, 16.8, "Harry Potter and the Philosopher's Stone"],
  ['Dune', 'Frank Herbert', 'en', ['scifi'], 1965, 688, 22.9, 'Dune Frank Herbert'],
  ['Şerlok Holms: Baskervillərin iti', 'Arthur Conan Doyle', 'az', ['mystery', 'classic'], 1902, 256, 11.2, 'The Hound of the Baskervilles'],
  ['Şərq ekspresində qətl', 'Agatha Christie', 'az', ['mystery'], 1934, 288, 12.5, 'Murder on the Orient Express'],
  ['On kiçik hindu', 'Agatha Christie', 'az', ['mystery'], 1939, 272, 12.5, 'And Then There Were None Christie'],
  ['Kafka sahildə', 'Haruki Murakami', 'az', ['novel', 'fantasy'], 2002, 528, 19.4, 'Kafka on the Shore Murakami'],
  ['Norveç meşəsi', 'Haruki Murakami', 'az', ['novel'], 1987, 384, 16.2, 'Norwegian Wood Murakami'],
  ['Simyaçı', 'Paulo Coelho', 'az', ['novel', 'philosophy'], 1988, 208, 11.8, 'The Alchemist Paulo Coelho'],

  ['Kürk Mantolu Madonna', 'Sabahattin Ali', 'tr', ['novel', 'classic'], 1943, 176, 10.6, 'Madonna in a Fur Coat Sabahattin Ali'],
  ['İçimizdeki Şeytan', 'Sabahattin Ali', 'tr', ['novel'], 1940, 256, 11.3, null],
  ['Benim Adım Kırmızı', 'Orhan Pamuk', 'tr', ['novel', 'history'], 1998, 472, 18.0, 'My Name Is Red Orhan Pamuk'],
  ['Masumiyet Müzesi', 'Orhan Pamuk', 'tr', ['novel'], 2008, 592, 19.7, 'The Museum of Innocence Pamuk'],
  ['Serenad', 'Zülfü Livaneli', 'tr', ['novel', 'history'], 2011, 456, 16.9, 'Serenade for Nadia Livaneli'],

  ['Sapiens: Bəşəriyyətin qısa tarixi', 'Yuval Noah Harari', 'az', ['history', 'science'], 2011, 512, 22.0, 'Sapiens A Brief History of Humankind'],
  ['Homo Deus: Sabahın qısa tarixi', 'Yuval Noah Harari', 'az', ['science', 'philosophy'], 2015, 464, 21.0, 'Homo Deus Harari'],
  ['Atomik vərdişlər', 'James Clear', 'az', ['selfHelp', 'psychology'], 2018, 320, 17.9, 'Atomic Habits James Clear'],
  ['Sürətli və yavaş düşünmə', 'Daniel Kahneman', 'az', ['psychology', 'science'], 2011, 512, 20.5, 'Thinking Fast and Slow Kahneman'],
  ['İnsanın mənası axtarışı', 'Viktor Frankl', 'az', ['psychology', 'philosophy'], 1946, 200, 12.8, "Man's Search for Meaning Frankl"],
  ['Zəngin ata, kasıb ata', 'Robert Kiyosaki', 'az', ['business', 'selfHelp'], 1997, 336, 15.5, 'Rich Dad Poor Dad Kiyosaki'],
  ['Yaxşıdan əlaya', 'Jim Collins', 'en', ['business'], 2001, 320, 18.4, 'Good to Great Jim Collins'],
  ['Qısa cavablar böyük suallara', 'Stephen Hawking', 'az', ['science'], 2018, 240, 14.6, 'Brief Answers to the Big Questions'],
  ['Kainatın qısa tarixi', 'Stephen Hawking', 'az', ['science'], 1988, 256, 15.9, 'A Brief History of Time Hawking'],
  ['Steve Jobs', 'Walter Isaacson', 'az', ['biography', 'business'], 2011, 656, 24.9, 'Steve Jobs Walter Isaacson'],
];

/* ---------------------------------- run ----------------------------------- */

console.log(`Building catalogue — target ${TARGET} books\n`);

/** work key -> book record */
const byKey = new Map();
/** normalized "title|author" -> work key, so re-issues do not double up */
const seenTitles = new Set();

function addDoc(doc, poolLang) {
  if (!doc?.key || !doc.cover_i) return false;
  const author = doc.author_name?.[0];
  const authorKey = doc.author_key?.[0];
  if (!author || !authorKey) return false;
  if (byKey.has(doc.key)) return false;

  const dedupe = `${normalize(doc.title)}|${normalize(author)}`;
  if (seenTitles.has(dedupe)) return false;

  const pages = doc.number_of_pages_median;
  if (!pages || pages < 40 || pages > 2000) return false;

  seenTitles.add(dedupe);
  byKey.set(doc.key, {
    k: doc.key.replace('/works/', ''),
    t: doc.title,
    st: doc.subtitle ?? null,
    a: authorKey,
    an: author,
    c: doc.cover_i,
    y: doc.first_publish_year ?? null,
    p: pages,
    l: pickLanguage(doc.language ?? [], poolLang),
    g: classifyGenres(doc.subject),
    r: doc.ratings_average ?? null,
    rc: doc.ratings_count ?? 0,
    w: doc.want_to_read_count ?? 0,
    i: (doc.isbn ?? []).find((x) => x.length === 13) ?? doc.isbn?.[0] ?? null,
    fs: doc.first_sentence?.[0]?.slice(0, 300) ?? null,
    s: (doc.subject ?? []).filter((x) => !x.includes(':') && x.length < 40).slice(0, 6),
  });
  return true;
}

/* 1. curated Azerbaijani shelf ------------------------------------------------ */

console.log('1/4  Resolving covers for the curated Azerbaijani shelf…');
const curated = await mapLimit(CURATED, 5, async (row) => {
  const [title, authorName, language, genres, year, pages, price, olQuery] = row;
  let cover = null;
  let workKey = null;
  let authorKey = null;
  let firstSentence = null;

  if (olQuery) {
    const docs = await search(olQuery, { limit: 5, sort: 'want_to_read' });
    const hit = docs.find((d) => d.cover_i) ?? null;
    if (hit) {
      cover = hit.cover_i;
      workKey = hit.key?.replace('/works/', '') ?? null;
      authorKey = hit.author_key?.[0] ?? null;
      firstSentence = hit.first_sentence?.[0]?.slice(0, 300) ?? null;
    }
  }

  return {
    k: workKey ?? `az-${normalize(title).replace(/ /g, '-')}`,
    t: title,
    st: null,
    a: authorKey ?? `az-${normalize(authorName).replace(/ /g, '-')}`,
    an: authorName,
    c: cover,
    y: year,
    p: pages,
    l: language,
    g: genres,
    r: null,
    rc: 0,
    w: 0,
    i: null,
    fs: firstSentence,
    s: [],
    price,
    curated: true,
  };
});

curated.forEach((b) => {
  byKey.set(b.k, b);
  seenTitles.add(`${normalize(b.t)}|${normalize(b.an)}`);
});
const withCover = curated.filter((b) => b.c).length;
console.log(`     ${curated.length} curated books, ${withCover} matched to a real cover\n`);
saveCache();

/* 2. harvest ------------------------------------------------------------------ */

console.log('2/4  Harvesting from Open Library…');
outer: for (const plan of HARVEST) {
  const cap = plan.cap ?? Infinity;
  let added = 0;
  for (let page = 1; page <= plan.pages && added < cap; page++) {
    const docs = await search(plan.q, { limit: 100, page });
    if (docs.length === 0) break;
    for (const doc of docs) {
      if (added >= cap || byKey.size >= TARGET) break;
      if (addDoc(doc, plan.lang)) added++;
    }
    if (byKey.size >= TARGET) {
      console.log(`     ${plan.q.padEnd(44)} +${added}  (target reached)`);
      break outer;
    }
  }
  console.log(`     ${plan.q.padEnd(44)} +${added}  → ${byKey.size} total`);
  saveCache();
}

const books = [...byKey.values()].slice(0, Math.max(TARGET, CURATED.length));
console.log(`\n     ${books.length} books collected\n`);

/* 3. authors ------------------------------------------------------------------ */

console.log('3/4  Fetching author details…');
const authorKeys = [...new Set(books.map((b) => b.a).filter((k) => k.startsWith('OL')))];
const authorNameByKey = new Map(books.map((b) => [b.a, b.an]));

const authorDetails = await mapLimit(authorKeys, 6, async (key, i) => {
  if (i > 0 && i % 100 === 0) {
    console.log(`     ${i}/${authorKeys.length}`);
    saveCache();
  }
  const json = await getJson(`https://openlibrary.org/authors/${key}.json`);
  return {
    k: key,
    n: authorNameByKey.get(key) ?? json?.name ?? 'Unknown',
    ph: json?.photos?.find((p) => p > 0) ?? null,
    b: json?.birth_date ?? null,
    d: json?.death_date ?? null,
    bio: typeof json?.bio === 'string' ? json.bio : (json?.bio?.value ?? null),
  };
});
saveCache();

// Curated authors that Open Library did not resolve still need a record.
const localAuthors = [...new Set(books.filter((b) => !b.a.startsWith('OL')).map((b) => b.a))].map(
  (k) => ({ k, n: authorNameByKey.get(k) ?? k, ph: null, b: null, d: null, bio: null }),
);

const authors = [...authorDetails, ...localAuthors];
const withPhoto = authors.filter((a) => a.ph).length;
console.log(`     ${authors.length} authors, ${withPhoto} with a photo\n`);

/* 4. write -------------------------------------------------------------------- */

console.log('4/4  Writing catalogue…');
mkdirSync(dirname(OUT), { recursive: true });

const payload = {
  source: 'openlibrary.org',
  license: 'Open Library data is public domain (CC0); cover images are served from covers.openlibrary.org',
  books,
  authors,
};

writeFileSync(OUT, JSON.stringify(payload));
saveCache();

const kb = (JSON.stringify(payload).length / 1024).toFixed(0);
const langCounts = books.reduce((acc, b) => ({ ...acc, [b.l]: (acc[b.l] ?? 0) + 1 }), {});
const genreCounts = books
  .flatMap((b) => b.g)
  .reduce((acc, g) => ({ ...acc, [g]: (acc[g] ?? 0) + 1 }), {});

console.log(`     ${OUT.replace(ROOT, '.')}  (${kb} KB)`);
console.log(`     books ${books.length} · authors ${authors.length} · covers ${books.filter((b) => b.c).length}`);
console.log(`     languages ${JSON.stringify(langCounts)}`);
console.log(
  `     genres ${JSON.stringify(
    Object.fromEntries(Object.entries(genreCounts).sort((a, b) => b[1] - a[1])),
  )}`,
);
console.log('\nDone.');
