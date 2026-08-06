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
  Report,
  Review,
  User,
  UserSummary,
} from '@/types';

/**
 * Deterministic seed dataset for the mock API.
 *
 * Everything here is generated from a fixed PRNG seed, so the demo looks the
 * same on every machine and every reload — important when the sprint review is
 * a live walkthrough. `backend-guide/seed-data/` contains the JSON export of
 * this same dataset so the real backend can seed identically.
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

/** Fixed "now" anchor so relative dates stay stable within a session. */
const NOW = Date.now();
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW - days * DAY).toISOString();
const daysAhead = (days: number) => new Date(NOW + days * DAY).toISOString();

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

/* --------------------------------- books ---------------------------------- */

type BookRow = [
  title: string,
  author: string,
  language: BookLanguage,
  genres: GenreSlug[],
  year: number,
  pages: number,
  price: number,
];

const BOOK_ROWS: BookRow[] = [
  // --- Azerbaijani literature -------------------------------------------------
  ['Əli və Nino', 'Qurban Səid', 'az', ['novel', 'classic'], 1937, 288, 14.9],
  ['Beşmərtəbəli evin altıncı mərtəbəsi', 'Anar', 'az', ['novel'], 1981, 224, 11.5],
  ['Ağ liman', 'Anar', 'az', ['novel'], 1970, 176, 9.8],
  ['Mahmud və Məryəm', 'Elçin', 'az', ['novel', 'classic'], 1983, 208, 12.4],
  ['Ölüm hökmü', 'Elçin', 'az', ['novel'], 1989, 344, 15.2],
  ['Yarımçıq əlyazma', 'Kamal Abdulla', 'az', ['novel', 'history'], 2004, 264, 13.7],
  ['Sehrbazlar dərəsi', 'Kamal Abdulla', 'az', ['novel', 'fantasy'], 2006, 232, 12.9],
  ['Daş yuxular', 'Əkrəm Əylisli', 'az', ['novel'], 2012, 192, 11.0],
  ['Qılınc və qələm', 'Məmməd Səid Ordubadi', 'az', ['history', 'classic'], 1948, 640, 19.9],
  ['Dumanlı Təbriz', 'Məmməd Səid Ordubadi', 'az', ['history', 'novel'], 1933, 512, 17.5],
  ['Kitabi-Dədə Qorqud', 'Xalq dastanı', 'az', ['classic', 'poetry'], 1815, 288, 16.0],
  ['Xəmsə', 'Nizami Gəncəvi', 'az', ['poetry', 'classic'], 1200, 720, 24.5],
  ['Leyli və Məcnun', 'Məhəmməd Füzuli', 'az', ['poetry', 'classic'], 1535, 208, 13.2],
  ['Hophopnamə', 'Mirzə Ələkbər Sabir', 'az', ['poetry', 'classic'], 1912, 320, 12.0],
  ['Ölülər', 'Cəlil Məmmədquluzadə', 'az', ['classic', 'novel'], 1909, 144, 8.9],
  ['Səhər', 'Mehdi Hüseyn', 'az', ['novel', 'history'], 1950, 368, 14.0],
  ['Bakı-1501', 'Aqil Abbas', 'az', ['novel', 'history'], 2010, 256, 12.6],
  ['Şeyx Sənan', 'Hüseyn Cavid', 'az', ['poetry', 'classic'], 1914, 160, 9.5],
  ['Nar bağı', 'Əkrəm Əylisli', 'az', ['novel'], 1975, 184, 10.4],
  ['Böyük dayaq', 'Mirzə İbrahimov', 'az', ['novel'], 1957, 400, 15.8],

  // --- World classics ---------------------------------------------------------
  ['1984', 'George Orwell', 'az', ['scifi', 'classic', 'novel'], 1949, 328, 13.5],
  ['Heyvanıstan', 'George Orwell', 'az', ['classic', 'novel'], 1945, 144, 8.5],
  ['Cinayət və cəza', 'Fyodor Dostoyevski', 'az', ['classic', 'psychology'], 1866, 576, 18.9],
  ['Karamazov qardaşları', 'Fyodor Dostoyevski', 'az', ['classic', 'philosophy'], 1880, 824, 24.0],
  ['Anna Karenina', 'Lev Tolstoy', 'az', ['classic', 'novel'], 1878, 864, 23.5],
  ['Müharibə və sülh', 'Lev Tolstoy', 'ru', ['classic', 'history'], 1869, 1225, 29.9],
  ['Kiçik Şahzadə', 'Antoine de Saint-Exupéry', 'az', ['children', 'classic'], 1943, 96, 7.9],
  ['Qürur və qərəz', 'Jane Austen', 'az', ['classic', 'novel'], 1813, 432, 14.2],
  ['Yüz ilin tənhalığı', 'Gabriel García Márquez', 'az', ['novel', 'classic'], 1967, 448, 17.0],
  ['Çavdar tarlasında uçurumdan qoruyan', 'J. D. Salinger', 'az', ['novel', 'classic'], 1951, 240, 12.1],
  ['Böyük Getsbi', 'F. Scott Fitzgerald', 'en', ['classic', 'novel'], 1925, 180, 11.4],
  ['Fahrenheit 451', 'Ray Bradbury', 'az', ['scifi', 'classic'], 1953, 208, 11.9],
  ['Şəkər Portağalım', 'José Mauro de Vasconcelos', 'az', ['children', 'novel'], 1968, 184, 9.9],

  // --- Genre fiction ----------------------------------------------------------
  ['Üzüklərin Hökmdarı: Üzük Qardaşlığı', 'J. R. R. Tolkien', 'az', ['fantasy'], 1954, 576, 21.5],
  ['Hobbit', 'J. R. R. Tolkien', 'az', ['fantasy', 'children'], 1937, 320, 15.0],
  ['Harri Potter və Fəlsəfə Daşı', 'J. K. Rowling', 'az', ['fantasy', 'children'], 1997, 336, 16.8],
  ['Dune', 'Frank Herbert', 'en', ['scifi'], 1965, 688, 22.9],
  ['Şerlok Holms: Baskervillərin iti', 'Arthur Conan Doyle', 'az', ['mystery', 'classic'], 1902, 256, 11.2],
  ['Şərq ekspresində qətl', 'Agatha Christie', 'az', ['mystery'], 1934, 288, 12.5],
  ['On kiçik zənci', 'Agatha Christie', 'az', ['mystery'], 1939, 272, 12.5],
  ['Kafka sahildə', 'Haruki Murakami', 'az', ['novel', 'fantasy'], 2002, 528, 19.4],
  ['Norveç meşəsi', 'Haruki Murakami', 'az', ['novel'], 1987, 384, 16.2],
  ['Simyaçı', 'Paulo Coelho', 'az', ['novel', 'philosophy'], 1988, 208, 11.8],

  // --- Turkish ----------------------------------------------------------------
  ['Kürk Mantolu Madonna', 'Sabahattin Ali', 'tr', ['novel', 'classic'], 1943, 176, 10.6],
  ['İçimizdeki Şeytan', 'Sabahattin Ali', 'tr', ['novel'], 1940, 256, 11.3],
  ['Benim Adım Kırmızı', 'Orhan Pamuk', 'tr', ['novel', 'history'], 1998, 472, 18.0],
  ['Masumiyet Müzesi', 'Orhan Pamuk', 'tr', ['novel'], 2008, 592, 19.7],
  ['Serenad', 'Zülfü Livaneli', 'tr', ['novel', 'history'], 2011, 456, 16.9],

  // --- Non-fiction ------------------------------------------------------------
  ['Sapiens: Bəşəriyyətin qısa tarixi', 'Yuval Noah Harari', 'az', ['history', 'science'], 2011, 512, 22.0],
  ['Homo Deus: Sabahın qısa tarixi', 'Yuval Noah Harari', 'az', ['science', 'philosophy'], 2015, 464, 21.0],
  ['Atomik vərdişlər', 'James Clear', 'az', ['selfHelp', 'psychology'], 2018, 320, 17.9],
  ['Sürətli və yavaş düşünmə', 'Daniel Kahneman', 'az', ['psychology', 'science'], 2011, 512, 20.5],
  ['İnsanın mənası axtarışı', 'Viktor Frankl', 'az', ['psychology', 'philosophy'], 1946, 200, 12.8],
  ['Zəngin ata, kasıb ata', 'Robert Kiyosaki', 'az', ['business', 'selfHelp'], 1997, 336, 15.5],
  ['Yaxşıdan əlaya', 'Jim Collins', 'en', ['business'], 2001, 320, 18.4],
  ['Qısa cavablar böyük suallara', 'Stephen Hawking', 'az', ['science'], 2018, 240, 14.6],
  ['Kainatın qısa tarixi', 'Stephen Hawking', 'az', ['science'], 1988, 256, 15.9],
  ['Steve Jobs', 'Walter Isaacson', 'az', ['biography', 'business'], 2011, 656, 24.9],
];

const DESCRIPTION_TEMPLATES = [
  'Oxucunu ilk səhifədən sonuna qədər buraxmayan, insan taleyinin dərinliklərinə enən əsər. Müəllif sadə dildə mürəkkəb suallar qoyur və cavabı oxucunun öz vicdanına buraxır.',
  'Zamanın sınağından çıxmış bu kitab nəsillərdən-nəsillərə ötürülür. Hər yenidən oxunuşda əvvəl gözdən qaçan bir detal üzə çıxır.',
  'Kitab həm fərdin daxili dünyasını, həm də onu əhatə edən cəmiyyəti eyni diqqətlə təsvir edir. Personajlar yaddaqalandır, dialoqlar canlıdır.',
  'Müəllifin ən çox oxunan əsərlərindən biri. Süjet gərgin qurulub, finalı isə uzun müddət düşündürür.',
  'Ədəbiyyat tarixində öz yerini tutmuş, dünya dillərinə tərcümə olunmuş və dəfələrlə ekranlaşdırılmış bir mətn.',
];

const AUTHOR_BIOS = [
  'Öz dövrünün ən çox oxunan müəlliflərindən biri. Əsərləri onlarla dilə tərcümə olunub və bu gün də geniş oxucu kütləsi tərəfindən sevilir.',
  'Yazıçı, esseist və tərcüməçi. Yaradıcılığında insan psixologiyası və cəmiyyət münasibətləri əsas yer tutur.',
  'Ədəbi fəaliyyətə şeirlə başlayıb, sonradan nəsrə keçib. Bir sıra beynəlxalq mükafatın laureatıdır.',
  'Əsərləri məktəb və universitet proqramlarına daxil edilmiş klassik müəllif.',
];

/* build authors from the unique names in the table */

const authorNames = Array.from(new Set(BOOK_ROWS.map((r) => r[1])));

export const authors: Author[] = authorNames.map((name, i) => ({
  id: `au_${i + 1}`,
  name,
  slug: name
    .toLowerCase()
    .replace(/[^a-zəöüçşğı0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  bio: AUTHOR_BIOS[i % AUTHOR_BIOS.length],
  photoUrl: null,
  bookCount: BOOK_ROWS.filter((r) => r[1] === name).length,
  followersCount: intBetween(120, 24_000),
  isFollowing: false,
}));

const authorByName = new Map(authors.map((a) => [a.name, a]));

export const books: Book[] = BOOK_ROWS.map((row, i) => {
  const [title, authorName, language, genres, year, pages, price] = row;
  const author = authorByName.get(authorName)!;
  const publisher = publishers[i % publishers.length];
  const ratingCount = intBetween(40, 9_400);
  // Older, canonical books skew slightly higher — makes the catalogue feel real.
  const ratingAverage = Math.round(between(year < 1970 ? 7.4 : 6.4, 9.5) * 10) / 10;
  const discounted = rnd() < 0.22;

  return {
    id: `b_${i + 1}`,
    title,
    subtitle: null,
    authorId: author.id,
    authorName,
    publisherId: publisher.id,
    publisherName: publisher.name,
    isbn: `978${String(9952000000 + i * 7919).padStart(10, '0')}`,
    language,
    genres,
    coverUrl: null,
    description: DESCRIPTION_TEMPLATES[i % DESCRIPTION_TEMPLATES.length],
    pageCount: pages,
    publishedYear: year,
    price: Math.round(price * 100) / 100,
    oldPrice: discounted ? Math.round(price * 1.25 * 100) / 100 : null,
    stock: rnd() < 0.07 ? 0 : intBetween(3, 80),
    ratingAverage,
    ratingCount,
    reviewsCount: Math.floor(ratingCount / intBetween(5, 14)),
    quotesCount: intBetween(0, 180),
    createdAt: daysAgo(intBetween(5, 900)),
  } satisfies Book;
});

const bookById = new Map(books.map((b) => [b.id, b]));

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

const GENRE_POOL: GenreSlug[] = [
  'novel',
  'mystery',
  'scifi',
  'fantasy',
  'history',
  'biography',
  'poetry',
  'psychology',
  'philosophy',
  'business',
  'children',
  'classic',
  'science',
  'selfHelp',
];

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
    avatarUrl: null,
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
  const count = user.id === CURRENT_USER_ID ? 22 : intBetween(6, 18);

  for (let i = 0; i < count; i++) {
    const book = pick(books);
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
    bookId: books[0].id,
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
];

export const reviews: Review[] = [];
let reviewId = 1;

books.forEach((book) => {
  const n = intBetween(0, 5);
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
  { id: 'ink', colors: ['#1C1917', '#3F3A35'], text: '#F7F1E6' },
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
  const book = books[(i * 7) % books.length];
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

export const buddyReads: BuddyRead[] = [
  {
    id: 'br_1',
    name: 'Dostoyevski birlikdə',
    bookId: books[22].id,
    book: {
      id: books[22].id,
      title: books[22].title,
      authorName: books[22].authorName,
      coverUrl: books[22].coverUrl,
      pageCount: books[22].pageCount,
    },
    ownerId: CURRENT_USER_ID,
    members: [
      { user: toSummary(users[0]), progressPage: 184 },
      { user: toSummary(users[9]), progressPage: 240 },
      { user: toSummary(users[2]), progressPage: 96 },
    ],
    targetDate: daysAhead(21),
    messagesCount: 4,
    createdAt: daysAgo(12),
  },
  {
    id: 'br_2',
    name: 'Yay klassikləri',
    bookId: books[0].id,
    book: {
      id: books[0].id,
      title: books[0].title,
      authorName: books[0].authorName,
      coverUrl: books[0].coverUrl,
      pageCount: books[0].pageCount,
    },
    ownerId: users[6].id,
    members: [
      { user: toSummary(users[6]), progressPage: 120 },
      { user: toSummary(users[4]), progressPage: 88 },
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
    body: 'Raskolnikovun ilk monoloqunu oxuyanda adamın nəfəsi kəsilir. 2-ci hissəyə keçdim.',
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
    body: 'Sonya obrazı haqqında sonda ayrıca danışaq, çox maraqlı yazılıb.',
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
    body: 'Bakı təsvirləri möhtəşəmdir, şəhəri tanıyanlar üçün ayrı zövq.',
    chapter: 1,
    createdAt: daysAgo(3),
  },
  {
    id: 'bm_6',
    buddyReadId: 'br_2',
    user: toSummary(users[4]),
    body: 'Razıyam. Nino obrazı gözlədiyimdən güclü çıxdı.',
    chapter: 2,
    createdAt: daysAgo(2),
  },
];

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
      bookTitle: books[20].title,
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
      bookTitle: books[8].title,
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
      bookTitle: books[31].title,
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
      bookTitle: books[14].title,
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
      bookTitle: books[3].title,
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
  bookById,
  CURRENT_USER_ID,
  NOW,
  daysAgo,
  daysAhead,
};
