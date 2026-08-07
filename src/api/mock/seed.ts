import type {
  Author,
  Badge,
  Book,
  BookLanguage,
  BuddyRead,
  BuddyMessage,
  GenreSlug,
  Publisher,
  Quote,
  ReadingSession,
  Report,
  Review,
  User,
  UserSummary,
} from '@/types';
import { authorPhotoUrl, bookCoverUrl, generatedAvatarUrl } from '@/lib/images';
import catalog from './catalog.json';

/**
 * Seed dataset for the mock API.
 *
 * The catalogue itself — 1000 books, 600+ authors, real cover art — comes from
 * `catalog.json`, harvested from Open Library by `scripts/build-catalog.mjs`.
 * Open Library knows nothing about prices, stock, shelves or Azerbaijani
 * descriptions, so everything commercial and everything social is generated
 * here from a fixed PRNG seed: the demo looks identical on every machine and
 * every reload, which matters when the sprint review is a live walkthrough.
 *
 * `backend-guide/seed-data/` documents the same shapes so the real backend can
 * seed itself identically.
 */

/* ------------------------------ prng helpers ------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260810);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)];
const between = (min: number, max: number) => min + rnd() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));

/** Stable hash so a given book always lands on the same publisher, price band… */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fixed "now" anchor so relative dates stay stable within a session. */
const NOW = Date.now();
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW - days * DAY).toISOString();
const daysAhead = (days: number) => new Date(NOW + days * DAY).toISOString();

/* ------------------------------ catalogue shape --------------------------- */

interface CatalogBook {
  k: string;
  t: string;
  st: string | null;
  a: string;
  an: string;
  c: number | null;
  y: number | null;
  p: number;
  l: string;
  g: string[];
  r: number | null;
  rc: number;
  w: number;
  i: string | null;
  fs: string | null;
  s: string[];
  price?: number;
  curated?: boolean;
}

interface CatalogAuthor {
  k: string;
  n: string;
  ph: number | null;
  b: string | null;
  d: string | null;
  bio: string | null;
}

const catalogBooks = catalog.books as CatalogBook[];
const catalogAuthors = catalog.authors as CatalogAuthor[];

/* ------------------------------- publishers ------------------------------- */

const PUBLISHER_NAMES = [
  ['Qanun Nəşriyyatı', 'Bakı'],
  ['TEAS Press', 'Bakı'],
  ['Alatoran Yayınları', 'Bakı'],
  ['Parlaq İmzalar', 'Bakı'],
  ['Hədəf Nəşrləri', 'Bakı'],
  ['Şərq-Qərb', 'Bakı'],
  ['Altun Kitab', 'Bakı'],
  ['Libraff Nəşriyyat', 'Bakı'],
  ['Teas Press Uşaq', 'Bakı'],
  ['Elm və Təhsil', 'Bakı'],
] as const;

export const publishers: Publisher[] = PUBLISHER_NAMES.map(([name, city], i) => ({
  id: `pub_${i + 1}`,
  name,
  slug: name
    .toLowerCase()
    .replace(/[^a-zəöüçşğı0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  logoUrl: null,
  city,
}));

/* --------------------------- azerbaijani helpers -------------------------- */

const GENRE_LABEL_AZ: Record<GenreSlug, string> = {
  novel: 'roman',
  mystery: 'detektiv',
  scifi: 'elmi fantastika',
  fantasy: 'fantaziya',
  history: 'tarixi',
  biography: 'bioqrafiya',
  poetry: 'poeziya',
  psychology: 'psixologiya',
  philosophy: 'fəlsəfə',
  business: 'biznes',
  children: 'uşaq ədəbiyyatı',
  classic: 'klassik',
  science: 'elmi-populyar',
  selfHelp: 'şəxsi inkişaf',
};

/**
 * Azerbaijani ordinal suffix for a year — "1937" → "1937-ci".
 *
 * The suffix follows the vowel harmony of the number as it is *spoken*, so it
 * is driven by the last non-zero group rather than by the digit alone
 * ("doqquzuncu" → -cu, but "iyirminci" → -ci).
 */
function yearOrdinal(year: number): string {
  const ones = year % 10;
  const tens = Math.floor(year / 10) % 10;

  const BY_ONES: Record<number, string> = {
    1: 'ci',
    2: 'ci',
    3: 'cü',
    4: 'cü',
    5: 'ci',
    6: 'cı',
    7: 'ci',
    8: 'ci',
    9: 'cu',
  };
  const BY_TENS: Record<number, string> = {
    1: 'cu',
    2: 'ci',
    3: 'cu',
    4: 'cı',
    5: 'ci',
    6: 'cı',
    7: 'ci',
    8: 'ci',
    9: 'cı',
  };

  if (ones !== 0) return `${year}-${BY_ONES[ones]}`;
  if (tens !== 0) return `${year}-${BY_TENS[tens]}`;
  // …00 — "yüzüncü" if there are hundreds, otherwise "mininci".
  return `${year}-${Math.floor(year / 100) % 10 !== 0 ? 'cü' : 'ci'}`;
}

/** Rounds a raw count to a readable "1.4 min" / "820" for prose. */
function approxCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')} min`;
  return String(n);
}

/**
 * Builds the Azerbaijani blurb.
 *
 * Open Library descriptions are English and often missing, and a rotating set
 * of five generic paragraphs is what made the old catalogue feel fake. So the
 * blurb is assembled from facts we actually have — author, year, genre, length,
 * how many readers shelved it — which reads specifically because it *is*
 * specific.
 */
function buildDescription(book: CatalogBook, genres: GenreSlug[]): string {
  const h = hash(book.k);
  const genreLabel = GENRE_LABEL_AZ[genres[0]] ?? 'ədəbi';
  const secondGenre = genres[1] ? GENRE_LABEL_AZ[genres[1]] : null;
  const year = book.y;
  const parts: string[] = [];

  const openers = [
    year
      ? `${book.an} imzalı bu ${genreLabel} əsəri ilk dəfə ${yearOrdinal(year)} ildə işıq üzü görüb.`
      : `${book.an} imzalı ${genreLabel} əsəri.`,
    year
      ? `${yearOrdinal(year)} ildə nəşr olunmuş ${genreLabel} əsəri, ${book.an} yaradıcılığından.`
      : `${genreLabel.charAt(0).toUpperCase() + genreLabel.slice(1)} janrında əsər — müəllifi ${book.an}.`,
    year
      ? `${book.an}-in ${yearOrdinal(year)} ildə qələmə aldığı ${genreLabel} əsər.`
      : `${book.an}-in ${genreLabel} əsəri.`,
  ];
  parts.push(openers[h % openers.length]);

  const lengthNotes = [
    `${book.p} səhifəlik mətn orta oxu sürəti ilə təxminən ${Math.max(1, Math.round(book.p / 45))} saata başa gəlir.`,
    `Kitab ${book.p} səhifədən ibarətdir.`,
    `${book.p} səhifə — nə bir gecəlik, nə də aylarla uzanan bir oxu.`,
  ];
  parts.push(lengthNotes[(h >> 3) % lengthNotes.length]);

  if (secondGenre) {
    parts.push(`Janr baxımından ${genreLabel} və ${secondGenre} arasında dayanır.`);
  }

  if (book.w > 200) {
    parts.push(
      `Open Library oxucularından ${approxCount(book.w)} nəfər bu kitabı oxu siyahısına salıb.`,
    );
  }

  if (book.fs) {
    parts.push(`İlk cümləsi belə başlayır: «${book.fs.replace(/\s+/g, ' ').trim()}»`);
  }

  return parts.join(' ');
}

/** Author bio in Azerbaijani, built from the dates and output we know about. */
function buildAuthorBio(author: CatalogAuthor, bookCount: number): string {
  const lifespan =
    author.b && author.d
      ? `${author.b} — ${author.d}`
      : author.b
        ? `${author.b}-də anadan olub`
        : null;

  const parts: string[] = [];
  if (lifespan) parts.push(`${author.n} (${lifespan}).`);
  else parts.push(`${author.n}.`);

  parts.push(
    bookCount > 1
      ? `Kataloqumuzda ${bookCount} kitabı var.`
      : 'Kataloqumuzda bir kitabı təmsil olunub.',
  );

  if (author.bio) {
    // Open Library bios are English and often long; a trimmed excerpt is kept
    // as a clearly-marked quotation rather than passed off as our own copy.
    const clean = author.bio
      .replace(/\r?\n+/g, ' ')
      .replace(/\(\[[^\]]*\]\([^)]*\)\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean.length > 40) {
      parts.push(`Open Library-dən: «${clean.slice(0, 240)}${clean.length > 240 ? '…' : ''}»`);
    }
  }

  return parts.join(' ');
}

/* --------------------------------- authors -------------------------------- */

const bookCountByAuthorKey = catalogBooks.reduce<Record<string, number>>((acc, b) => {
  acc[b.a] = (acc[b.a] ?? 0) + 1;
  return acc;
}, {});

export const authors: Author[] = catalogAuthors.map((a, i) => {
  const bookCount = bookCountByAuthorKey[a.k] ?? 0;
  const h = hash(a.k);
  return {
    id: `au_${i + 1}`,
    name: a.n,
    slug: a.n
      .toLowerCase()
      .replace(/[^a-zəöüçşğı0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    bio: buildAuthorBio(a, bookCount),
    photoUrl: authorPhotoUrl(a.ph, 'M'),
    bookCount,
    // Popular authors carry more books, so followers track output — a lone
    // translator should not out-rank Tolkien.
    followersCount: 120 + (h % 4000) + bookCount * (300 + (h % 700)),
    isFollowing: false,
  } satisfies Author;
});

const authorIdByKey = new Map(catalogAuthors.map((a, i) => [a.k, `au_${i + 1}`]));

/* --------------------------------- books ---------------------------------- */

const VALID_GENRES = new Set<string>(Object.keys(GENRE_LABEL_AZ));
const VALID_LANGS = new Set<string>(['az', 'en', 'tr', 'ru']);

export const books: Book[] = catalogBooks.map((b, i) => {
  const h = hash(b.k);
  const genres = (b.g.filter((g) => VALID_GENRES.has(g)) as GenreSlug[]).slice(0, 2);
  if (genres.length === 0) genres.push('novel');

  const publisher = publishers[h % publishers.length];
  const language = (VALID_LANGS.has(b.l) ? b.l : 'az') as BookLanguage;

  // Open Library ratings are 0–5 over a thin sample; the app's scale is 1–10.
  // Books with no rating at all get one derived from how many readers shelved
  // it, which keeps the sort order meaningful instead of dumping them at zero.
  const ratingAverage = b.r
    ? Math.round(Math.min(10, Math.max(1, b.r * 2)) * 10) / 10
    : Math.round((6.4 + ((h >> 7) % 26) / 10) * 10) / 10;
  const ratingCount = b.rc > 0 ? b.rc : 20 + (h % 900) + Math.floor(b.w / 4);

  // Price tracks length with a per-book jitter, so the catalogue has a spread
  // rather than 1000 books at 14.90.
  const basePrice = b.price ?? 6.5 + (b.p / 100) * 2.4 + ((h >> 11) % 60) / 10;
  const price = Math.round(basePrice * 100) / 100;
  const discounted = h % 100 < 22;

  return {
    id: `b_${i + 1}`,
    title: b.t,
    subtitle: b.st,
    authorId: authorIdByKey.get(b.a) ?? 'au_1',
    authorName: b.an,
    publisherId: publisher.id,
    publisherName: publisher.name,
    isbn: b.i ?? `978${String(9952000000 + i * 7919).padStart(10, '0')}`,
    language,
    genres,
    coverUrl: bookCoverUrl(b.c, 'M'),
    description: buildDescription(b, genres),
    pageCount: b.p,
    publishedYear: b.y ?? 2000,
    price,
    oldPrice: discounted ? Math.round(price * 1.25 * 100) / 100 : null,
    stock: h % 100 < 7 ? 0 : 3 + (h % 78),
    ratingAverage,
    ratingCount,
    reviewsCount: Math.floor(ratingCount / (5 + (h % 10))),
    quotesCount: h % 180,
    createdAt: daysAgo(5 + (h % 900)),
  } satisfies Book;
});

const bookById = new Map(books.map((b) => [b.id, b]));

/** The most-shelved books — used to seed reviews, quotes and buddy reads. */
const popularBooks = [...books]
  .sort((a, b) => b.ratingCount - a.ratingCount)
  .slice(0, 220);

/* --------------------------------- users ---------------------------------- */

const USER_ROWS: [name: string, username: string, bio: string][] = [
  ['Leyla Məmmədova', 'leyla', 'Kitab oxumaq — başqasının həyatını yaşamaqdır. Klassika və detektiv sevirəm.'],
  ['Rəşad Quliyev', 'reshad', 'Elmi-populyar ədəbiyyat həvəskarı. İldə 40 kitab hədəfim var.'],
  ['Nigar Əliyeva', 'nigar', 'Poeziya və Azərbaycan ədəbiyyatı. Sitat toplamağı sevirəm.'],
  ['Tural Həsənov', 'tural', 'Fantastika, Tolkien və Herbert. Bakı, 25 yaş.'],
  ['Aysel Kərimli', 'aysel', 'Psixologiya və şəxsi inkişaf kitabları. Hər səhər 30 səhifə.'],
  ['Elvin Bayramov', 'elvin', 'Tarix və bioqrafiya. Kitab rəfim evimin ən vacib mebelidir.'],
  ['Günel Səfərova', 'gunel', 'Murakami oxucusuyam. Kitab klubunun təşkilatçısı.'],
  ['Kamran Nəbiyev', 'kamran', 'Biznes ədəbiyyatı və podcast həvəskarı.'],
  ['Səbinə Vəliyeva', 'sebine', 'Uşaq ədəbiyyatı müəllimiyəm. Klassikaları yenidən oxuyuram.'],
  ['Orxan Rzayev', 'orxan', 'Fəlsəfə, Dostoyevski, uzun gecələr.'],
  ['Ləman Abbasova', 'leman', 'Şeir yazıram, roman oxuyuram.'],
  ['Fərid Musayev', 'ferid', 'Detektiv janrının fanatı. Agatha Christie kolleksiyaçısı.'],
  ['Aynur Hüseynova', 'aynur', 'Türk ədəbiyyatı və Sabahattin Ali.'],
  ['Vüqar Salmanov', 'vuqar', 'Elm, kosmos, Hawking.'],
];

const GENRE_POOL = Object.keys(GENRE_LABEL_AZ) as GenreSlug[];

function makeUser(row: (typeof USER_ROWS)[number], index: number): User {
  const [name, username, bio] = row;
  const booksRead = intBetween(4, 96);
  const favoriteGenres = Array.from(
    new Set(Array.from({ length: intBetween(3, 5) }, () => pick(GENRE_POOL))),
  );

  const genreDistribution = favoriteGenres.map((genre) => ({
    genre,
    count: intBetween(2, Math.max(3, Math.floor(booksRead / 2))),
  }));

  const streakDays = intBetween(0, 128);

  return {
    id: `u_${index + 1}`,
    username,
    name,
    email: `${username}@kitabdostu.az`,
    avatarUrl: generatedAvatarUrl(username),
    bio,
    role: 'user',
    createdAt: daysAgo(intBetween(30, 1200)),
    followersCount: intBetween(3, 1400),
    followingCount: intBetween(3, 380),
    isFollowing: index > 0 && rnd() < 0.45,
    stats: {
      booksRead,
      pagesRead: booksRead * intBetween(180, 420),
      reviewsCount: intBetween(0, 40),
      quotesCount: intBetween(0, 70),
      streakDays,
      longestStreak: streakDays + intBetween(0, 90),
      readToday: rnd() < 0.6,
      genreDistribution,
      weeklyPages: Array.from({ length: 7 }, () => (rnd() < 0.18 ? 0 : intBetween(8, 95))),
    },
    goal: {
      year: new Date(NOW).getFullYear(),
      target: pick([12, 20, 24, 30, 36, 50]),
      completed: Math.min(booksRead, intBetween(2, 30)),
    },
    favoriteGenres,
    favoriteAuthorIds: Array.from({ length: intBetween(1, 4) }, () => pick(authors).id),
    walletBalance: Math.round(between(0, 60) * 100) / 100,
    twoFactorEnabled: false,
  };
}

export const users: User[] = USER_ROWS.map(makeUser);

/** The signed-in demo account. Mock auth always resolves to this user. */
export const CURRENT_USER_ID = users[0].id;

export const toSummary = (u: User): UserSummary => ({
  id: u.id,
  username: u.username,
  name: u.name,
  avatarUrl: u.avatarUrl,
});

/* --------------------------- shelves & progress --------------------------- */

export interface SeedShelfEntry {
  id: string;
  userId: string;
  bookId: string;
  shelfId: string;
  status: 'reading' | 'read' | 'want_to_read' | 'dnf';
  progressPage: number;
  startedAt: string | null;
  finishedAt: string | null;
  addedAt: string;
}

export const DEFAULT_SHELF_DEFS = [
  { status: 'reading' as const, key: 'reading' },
  { status: 'read' as const, key: 'read' },
  { status: 'want_to_read' as const, key: 'want_to_read' },
  { status: 'dnf' as const, key: 'dnf' },
];

export interface SeedShelf {
  id: string;
  userId: string;
  status: 'reading' | 'read' | 'want_to_read' | 'dnf' | null;
  name: string;
  isDefault: boolean;
}

const shelves: SeedShelf[] = [];
const shelfEntries: SeedShelfEntry[] = [];

users.forEach((user, ui) => {
  DEFAULT_SHELF_DEFS.forEach((def, si) => {
    shelves.push({
      id: `sh_${ui + 1}_${si + 1}`,
      userId: user.id,
      status: def.status,
      name: def.key,
      isDefault: true,
    });
  });
});

// Two custom shelves for the demo user, per the spec's examples.
shelves.push(
  { id: 'sh_1_c1', userId: CURRENT_USER_ID, status: null, name: 'Klassiklər', isDefault: false },
  { id: 'sh_1_c2', userId: CURRENT_USER_ID, status: null, name: 'Yay oxunuşu', isDefault: false },
);

let entryId = 1;
users.forEach((user) => {
  const userShelves = shelves.filter((s) => s.userId === user.id && s.isDefault);
  const shelfByStatus = new Map(userShelves.map((s) => [s.status, s]));
  const owned = new Set<string>();
  const count = user.id === CURRENT_USER_ID ? 26 : intBetween(8, 22);

  for (let i = 0; i < count; i++) {
    // Drawn from the popular slice so shelves show books a reader would
    // plausibly own, not four random Ukrainian textbooks.
    const book = pick(popularBooks);
    if (owned.has(book.id)) continue;
    owned.add(book.id);

    const roll = rnd();
    const status =
      roll < 0.14 ? 'reading' : roll < 0.62 ? 'read' : roll < 0.9 ? 'want_to_read' : 'dnf';
    const shelf = shelfByStatus.get(status)!;
    const added = intBetween(1, 400);

    shelfEntries.push({
      id: `se_${entryId++}`,
      userId: user.id,
      bookId: book.id,
      shelfId: shelf.id,
      status,
      progressPage:
        status === 'read'
          ? book.pageCount
          : status === 'reading'
            ? intBetween(12, Math.max(20, book.pageCount - 20))
            : status === 'dnf'
              ? intBetween(10, Math.floor(book.pageCount / 2))
              : 0,
      startedAt: status === 'want_to_read' ? null : daysAgo(added),
      finishedAt: status === 'read' ? daysAgo(Math.max(1, added - intBetween(3, 40))) : null,
      addedAt: daysAgo(added),
    });
  }
});

// Guarantee the demo user has something on the "currently reading" shelf, so
// the Home screen never opens on an empty state during a demo.
if (!shelfEntries.some((e) => e.userId === CURRENT_USER_ID && e.status === 'reading')) {
  const shelf = shelves.find((s) => s.userId === CURRENT_USER_ID && s.status === 'reading')!;
  shelfEntries.push({
    id: `se_${entryId++}`,
    userId: CURRENT_USER_ID,
    bookId: popularBooks[0].id,
    shelfId: shelf.id,
    status: 'reading',
    progressPage: 96,
    startedAt: daysAgo(9),
    finishedAt: null,
    addedAt: daysAgo(9),
  });
}

export { shelves, shelfEntries };

/* -------------------------------- reviews --------------------------------- */

const REVIEW_BODIES = [
  'Uzun müddətdir belə təsirli bir kitab oxumamışdım. Personajların dialoqları çox təbii səslənir, final isə gözlənilməz idi.',
  'Başlanğıcı bir az ağır gəldi, amma 100-cü səhifədən sonra əlimdən yerə qoya bilmədim. Tövsiyə edirəm.',
  'Tərcümə keyfiyyəti yaxşıdır, dil axıcıdır. Mövzu isə bu gün üçün də aktualdır.',
  'Müəllifin üslubu çox səmimidir. Kitabı bitirdikdən sonra bir neçə gün düşündüm.',
  'Gözləntilərimi tam qarşılamadı. Ideya güclü idi, amma orta hissə lazımsız uzadılmışdı.',
  'Klassik olmasına baxmayaraq, heç köhnəlməyib. Hər kəsə oxumağı məsləhət görürəm.',
  'Kitabın atmosferi möhtəşəmdir. Oxuyarkən özünüzü hadisələrin içində hiss edirsiniz.',
  'İkinci dəfə oxuyuram və hər dəfə yeni detal tapıram. Rəfimin ən qiymətli kitablarından biridir.',
  'Süjet gözəldir, amma redaktə zəifdir — bir neçə yerdə təkrarlar var.',
  'Bu janrda oxuduğum ən yaxşı əsərlərdən biri. Müəllifin digər kitablarını da sifariş etdim.',
  'Orta səviyyəli. Bir dəfə oxumaq olar, amma rəfdə saxlamağa dəyməz.',
  'Finalı ilk oxunuşda anlamadım, ikinci dəfə hər şey yerinə oturdu. Ustalıqla qurulub.',
];

export const reviews: Review[] = [];
let reviewId = 1;

// Only the popular slice gets reviews: 1000 books × 5 reviews would be 5000
// rows persisted to AsyncStorage on every shelf edit, and an unknown book with
// four glowing reviews reads as fake anyway.
popularBooks.forEach((book) => {
  const n = intBetween(1, 6);
  for (let i = 0; i < n; i++) {
    const user = pick(users);
    reviews.push({
      id: `r_${reviewId++}`,
      bookId: book.id,
      user: toSummary(user),
      rating: intBetween(4, 10),
      body: pick(REVIEW_BODIES),
      isSpoiler: rnd() < 0.16,
      photos: [],
      likesCount: intBetween(0, 240),
      commentsCount: intBetween(0, 18),
      isLiked: false,
      createdAt: daysAgo(intBetween(1, 500)),
    });
  }
});

/* --------------------------------- quotes --------------------------------- */

/** Background presets for the Instagram-story style quote cards. */
export const QUOTE_BACKGROUNDS = [
  { id: 'paper', colors: ['#F5EFE3', '#E7DACA'], text: '#2A231C' },
  { id: 'ember', colors: ['#C2410C', '#F97316'], text: '#FFF7ED' },
  { id: 'ink', colors: ['#16202E', '#3A4A61'], text: '#EEF3F9' },
  { id: 'sea', colors: ['#0F766E', '#2DD4BF'], text: '#04211F' },
  { id: 'plum', colors: ['#4C1D95', '#A78BFA'], text: '#F5F3FF' },
  { id: 'rose', colors: ['#9F1239', '#FB7185'], text: '#FFF1F2' },
  { id: 'moss', colors: ['#365314', '#A3E635'], text: '#F7FEE7' },
  { id: 'dusk', colors: ['#1E3A8A', '#60A5FA'], text: '#EFF6FF' },
] as const;

const QUOTE_TEXTS = [
  'İnsan yalnız ürəyi ilə yaxşı görür. Əsas olan gözlə görünməzdir.',
  'Kim keçmişi idarə edirsə, gələcəyi də idarə edir; kim indini idarə edirsə, keçmişi idarə edir.',
  'Hər kəs dünyanı dəyişdirmək istəyir, amma heç kim özünü dəyişdirmək istəmir.',
  'Kitablar dostların ən sakitidir; onlar heç vaxt üzünü çevirmir.',
  'Bir insanı tanımaq istəyirsənsə, oxuduğu kitablara bax.',
  'Ən uzun yol da ilk addımla başlayır, ən qalın kitab da ilk səhifə ilə.',
  'Sevgi baxışlarla başlayır, sözlə davam edir, susmaqla yaşayır.',
  'Vaxt heç nəyi sağaltmır; sadəcə yaddaşı yumşaldır.',
  'Xoşbəxtlik — arzuladığını almaq deyil, sahib olduğunu qiymətləndirməkdir.',
  'Qorxu ağlın ən yaxşı müəllimidir, amma ən pis məsləhətçisidir.',
  'Hər gecənin bir səhəri var, amma hər səhər eyni adamı oyatmır.',
  'Susmaq bəzən ən uca səslə deyilən cümlədir.',
  'Yol getdiyin qədər uzundur, dayandığın yerdə isə bitir.',
  'Kitab oxumaq başqasının ağlı ilə düşünməkdir; düşünmək isə öz ağlınla oxumaqdır.',
  'Cəsarət qorxunun olmaması deyil, qorxuya baxmayaraq addım atmaqdır.',
  'İnsanın ən böyük düşməni öz vərdişləridir.',
  'Doğru sual tapmaq, düzgün cavabdan qat-qat çətindir.',
  'Balaca işləri böyük sevgi ilə görmək lazımdır.',
  'Həyat geriyə baxaraq anlaşılır, amma irəli baxaraq yaşanılır.',
  'Nə qədər az şeyə ehtiyacın varsa, o qədər azadsan.',
  'Ümid — yuxusuz gecələrin yeganə yoldaşıdır.',
  'Yaddaş — insanın özü ilə apardığı yeganə vətəndir.',
  'Bir sözün ağırlığını ancaq onu deməyi bacarmayan bilir.',
  'Oxumaq ruhun idmanıdır; ondan imtina edən yavaş-yavaş kiçilir.',
  'Dünyanı dəyişən böyük ideyalar həmişə kiçik otaqlarda doğulub.',
  'Sabahı düşünməyən adam bu günü də tam yaşaya bilmir.',
];

export const quotes: Quote[] = QUOTE_TEXTS.map((text, i) => {
  const book = popularBooks[(i * 7) % popularBooks.length];
  const user = users[(i * 3) % users.length];
  return {
    id: `q_${i + 1}`,
    bookId: book.id,
    book: {
      id: book.id,
      title: book.title,
      authorName: book.authorName,
      coverUrl: book.coverUrl,
    },
    user: toSummary(user),
    text,
    page: intBetween(11, Math.max(20, book.pageCount - 5)),
    background: QUOTE_BACKGROUNDS[i % QUOTE_BACKGROUNDS.length].id,
    likesCount: intBetween(3, 1800),
    commentsCount: intBetween(0, 64),
    isLiked: rnd() < 0.2,
    createdAt: daysAgo(intBetween(0, 120)),
  } satisfies Quote;
}).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

/* --------------------------------- badges --------------------------------- */

export const BADGE_DEFS: Omit<Badge, 'earned' | 'earnedAt' | 'progress'>[] = [
  { id: 'bd_1', slug: 'first_10', name: 'İlk 10 kitab', description: '10 kitab oxu', icon: '📚', target: 10 },
  { id: 'bd_2', slug: 'quote_master', name: 'Sitat ustası', description: '25 sitat paylaş', icon: '✍️', target: 25 },
  { id: 'bd_3', slug: 'genre_explorer', name: 'Janr kəşfiyyatçısı', description: '6 fərqli janrda kitab oxu', icon: '🧭', target: 6 },
  { id: 'bd_4', slug: 'book_collector', name: 'Kolleksiyaçı', description: 'Rəflərinə 50 kitab əlavə et', icon: '🗂️', target: 50 },
  { id: 'bd_5', slug: 'reading_marathon', name: 'Oxu marafonu', description: 'Bir həftədə 500 səhifə oxu', icon: '🏃', target: 500 },
  { id: 'bd_6', slug: 'bookworm', name: 'Kitab qurdu', description: '30 gün ardıcıl oxu', icon: '🐛', target: 30 },
  { id: 'bd_7', slug: 'critic', name: 'Tənqidçi', description: '20 rəy yaz', icon: '⭐', target: 20 },
  { id: 'bd_8', slug: 'night_owl', name: 'Gecə quşu', description: 'Gecə saat 00:00-dan sonra 10 dəfə oxu', icon: '🦉', target: 10 },
  { id: 'bd_9', slug: 'social_reader', name: 'Sosial oxucu', description: '25 nəfəri izlə', icon: '🤝', target: 25 },
  { id: 'bd_10', slug: 'goal_crusher', name: 'Hədəf ovçusu', description: 'İllik oxu hədəfini tamamla', icon: '🎯', target: 1 },
];

/* ------------------------------ buddy reads ------------------------------- */

const buddyBookA = popularBooks[3];
const buddyBookB = popularBooks[11];

export const buddyReads: BuddyRead[] = [
  {
    id: 'br_1',
    name: 'Birlikdə oxuyuruq',
    bookId: buddyBookA.id,
    book: {
      id: buddyBookA.id,
      title: buddyBookA.title,
      authorName: buddyBookA.authorName,
      coverUrl: buddyBookA.coverUrl,
      pageCount: buddyBookA.pageCount,
    },
    ownerId: CURRENT_USER_ID,
    members: [
      { user: toSummary(users[0]), progressPage: Math.floor(buddyBookA.pageCount * 0.4) },
      { user: toSummary(users[9]), progressPage: Math.floor(buddyBookA.pageCount * 0.6) },
      { user: toSummary(users[2]), progressPage: Math.floor(buddyBookA.pageCount * 0.2) },
    ],
    targetDate: daysAhead(21),
    messagesCount: 4,
    createdAt: daysAgo(12),
  },
  {
    id: 'br_2',
    name: 'Yay klassikləri',
    bookId: buddyBookB.id,
    book: {
      id: buddyBookB.id,
      title: buddyBookB.title,
      authorName: buddyBookB.authorName,
      coverUrl: buddyBookB.coverUrl,
      pageCount: buddyBookB.pageCount,
    },
    ownerId: users[6].id,
    members: [
      { user: toSummary(users[6]), progressPage: Math.floor(buddyBookB.pageCount * 0.5) },
      { user: toSummary(users[4]), progressPage: Math.floor(buddyBookB.pageCount * 0.3) },
    ],
    targetDate: daysAhead(40),
    messagesCount: 2,
    createdAt: daysAgo(5),
  },
];

export const buddyMessages: BuddyMessage[] = [
  {
    id: 'bm_1',
    buddyReadId: 'br_1',
    user: toSummary(users[9]),
    body: 'İlk hissəni bitirdim, gözlədiyimdən sürətli getdi. 2-ci hissəyə keçirəm.',
    chapter: 2,
    createdAt: daysAgo(9),
  },
  {
    id: 'bm_2',
    buddyReadId: 'br_1',
    user: toSummary(users[0]),
    body: 'Mən hələ 1-ci hissədəyəm, spoyler yazmayın 🙂',
    chapter: 1,
    createdAt: daysAgo(8),
  },
  {
    id: 'bm_3',
    buddyReadId: 'br_1',
    user: toSummary(users[2]),
    body: 'Orta hissədəki dönüş nöqtəsi haqqında sonda ayrıca danışaq.',
    chapter: 3,
    createdAt: daysAgo(4),
  },
  {
    id: 'bm_4',
    buddyReadId: 'br_1',
    user: toSummary(users[9]),
    body: 'Həftə sonu 4-cü hissəni bitirməyi planlaşdırıram, qoşulan varmı?',
    chapter: 4,
    createdAt: daysAgo(1),
  },
  {
    id: 'bm_5',
    buddyReadId: 'br_2',
    user: toSummary(users[6]),
    body: 'Təsvirlər möhtəşəmdir, oxuyarkən şəhəri gözünün önündə canlandırırsan.',
    chapter: 1,
    createdAt: daysAgo(3),
  },
  {
    id: 'bm_6',
    buddyReadId: 'br_2',
    user: toSummary(users[4]),
    body: 'Razıyam. İkinci personaj gözlədiyimdən güclü çıxdı.',
    chapter: 2,
    createdAt: daysAgo(2),
  },
];

/* ---------------------------- reading sessions ---------------------------- */

const SESSION_NOTES = [
  null,
  null,
  null,
  'Metroda oxudum, sürətli getdi.',
  'Gecə yarısı, bir fəsil qaldı.',
  'Səhər qəhvəsi ilə.',
  'Konsentrasiya zəif idi, geri qayıtmalı oldum.',
  'Ən sevdiyim hissə idi.',
];

/**
 * Two months of reading history for the demo account.
 *
 * The streak, the weekly-pages chart and the reading-speed estimate are all
 * derived from these rows, so they have to look like a real habit: most days
 * have one sitting, some have two, and roughly a fifth are skipped.
 */
export const readingSessions: ReadingSession[] = [];
let sessionId = 1;

{
  const currentEntries = shelfEntries.filter(
    (e) => e.userId === CURRENT_USER_ID && (e.status === 'reading' || e.status === 'read'),
  );

  for (let daysBack = 60; daysBack >= 0; daysBack--) {
    if (rnd() < 0.22) continue; // rest day
    const sittings = rnd() < 0.25 ? 2 : 1;

    for (let s = 0; s < sittings; s++) {
      const entry = pick(currentEntries);
      if (!entry) continue;
      const book = bookById.get(entry.bookId);
      if (!book) continue;

      const minutes = intBetween(12, 95);
      // ~40 pages/hour, wandering a bit per sitting.
      const pages = Math.max(3, Math.round((minutes / 60) * between(28, 54)));
      const startPage = intBetween(1, Math.max(2, book.pageCount - pages - 1));
      const startedAt = new Date(NOW - daysBack * DAY - intBetween(0, 12) * 3_600_000);

      readingSessions.push({
        id: `rs_${sessionId++}`,
        userId: CURRENT_USER_ID,
        bookId: book.id,
        startPage,
        endPage: startPage + pages,
        durationSeconds: minutes * 60,
        note: pick(SESSION_NOTES),
        startedAt: startedAt.toISOString(),
        endedAt: new Date(+startedAt + minutes * 60_000).toISOString(),
      });
    }
  }
}

/* ------------------------------- book lists ------------------------------- */

export interface SeedBookList {
  id: string;
  slug: string;
  title: string;
  description: string;
  ownerId: string;
  isOfficial: boolean;
  followersCount: number;
  followerIds: string[];
  items: { bookId: string; note: string | null; position: number }[];
  createdAt: string;
}

/**
 * Editorial lists.
 *
 * A 1000-book catalogue is only useful if there are ways in other than search,
 * so each list is a query over the catalogue rather than a hand-typed set of
 * ids — which also means the lists stay populated when the catalogue is rebuilt.
 */
const LIST_DEFS: {
  slug: string;
  title: string;
  description: string;
  pick: (b: Book) => boolean;
  limit: number;
}[] = [
  {
    slug: 'azerbaycan-klassikleri',
    title: 'Azərbaycan klassikləri',
    description: 'Məktəb proqramından tanıdığın, amma yenidən oxumağa dəyən əsərlər.',
    pick: (b) => b.language === 'az' && b.genres.includes('classic'),
    limit: 20,
  },
  {
    slug: 'baslangic-ucun-fantastika',
    title: 'Başlanğıc üçün fantastika',
    description: 'Janrla ilk dəfə tanış olanlar üçün seçilmiş, uzunluğu qorxutmayan kitablar.',
    pick: (b) => (b.genres.includes('fantasy') || b.genres.includes('scifi')) && b.pageCount < 450,
    limit: 24,
  },
  {
    slug: 'bir-gecelik-kitablar',
    title: 'Bir gecəyə sığan kitablar',
    description: '200 səhifədən qısa — bir oturuma bitirmək mümkündür.',
    pick: (b) => b.pageCount <= 200,
    limit: 30,
  },
  {
    slug: 'ozunu-tanimaq',
    title: 'Özünü tanımaq üçün',
    description: 'Psixologiya və şəxsi inkişaf — reklam deyil, oxunmağa dəyənlər.',
    pick: (b) => b.genres.includes('psychology') || b.genres.includes('selfHelp'),
    limit: 25,
  },
  {
    slug: 'detektiv-gecesi',
    title: 'Detektiv gecəsi',
    description: 'Sonunu tapmağa çalışacağın, çox vaxt bacarmayacağın kitablar.',
    pick: (b) => b.genres.includes('mystery'),
    limit: 25,
  },
  {
    slug: 'usaqla-birlikde',
    title: 'Uşaqla birlikdə oxumaq üçün',
    description: 'Həm uşağın, həm də sənin maraqla oxuyacağın kitablar.',
    pick: (b) => b.genres.includes('children'),
    limit: 24,
  },
  {
    slug: 'tarixin-icinden',
    title: 'Tarixin içindən',
    description: 'Keçmişi tarix dərsliyindən fərqli danışan kitablar.',
    pick: (b) => b.genres.includes('history') || b.genres.includes('biography'),
    limit: 25,
  },
  {
    slug: 'qalin-amma-deyer',
    title: 'Qalın, amma dəyər',
    description: '600 səhifədən yuxarı. Vaxt ayır — peşman olmayacaqsan.',
    pick: (b) => b.pageCount >= 600,
    limit: 20,
  },
];

const LIST_NOTES = [
  null,
  null,
  'Siyahının ən yaxşı başlanğıc nöqtəsi.',
  'Əvvəlcə bunu oxu, sonra qalanları.',
  'Ən çox müzakirə olunanı.',
  'Qısadır, amma yaddan çıxmır.',
];

export const bookLists: SeedBookList[] = LIST_DEFS.map((def, i) => {
  const matches = books
    .filter(def.pick)
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, def.limit);

  return {
    id: `bl_${i + 1}`,
    slug: def.slug,
    title: def.title,
    description: def.description,
    // The first two are the demo account's own lists, so the "my lists" tab is
    // not empty and editing can be demonstrated.
    ownerId: i < 2 ? CURRENT_USER_ID : users[(i * 3) % users.length].id,
    isOfficial: i >= 2,
    followersCount: intBetween(40, 4200),
    followerIds: [],
    items: matches.map((b, position) => ({
      bookId: b.id,
      note: LIST_NOTES[(position + i) % LIST_NOTES.length],
      position,
    })),
    createdAt: daysAgo(intBetween(10, 400)),
  };
});

/* -------------------------------- reports --------------------------------- */

export const reports: Report[] = [
  {
    id: 'rp_1',
    targetType: 'review',
    targetId: reviews[3]?.id ?? 'r_1',
    reason: 'spoiler',
    note: 'Finalı açıq şəkildə yazıb, spoyler işarəsi yoxdur.',
    reportedBy: toSummary(users[3]),
    status: 'open',
    createdAt: daysAgo(2),
    snapshot: {
      text: 'Sonda baş qəhrəman ölür və bütün plan alt-üst olur, ona görə oxumağa dəyməz.',
      authorName: users[7].name,
      bookTitle: popularBooks[20].title,
    },
  },
  {
    id: 'rp_2',
    targetType: 'quote',
    targetId: quotes[5]?.id ?? 'q_1',
    reason: 'copyright',
    note: 'Kitabın bütöv bir səhifəsi şəkil kimi paylaşılıb.',
    reportedBy: toSummary(users[5]),
    status: 'open',
    createdAt: daysAgo(4),
    snapshot: {
      text: 'Tam səhifə mətn şəkli paylaşılıb — 3 abzas ardıcıl kopyalanıb.',
      authorName: users[11].name,
      bookTitle: popularBooks[8].title,
    },
  },
  {
    id: 'rp_3',
    targetType: 'review',
    targetId: reviews[8]?.id ?? 'r_2',
    reason: 'offensive',
    note: 'Müəllifə qarşı təhqiramiz ifadələr.',
    reportedBy: toSummary(users[1]),
    status: 'open',
    createdAt: daysAgo(1),
    snapshot: {
      text: 'Bu cür kitab yazanlar ümumiyyətlə qələmə əl vurmamalıdır, tam vaxt itkisidir.',
      authorName: users[12].name,
      bookTitle: popularBooks[31].title,
    },
  },
  {
    id: 'rp_4',
    targetType: 'quote',
    targetId: quotes[11]?.id ?? 'q_3',
    reason: 'spam',
    note: 'Sitat deyil, reklam linki paylaşılıb.',
    reportedBy: toSummary(users[8]),
    status: 'open',
    createdAt: daysAgo(6),
    snapshot: {
      text: 'Ən ucuz kitablar üçün bizim kanala qoşulun → t.me/…',
      authorName: users[10].name,
      bookTitle: popularBooks[14].title,
    },
  },
  {
    id: 'rp_5',
    targetType: 'review',
    targetId: reviews[12]?.id ?? 'r_4',
    reason: 'other',
    note: 'Rəy tamamilə başqa kitab haqqındadır.',
    reportedBy: toSummary(users[2]),
    status: 'kept',
    createdAt: daysAgo(11),
    snapshot: {
      text: 'Filmi kitabdan daha yaxşı çəkiblər, rejissora afərin.',
      authorName: users[13].name,
      bookTitle: popularBooks[3].title,
    },
  },
];

/* --------------------------------- exports -------------------------------- */

export const seed = {
  publishers,
  authors,
  books,
  users,
  shelves,
  shelfEntries,
  reviews,
  quotes,
  buddyReads,
  buddyMessages,
  reports,
  readingSessions,
  bookLists,
  bookById,
  popularBooks,
  CURRENT_USER_ID,
  NOW,
  daysAgo,
  daysAhead,
};
