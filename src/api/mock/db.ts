import { storage, StorageKeys } from '@/lib/storage';
import type {
  AppNotification,
  Author,
  Book,
  BuddyMessage,
  BuddyRead,
  Order,
  Publisher,
  Quote,
  Report,
  Review,
  User,
  UserRole,
} from '@/types';
import { seed, type SeedShelf, type SeedShelfEntry } from './seed';

/**
 * In-memory database behind the mock API.
 *
 * Reference data (books, authors, publishers) is rebuilt from the seed on every
 * launch. Everything the user can change is persisted to AsyncStorage, so a
 * shelf update or a placed order survives a reload — without that the demo
 * resets every time Metro refreshes.
 */

export interface MockDb {
  /** Schema version — bump to invalidate persisted state after a shape change. */
  version: number;
  users: User[];
  books: Book[];
  authors: Author[];
  publishers: Publisher[];
  shelves: SeedShelf[];
  shelfEntries: SeedShelfEntry[];
  reviews: Review[];
  quotes: Quote[];
  buddyReads: BuddyRead[];
  buddyMessages: BuddyMessage[];
  reports: Report[];
  orders: Order[];
  notifications: AppNotification[];
  cart: { bookId: string; quantity: number }[];
  /** ids of reviews/quotes the demo user has liked */
  likedReviews: string[];
  likedQuotes: string[];
  followedUserIds: string[];
  followedAuthorIds: string[];
  recentSearches: string[];
  /** Lets the demo switch between user / publisher / admin views. */
  demoRole: UserRole;
  /** Which publisher the demo account manages when role === 'publisher'. */
  demoPublisherId: string;
  giftCards: { code: string; amount: number; used: boolean }[];
}

const SCHEMA_VERSION = 3;

const PERSISTED_KEYS = [
  'users',
  'shelves',
  'shelfEntries',
  'reviews',
  'quotes',
  'buddyReads',
  'buddyMessages',
  'reports',
  'orders',
  'notifications',
  'cart',
  'likedReviews',
  'likedQuotes',
  'followedUserIds',
  'followedAuthorIds',
  'recentSearches',
  'demoRole',
  'demoPublisherId',
  'giftCards',
] as const;

function buildInitialDb(): MockDb {
  return {
    version: SCHEMA_VERSION,
    users: structuredCopy(seed.users),
    books: structuredCopy(seed.books),
    authors: structuredCopy(seed.authors),
    publishers: structuredCopy(seed.publishers),
    shelves: structuredCopy(seed.shelves),
    shelfEntries: structuredCopy(seed.shelfEntries),
    reviews: structuredCopy(seed.reviews),
    quotes: structuredCopy(seed.quotes),
    buddyReads: structuredCopy(seed.buddyReads),
    buddyMessages: structuredCopy(seed.buddyMessages),
    reports: structuredCopy(seed.reports),
    orders: [],
    notifications: buildInitialNotifications(),
    cart: [],
    likedReviews: [],
    likedQuotes: seed.quotes.filter((q) => q.isLiked).map((q) => q.id),
    followedUserIds: seed.users.filter((u) => u.isFollowing).map((u) => u.id),
    followedAuthorIds: [],
    recentSearches: [],
    demoRole: 'user',
    demoPublisherId: seed.publishers[0].id,
    giftCards: [
      { code: 'KITAB10', amount: 10, used: false },
      { code: 'KITAB25', amount: 25, used: false },
      { code: 'HEDIYYE5', amount: 5, used: false },
    ],
  };
}

/** JSON round-trip clone — the seed must never be mutated by handlers. */
function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildInitialNotifications(): AppNotification[] {
  const { users, books, daysAgo } = seed;
  const summary = (i: number) => ({
    id: users[i].id,
    username: users[i].username,
    name: users[i].name,
    avatarUrl: users[i].avatarUrl,
  });

  return [
    {
      id: 'n_1',
      type: 'follow',
      params: { name: users[3].name },
      actor: summary(3),
      read: false,
      link: `/user/${users[3].username}`,
      createdAt: daysAgo(0.2),
    },
    {
      id: 'n_2',
      type: 'quote_like',
      params: { name: users[6].name },
      actor: summary(6),
      read: false,
      link: '/quotes',
      createdAt: daysAgo(0.6),
    },
    {
      id: 'n_3',
      type: 'review_comment',
      params: { name: users[2].name },
      actor: summary(2),
      read: false,
      link: `/book/${books[4].id}`,
      createdAt: daysAgo(1.4),
    },
    {
      id: 'n_4',
      type: 'buddy_invite',
      params: { name: users[9].name },
      actor: summary(9),
      read: true,
      link: '/buddy-reads/br_1',
      createdAt: daysAgo(3),
    },
    {
      id: 'n_5',
      type: 'new_book',
      params: { name: books[41].authorName },
      actor: null,
      read: true,
      link: `/book/${books[41].id}`,
      createdAt: daysAgo(5),
    },
    {
      id: 'n_6',
      type: 'badge_earned',
      params: { name: 'Sitat ustası' },
      actor: null,
      read: true,
      link: '/badges',
      createdAt: daysAgo(8),
    },
  ];
}

/* ------------------------------- lifecycle -------------------------------- */

let db: MockDb = buildInitialDb();
let hydrated = false;
let hydrating: Promise<void> | null = null;

/** Awaited by every mock request before it touches state. */
export function ensureDbReady(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;

  hydrating = (async () => {
    const saved = await storage.get<Partial<MockDb> & { version?: number }>(StorageKeys.mockDb);
    if (saved && saved.version === SCHEMA_VERSION) {
      for (const key of PERSISTED_KEYS) {
        if (saved[key] !== undefined) {
          (db as unknown as Record<string, unknown>)[key] = saved[key];
        }
      }
    }
    hydrated = true;
    hydrating = null;
  })();

  return hydrating;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced — a burst of mutations writes once. */
export function persistDb(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const snapshot: Record<string, unknown> = { version: SCHEMA_VERSION };
    for (const key of PERSISTED_KEYS) snapshot[key] = db[key];
    void storage.set(StorageKeys.mockDb, snapshot);
  }, 250);
}

/** Drops all persisted demo state and rebuilds from the seed. */
export async function resetDb(): Promise<void> {
  db = buildInitialDb();
  hydrated = true;
  await storage.remove(StorageKeys.mockDb);
}

export function getDb(): MockDb {
  return db;
}

/* -------------------------------- helpers --------------------------------- */

export const CURRENT_USER_ID = seed.CURRENT_USER_ID;

export function me(): User {
  const user = db.users.find((u) => u.id === CURRENT_USER_ID);
  if (!user) throw new Error('mock db: demo user missing');
  // The demo role switcher overrides the stored role so publisher/admin panels
  // are reachable in a single account.
  return {
    ...user,
    role: db.demoRole,
    publisherId: db.demoRole === 'publisher' ? db.demoPublisherId : undefined,
  };
}

let idCounter = 0;

/** Monotonic ids, prefixed per collection: `nextId('q')` -> `q_x1`. */
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_x${idCounter}${Math.floor(Math.random() * 1000)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
