import { DEFAULT_PAGE_SIZE, MOCK_LATENCY_MS } from '../config';
import { ApiError } from '../errors';
import type { QueryValue, RequestOptions } from '../client';
import type {
  ActivityItem,
  AdminStats,
  AppNotification,
  AuthSession,
  Badge,
  Book,
  BookLanguage,
  BuddyRead,
  CartGroup,
  CartSummary,
  GenreSlug,
  LeaderboardEntry,
  Order,
  OrderItem,
  Paginated,
  PublisherStats,
  Quote,
  Report,
  Review,
  Shelf,
  ShelfEntry,
  ShelfStatus,
  User,
  UserRole,
  UserStats,
} from '@/types';
import { BADGE_DEFS, seed, toSummary } from './seed';
import { CURRENT_USER_ID, ensureDbReady, getDb, nextId, nowIso, persistDb } from './db';

/* ------------------------------ tiny helpers ------------------------------ */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function q(query: Record<string, QueryValue> | undefined, key: string): string | undefined {
  const value = query?.[key];
  if (value === undefined || value === null) return undefined;
  return Array.isArray(value) ? value.map(String).join(',') : String(value);
}

function qList(query: Record<string, QueryValue> | undefined, key: string): string[] {
  const value = query?.[key];
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function qNum(query: Record<string, QueryValue> | undefined, key: string): number | undefined {
  const raw = q(query, key);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function paginate<T>(items: T[], query?: Record<string, QueryValue>): Paginated<T> {
  const page = Math.max(1, qNum(query, 'page') ?? 1);
  const limit = Math.max(1, Math.min(100, qNum(query, 'limit') ?? DEFAULT_PAGE_SIZE));
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  const totalPages = Math.max(1, Math.ceil(items.length / limit));

  return {
    data,
    meta: { page, limit, total: items.length, totalPages, hasMore: page < totalPages },
  };
}

/** Case/diacritic-insensitive contains, so "eli" matches "Əli". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[n];
}

/* --------------------------- derived read models --------------------------- */

/** Attaches the demo user's shelf state so book cards can render a badge. */
function decorateBook(book: Book): Book {
  const entry = getDb().shelfEntries.find(
    (e) => e.userId === CURRENT_USER_ID && e.bookId === book.id,
  );
  return {
    ...book,
    shelfStatus: entry ? entry.status : null,
    progressPage: entry?.progressPage ?? 0,
  };
}

const decorate = (list: Book[]) => list.map(decorateBook);

function findBook(id: string): Book {
  const book = getDb().books.find((b) => b.id === id);
  if (!book) throw new ApiError('NOT_FOUND', 'Book not found', 404);
  return decorateBook(book);
}

/**
 * Recomputes the demo user's statistics from their shelf entries, so finishing
 * a book immediately moves the profile charts. Other users keep seeded stats.
 */
function computeStats(userId: string): UserStats {
  const db = getDb();
  const base = db.users.find((u) => u.id === userId)!.stats;
  if (userId !== CURRENT_USER_ID) return base;

  const entries = db.shelfEntries.filter((e) => e.userId === userId);
  const read = entries.filter((e) => e.status === 'read');

  const pagesRead = entries.reduce((sum, e) => {
    const book = db.books.find((b) => b.id === e.bookId);
    if (!book) return sum;
    return sum + (e.status === 'read' ? book.pageCount : e.progressPage);
  }, 0);

  const counts = new Map<GenreSlug, number>();
  for (const entry of entries) {
    if (entry.status !== 'read' && entry.status !== 'reading') continue;
    const book = db.books.find((b) => b.id === entry.bookId);
    book?.genres.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1));
  }

  return {
    ...base,
    booksRead: read.length,
    pagesRead,
    reviewsCount: db.reviews.filter((r) => r.user.id === userId).length,
    quotesCount: db.quotes.filter((qt) => qt.user.id === userId).length,
    genreDistribution: [...counts.entries()]
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count),
  };
}

function hydrateUser(user: User): User {
  const db = getDb();
  const stats = computeStats(user.id);
  const isMe = user.id === CURRENT_USER_ID;

  return {
    ...user,
    role: isMe ? db.demoRole : user.role,
    publisherId: isMe && db.demoRole === 'publisher' ? db.demoPublisherId : user.publisherId,
    stats,
    goal: isMe ? { ...user.goal, completed: stats.booksRead } : user.goal,
    isFollowing: isMe ? undefined : db.followedUserIds.includes(user.id),
    followersCount: user.followersCount,
  };
}

function findUserByUsername(username: string): User {
  const key = username === 'me' ? CURRENT_USER_ID : null;
  const user = key
    ? getDb().users.find((u) => u.id === key)
    : getDb().users.find((u) => u.username === username);
  if (!user) throw new ApiError('NOT_FOUND', 'User not found', 404);
  return hydrateUser(user);
}

/* --------------------------------- shelves -------------------------------- */

const SHELF_LABELS: Record<ShelfStatus, string> = {
  reading: 'reading',
  read: 'read',
  want_to_read: 'want_to_read',
  dnf: 'dnf',
};

function shelvesForUser(userId: string): Shelf[] {
  const db = getDb();
  return db.shelves
    .filter((s) => s.userId === userId)
    .map((s) => {
      const entries = db.shelfEntries.filter((e) => e.shelfId === s.id);
      const covers = entries
        .slice(0, 3)
        .map((e) => db.books.find((b) => b.id === e.bookId)?.coverUrl)
        .filter((c): c is string => !!c);

      return {
        id: s.id,
        userId: s.userId,
        status: s.status,
        name: s.status ? SHELF_LABELS[s.status] : s.name,
        isDefault: s.isDefault,
        booksCount: entries.length,
        coverUrls: covers,
      };
    })
    // Default shelves first, in reading-flow order.
    .sort((a, b) => {
      const order: (ShelfStatus | null)[] = ['reading', 'read', 'want_to_read', 'dnf', null];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });
}

function toShelfEntry(raw: (typeof seed.shelfEntries)[number]): ShelfEntry {
  return {
    id: raw.id,
    shelfId: raw.shelfId,
    bookId: raw.bookId,
    book: findBook(raw.bookId),
    status: raw.status,
    progressPage: raw.progressPage,
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt,
    addedAt: raw.addedAt,
  };
}

/* ---------------------------------- cart ---------------------------------- */

const FREE_DELIVERY_THRESHOLD = 40;
const COURIER_FEE = 3.5;

function buildCart(): CartSummary {
  const db = getDb();
  const groupsMap = new Map<string, CartGroup>();

  for (const line of db.cart) {
    const book = db.books.find((b) => b.id === line.bookId);
    if (!book) continue;
    const existing = groupsMap.get(book.publisherId);
    const item = { bookId: book.id, book: decorateBook(book), quantity: line.quantity };
    if (existing) existing.items.push(item);
    else
      groupsMap.set(book.publisherId, {
        publisherId: book.publisherId,
        publisherName: book.publisherName,
        items: [item],
        subtotal: 0,
        deliveryFee: 0,
      });
  }

  const groups = [...groupsMap.values()].map((group) => {
    const subtotal = round2(
      group.items.reduce((sum, i) => sum + i.book.price * i.quantity, 0),
    );
    // Delivery is charged per publisher — each ships its own parcel.
    return {
      ...group,
      subtotal,
      deliveryFee: subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : COURIER_FEE,
    };
  });

  const subtotal = round2(groups.reduce((s, g) => s + g.subtotal, 0));
  const deliveryTotal = round2(groups.reduce((s, g) => s + g.deliveryFee, 0));

  return {
    groups,
    itemCount: db.cart.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    deliveryTotal,
    discount: 0,
    total: round2(subtotal + deliveryTotal),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* -------------------------------- ordering -------------------------------- */

const ORDER_FLOW: Order['status'][] = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'out_for_delivery',
  'delivered',
];

function createOrders(body: {
  address: Order['address'];
  deliveryMethod: Order['deliveryMethod'];
  paymentMethod: Order['paymentMethod'];
  giftCardCode?: string;
}): Order[] {
  const db = getDb();
  const cart = buildCart();
  if (cart.groups.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'Cart is empty', 422);
  }

  // Stock check before anything is committed.
  for (const group of cart.groups) {
    for (const item of group.items) {
      const book = db.books.find((b) => b.id === item.bookId);
      if (!book || book.stock < item.quantity) {
        throw new ApiError('OUT_OF_STOCK', `"${item.book.title}" is out of stock`, 409);
      }
    }
  }

  let remainingDiscount = 0;
  if (body.giftCardCode) {
    const card = db.giftCards.find(
      (c) => c.code.toUpperCase() === body.giftCardCode!.toUpperCase() && !c.used,
    );
    if (!card) throw new ApiError('VALIDATION_ERROR', 'Invalid gift card', 422);
    card.used = true;
    remainingDiscount = card.amount;
  }

  const created: Order[] = [];
  const stamp = nowIso();

  for (const group of cart.groups) {
    const items: OrderItem[] = group.items.map((item) => ({
      bookId: item.bookId,
      title: item.book.title,
      authorName: item.book.authorName,
      coverUrl: item.book.coverUrl,
      publisherId: group.publisherId,
      publisherName: group.publisherName,
      price: item.book.price,
      quantity: item.quantity,
    }));

    // The gift card is consumed across orders, cheapest-first is not needed —
    // apply it in group order until exhausted.
    const applicable = Math.min(remainingDiscount, group.subtotal);
    remainingDiscount = round2(remainingDiscount - applicable);

    const deliveryFee = body.deliveryMethod === 'pickup' ? 0 : group.deliveryFee;

    const order: Order = {
      id: nextId('o'),
      code: String(100000 + Math.floor(Math.random() * 899999)),
      userId: CURRENT_USER_ID,
      publisherId: group.publisherId,
      publisherName: group.publisherName,
      items,
      subtotal: group.subtotal,
      deliveryFee,
      discount: applicable,
      total: round2(group.subtotal + deliveryFee - applicable),
      status: 'pending',
      paymentMethod: body.paymentMethod,
      deliveryMethod: body.deliveryMethod,
      address: body.address,
      estimatedDelivery: seed.daysAhead(
        body.deliveryMethod === 'post' ? 5 : body.deliveryMethod === 'pickup' ? 2 : 1,
      ),
      timeline: [{ status: 'pending', at: stamp }],
      createdAt: stamp,
    };

    // Decrement stock now that the order is committed.
    for (const item of items) {
      const book = db.books.find((b) => b.id === item.bookId);
      if (book) book.stock = Math.max(0, book.stock - item.quantity);
    }

    db.orders.unshift(order);
    created.push(order);
  }

  if (body.paymentMethod === 'wallet') {
    const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
    const charge = created.reduce((s, o) => s + o.total, 0);
    user.walletBalance = round2(Math.max(0, user.walletBalance - charge));
  }

  db.cart = [];

  db.notifications.unshift({
    id: nextId('n'),
    type: 'order_shipped',
    params: { code: created[0].code },
    actor: null,
    read: false,
    link: `/orders/${created[0].id}`,
    createdAt: stamp,
  });

  persistDb();
  return created;
}

/**
 * Nudges an order along its status timeline based on how long ago it was
 * placed, so the tracking screen shows real movement during a demo without
 * anyone having to fake it.
 */
function advanceOrder(order: Order): Order {
  if (order.status === 'cancelled' || order.status === 'delivered') return order;

  const ageMinutes = (Date.now() - new Date(order.createdAt).getTime()) / 60_000;
  const targetIndex = Math.min(ORDER_FLOW.length - 1, Math.floor(ageMinutes / 2) + 1);
  const currentIndex = ORDER_FLOW.indexOf(order.status);
  if (targetIndex <= currentIndex) return order;

  for (let i = currentIndex + 1; i <= targetIndex; i++) {
    order.timeline.push({
      status: ORDER_FLOW[i],
      at: new Date(new Date(order.createdAt).getTime() + i * 2 * 60_000).toISOString(),
    });
  }
  order.status = ORDER_FLOW[targetIndex];
  persistDb();
  return order;
}

/* -------------------------------- badges ---------------------------------- */

function badgesForUser(): Badge[] {
  const db = getDb();
  const stats = computeStats(CURRENT_USER_ID);
  const shelfCount = db.shelfEntries.filter((e) => e.userId === CURRENT_USER_ID).length;
  const goal = db.users.find((u) => u.id === CURRENT_USER_ID)!.goal;

  const progressBySlug: Record<string, number> = {
    first_10: stats.booksRead,
    quote_master: stats.quotesCount,
    genre_explorer: stats.genreDistribution.length,
    book_collector: shelfCount,
    reading_marathon: stats.weeklyPages.reduce((a, b) => a + b, 0),
    bookworm: stats.streakDays,
    critic: stats.reviewsCount,
    night_owl: Math.min(10, Math.floor(stats.streakDays / 3)),
    social_reader: db.followedUserIds.length,
    goal_crusher: stats.booksRead >= goal.target ? 1 : 0,
  };

  return BADGE_DEFS.map((def) => {
    const progress = Math.min(def.target, progressBySlug[def.slug] ?? 0);
    const earned = progress >= def.target;
    return {
      ...def,
      progress,
      earned,
      earnedAt: earned ? seed.daysAgo(7) : null,
    };
  });
}

/* ------------------------------ notifications ----------------------------- */

function pushNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
  getDb().notifications.unshift({
    ...n,
    id: nextId('n'),
    read: false,
    createdAt: nowIso(),
  });
}

/* -------------------------------- routing --------------------------------- */

interface Ctx {
  params: Record<string, string>;
  query?: Record<string, QueryValue>;
  body: any;
}

type Handler = (ctx: Ctx) => unknown;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

const routes: Route[] = [];

function route(method: string, path: string, handler: Handler) {
  routes.push({ method, segments: path.split('/').filter(Boolean), handler });
}

function matchRoute(method: string, path: string): { route: Route; params: Record<string, string> } | null {
  const parts = path.split('?')[0].split('/').filter(Boolean);
  for (const r of routes) {
    if (r.method !== method || r.segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < r.segments.length; i++) {
      const seg = r.segments[i];
      if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(parts[i]);
      else if (seg !== parts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { route: r, params };
  }
  return null;
}

/* ================================= routes ================================== */

/* ---- auth ---- */

function buildSession(): AuthSession {
  return {
    accessToken: `mock.access.${Date.now()}`,
    refreshToken: `mock.refresh.${Date.now()}`,
    user: hydrateUser(getDb().users.find((u) => u.id === CURRENT_USER_ID)!),
  };
}

route('POST', '/auth/login', ({ body }) => {
  if (!body?.email || !body?.password) {
    throw new ApiError('VALIDATION_ERROR', 'Email and password are required', 422);
  }
  // Demo convenience: any credentials work, but an email containing
  // "publisher" or "admin" signs you in with that role so the corresponding
  // panels are reachable without a second account.
  const email = String(body.email).toLowerCase();
  const db = getDb();
  if (email.includes('publisher')) db.demoRole = 'publisher';
  else if (email.includes('admin')) db.demoRole = 'admin';
  else db.demoRole = 'user';
  persistDb();
  return buildSession();
});

route('POST', '/auth/register', ({ body }) => {
  if (!body?.email || !body?.password || !body?.name) {
    throw new ApiError('VALIDATION_ERROR', 'Missing required fields', 422);
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
  user.name = body.name;
  if (body.username) user.username = body.username;
  user.email = body.email;
  db.demoRole = 'user';
  persistDb();
  return buildSession();
});

route('POST', '/auth/oauth/:provider', () => buildSession());
route('POST', '/auth/refresh', () => ({
  accessToken: `mock.access.${Date.now()}`,
  refreshToken: `mock.refresh.${Date.now()}`,
}));
route('POST', '/auth/logout', () => ({ success: true }));
route('POST', '/auth/forgot-password', () => ({ success: true }));
route('POST', '/auth/reset-password', () => ({ success: true }));
route('POST', '/auth/change-password', () => ({ success: true }));
route('GET', '/auth/me', () => hydrateUser(getDb().users.find((u) => u.id === CURRENT_USER_ID)!));

route('POST', '/auth/2fa/enable', () => ({
  secret: 'JBSWY3DPEHPK3PXP',
  otpauthUrl: 'otpauth://totp/KitabDostu:demo?secret=JBSWY3DPEHPK3PXP&issuer=KitabDostu',
}));
route('POST', '/auth/2fa/verify', ({ body }) => {
  if (!/^\d{6}$/.test(String(body?.code ?? ''))) {
    throw new ApiError('VALIDATION_ERROR', 'Code must be 6 digits', 422);
  }
  const user = getDb().users.find((u) => u.id === CURRENT_USER_ID)!;
  user.twoFactorEnabled = true;
  persistDb();
  return { success: true };
});
route('POST', '/auth/2fa/disable', () => {
  const user = getDb().users.find((u) => u.id === CURRENT_USER_ID)!;
  user.twoFactorEnabled = false;
  persistDb();
  return { success: true };
});

/* ---- users & social ---- */

route('GET', '/users/:username', ({ params }) => findUserByUsername(params.username));

route('PATCH', '/users/me', ({ body }) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
  if (typeof body?.name === 'string') user.name = body.name;
  if (typeof body?.bio === 'string') user.bio = body.bio;
  if (typeof body?.username === 'string') user.username = body.username;
  if (typeof body?.avatarUrl === 'string' || body?.avatarUrl === null) {
    user.avatarUrl = body.avatarUrl;
  }
  persistDb();
  return hydrateUser(user);
});

route('DELETE', '/users/me', () => ({ success: true }));

route('GET', '/users/:username/stats', ({ params }) => findUserByUsername(params.username).stats);

route('GET', '/users/:username/followers', ({ params, query }) => {
  const user = findUserByUsername(params.username);
  const db = getDb();
  const followers = db.users
    .filter((u) => u.id !== user.id)
    .slice(0, Math.min(db.users.length - 1, Math.max(3, user.followersCount % 12)))
    .map((u) => ({ ...toSummary(u), isFollowing: db.followedUserIds.includes(u.id) }));
  return paginate(followers, query);
});

route('GET', '/users/:username/following', ({ query }) => {
  const db = getDb();
  const following = db.users
    .filter((u) => db.followedUserIds.includes(u.id))
    .map((u) => ({ ...toSummary(u), isFollowing: true }));
  return paginate(following, query);
});

route('POST', '/users/:userId/follow', ({ params }) => {
  const db = getDb();
  const target = db.users.find((u) => u.id === params.userId);
  if (!target) throw new ApiError('NOT_FOUND', 'User not found', 404);
  if (!db.followedUserIds.includes(target.id)) {
    db.followedUserIds.push(target.id);
    target.followersCount += 1;
  }
  persistDb();
  return { following: true, followersCount: target.followersCount };
});

route('DELETE', '/users/:userId/follow', ({ params }) => {
  const db = getDb();
  const target = db.users.find((u) => u.id === params.userId);
  if (!target) throw new ApiError('NOT_FOUND', 'User not found', 404);
  db.followedUserIds = db.followedUserIds.filter((id) => id !== target.id);
  target.followersCount = Math.max(0, target.followersCount - 1);
  persistDb();
  return { following: false, followersCount: target.followersCount };
});

route('PATCH', '/users/me/goal', ({ body }) => {
  const user = getDb().users.find((u) => u.id === CURRENT_USER_ID)!;
  const target = Number(body?.target);
  if (!Number.isFinite(target) || target < 1 || target > 999) {
    throw new ApiError('VALIDATION_ERROR', 'Target must be between 1 and 999', 422);
  }
  user.goal = { ...user.goal, target: Math.round(target) };
  persistDb();
  return hydrateUser(user).goal;
});

route('PATCH', '/users/me/preferences', ({ body }) => {
  const user = getDb().users.find((u) => u.id === CURRENT_USER_ID)!;
  if (Array.isArray(body?.favoriteGenres)) user.favoriteGenres = body.favoriteGenres;
  if (Array.isArray(body?.favoriteAuthorIds)) user.favoriteAuthorIds = body.favoriteAuthorIds;
  persistDb();
  return hydrateUser(user);
});

route('GET', '/users/:username/activity', ({ params, query }) => {
  const user = findUserByUsername(params.username);
  return paginate(activityFor(user.id), query);
});

route('GET', '/feed', ({ query }) => {
  const db = getDb();
  const ids = db.followedUserIds.length ? db.followedUserIds : db.users.slice(1, 6).map((u) => u.id);
  const items = ids.flatMap((id) => activityFor(id)).sort(byNewest);
  return paginate(items, query);
});

function byNewest(a: { createdAt: string }, b: { createdAt: string }) {
  return +new Date(b.createdAt) - +new Date(a.createdAt);
}

function activityFor(userId: string): ActivityItem[] {
  const db = getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return [];
  const summary = toSummary(user);

  const fromShelves: ActivityItem[] = db.shelfEntries
    .filter((e) => e.userId === userId && (e.status === 'read' || e.status === 'reading'))
    .map((e) => {
      const book = db.books.find((b) => b.id === e.bookId)!;
      return {
        id: `act_${e.id}`,
        kind: e.status === 'read' ? 'finished_book' : 'started_book',
        user: summary,
        book: { id: book.id, title: book.title, authorName: book.authorName, coverUrl: book.coverUrl },
        createdAt: e.finishedAt ?? e.startedAt ?? e.addedAt,
      } satisfies ActivityItem;
    });

  const fromQuotes: ActivityItem[] = db.quotes
    .filter((qt) => qt.user.id === userId)
    .map((qt) => ({
      id: `act_${qt.id}`,
      kind: 'posted_quote',
      user: summary,
      book: qt.book,
      quoteId: qt.id,
      createdAt: qt.createdAt,
    }));

  const fromReviews: ActivityItem[] = db.reviews
    .filter((r) => r.user.id === userId)
    .map((r) => {
      const book = db.books.find((b) => b.id === r.bookId)!;
      return {
        id: `act_${r.id}`,
        kind: 'posted_review',
        user: summary,
        book: { id: book.id, title: book.title, authorName: book.authorName, coverUrl: book.coverUrl },
        reviewId: r.id,
        createdAt: r.createdAt,
      } satisfies ActivityItem;
    });

  return [...fromShelves, ...fromQuotes, ...fromReviews].sort(byNewest);
}

/* ---- books, search, authors, genres ---- */

route('GET', '/books', ({ query }) => {
  const db = getDb();
  const term = q(query, 'q')?.trim();
  const genres = qList(query, 'genres') as GenreSlug[];
  const languages = qList(query, 'languages') as BookLanguage[];
  const minRating = qNum(query, 'minRating');
  const minPrice = qNum(query, 'minPrice');
  const maxPrice = qNum(query, 'maxPrice');
  const sort = q(query, 'sort') ?? 'relevance';
  const authorId = q(query, 'authorId');
  const publisherId = q(query, 'publisherId');

  let result = db.books.slice();

  if (term) {
    const needle = normalize(term);
    result = result.filter(
      (b) =>
        normalize(b.title).includes(needle) ||
        normalize(b.authorName).includes(needle) ||
        b.isbn.includes(term) ||
        normalize(b.publisherName).includes(needle),
    );
  }
  if (genres.length) result = result.filter((b) => b.genres.some((g) => genres.includes(g)));
  if (languages.length) result = result.filter((b) => languages.includes(b.language));
  if (minRating !== undefined) result = result.filter((b) => b.ratingAverage >= minRating);
  if (minPrice !== undefined) result = result.filter((b) => b.price >= minPrice);
  if (maxPrice !== undefined) result = result.filter((b) => b.price <= maxPrice);
  if (authorId) result = result.filter((b) => b.authorId === authorId);
  if (publisherId) result = result.filter((b) => b.publisherId === publisherId);

  switch (sort) {
    case 'rating':
      result.sort((a, b) => b.ratingAverage - a.ratingAverage);
      break;
    case 'newest':
      result.sort((a, b) => b.publishedYear - a.publishedYear);
      break;
    case 'price_asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      result.sort((a, b) => b.price - a.price);
      break;
    default:
      if (term) {
        const needle = normalize(term);
        // Prefix matches on the title rank above substring matches elsewhere.
        result.sort(
          (a, b) =>
            Number(normalize(b.title).startsWith(needle)) -
            Number(normalize(a.title).startsWith(needle)),
        );
      } else {
        result.sort((a, b) => b.ratingCount - a.ratingCount);
      }
  }

  const page = paginate(decorate(result), query);

  // "Did you mean…?" — only when the query found nothing.
  let suggestion: string | null = null;
  if (term && result.length === 0) {
    const needle = normalize(term);
    let best: { value: string; distance: number } | null = null;
    for (const book of db.books) {
      for (const candidate of [book.title, book.authorName]) {
        const distance = levenshtein(needle, normalize(candidate).slice(0, needle.length + 3));
        if (distance <= Math.max(2, Math.floor(needle.length / 3))) {
          if (!best || distance < best.distance) best = { value: candidate, distance };
        }
      }
    }
    suggestion = best?.value ?? null;
  }

  return { ...page, meta: { ...page.meta, suggestion } };
});

route('GET', '/books/trending', ({ query }) => {
  const list = getDb()
    .books.slice()
    .sort((a, b) => b.ratingCount * b.ratingAverage - a.ratingCount * a.ratingAverage);
  return paginate(decorate(list), { limit: 12, ...query });
});

route('GET', '/books/new-releases', ({ query }) => {
  const list = getDb()
    .books.slice()
    .sort((a, b) => b.publishedYear - a.publishedYear);
  return paginate(decorate(list), { limit: 12, ...query });
});

route('GET', '/books/recommendations', ({ query }) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
  const owned = new Set(
    db.shelfEntries.filter((e) => e.userId === CURRENT_USER_ID).map((e) => e.bookId),
  );
  // Score by overlap with the genres chosen during onboarding, then rating.
  const scored = db.books
    .filter((b) => !owned.has(b.id))
    .map((b) => ({
      book: b,
      score:
        b.genres.filter((g) => user.favoriteGenres.includes(g)).length * 3 +
        (user.favoriteAuthorIds.includes(b.authorId) ? 4 : 0) +
        b.ratingAverage / 2,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.book);

  return paginate(decorate(scored), { limit: 12, ...query });
});

route('GET', '/books/:id', ({ params }) => findBook(params.id));

route('GET', '/books/:id/similar', ({ params, query }) => {
  const db = getDb();
  const book = findBook(params.id);
  const scored = db.books
    .filter((b) => b.id !== book.id)
    .map((b) => ({
      book: b,
      score:
        b.genres.filter((g) => book.genres.includes(g)).length * 2 +
        (b.authorId === book.authorId ? 3 : 0) +
        (b.language === book.language ? 1 : 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.book.ratingAverage - a.book.ratingAverage)
    .map((s) => s.book);

  return paginate(decorate(scored), { limit: 10, ...query });
});

route('GET', '/books/:id/reviews', ({ params, query }) => {
  const db = getDb();
  const list = db.reviews
    .filter((r) => r.bookId === params.id)
    .map((r) => ({ ...r, isLiked: db.likedReviews.includes(r.id) }))
    .sort(byNewest);
  return paginate(list, query);
});

route('GET', '/books/:id/quotes', ({ params, query }) => {
  const db = getDb();
  const list = db.quotes
    .filter((qt) => qt.bookId === params.id)
    .map((qt) => ({ ...qt, isLiked: db.likedQuotes.includes(qt.id) }))
    .sort(byNewest);
  return paginate(list, query);
});

route('GET', '/search/suggest', ({ query }) => {
  const term = q(query, 'q')?.trim();
  if (!term) return { books: [], authors: [], recent: getDb().recentSearches.slice(0, 6) };
  const needle = normalize(term);
  const db = getDb();

  const matchedBooks = db.books
    .filter((b) => normalize(b.title).includes(needle))
    .slice(0, 5)
    .map((b) => ({ id: b.id, title: b.title, authorName: b.authorName }));

  const matchedAuthors = db.authors
    .filter((a) => normalize(a.name).includes(needle))
    .slice(0, 3)
    .map((a) => ({ id: a.id, name: a.name }));

  return { books: matchedBooks, authors: matchedAuthors, recent: [] };
});

route('POST', '/search/suggest', ({ body }) => {
  const db = getDb();
  const term = String(body?.q ?? '').trim();
  if (term) {
    db.recentSearches = [term, ...db.recentSearches.filter((s) => s !== term)].slice(0, 8);
    persistDb();
  }
  return { success: true };
});

route('GET', '/authors/:id', ({ params }) => {
  const db = getDb();
  const author = db.authors.find((a) => a.id === params.id);
  if (!author) throw new ApiError('NOT_FOUND', 'Author not found', 404);
  return { ...author, isFollowing: db.followedAuthorIds.includes(author.id) };
});

route('GET', '/authors/:id/books', ({ params, query }) => {
  const list = getDb().books.filter((b) => b.authorId === params.id);
  return paginate(decorate(list), query);
});

route('POST', '/authors/:id/follow', ({ params }) => {
  const db = getDb();
  if (!db.followedAuthorIds.includes(params.id)) db.followedAuthorIds.push(params.id);
  persistDb();
  return { following: true };
});

route('DELETE', '/authors/:id/follow', ({ params }) => {
  const db = getDb();
  db.followedAuthorIds = db.followedAuthorIds.filter((id) => id !== params.id);
  persistDb();
  return { following: false };
});

route('GET', '/genres', () => {
  const counts = new Map<GenreSlug, number>();
  for (const book of getDb().books) {
    book.genres.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1));
  }
  return [...counts.entries()]
    .map(([slug, bookCount]) => ({ slug, bookCount }))
    .sort((a, b) => b.bookCount - a.bookCount);
});

/* ---- shelves ---- */

route('GET', '/shelves', () => shelvesForUser(CURRENT_USER_ID));

route('POST', '/shelves', ({ body }) => {
  const name = String(body?.name ?? '').trim();
  if (name.length < 2) throw new ApiError('VALIDATION_ERROR', 'Shelf name is too short', 422);
  const db = getDb();
  db.shelves.push({
    id: nextId('sh'),
    userId: CURRENT_USER_ID,
    status: null,
    name,
    isDefault: false,
  });
  persistDb();
  return shelvesForUser(CURRENT_USER_ID);
});

route('PATCH', '/shelves/:id', ({ params, body }) => {
  const db = getDb();
  const shelf = db.shelves.find((s) => s.id === params.id && s.userId === CURRENT_USER_ID);
  if (!shelf) throw new ApiError('NOT_FOUND', 'Shelf not found', 404);
  if (shelf.isDefault) throw new ApiError('FORBIDDEN', 'Default shelves cannot be renamed', 403);
  if (typeof body?.name === 'string') shelf.name = body.name.trim();
  persistDb();
  return shelvesForUser(CURRENT_USER_ID);
});

route('DELETE', '/shelves/:id', ({ params }) => {
  const db = getDb();
  const shelf = db.shelves.find((s) => s.id === params.id && s.userId === CURRENT_USER_ID);
  if (!shelf) throw new ApiError('NOT_FOUND', 'Shelf not found', 404);
  if (shelf.isDefault) throw new ApiError('FORBIDDEN', 'Default shelves cannot be deleted', 403);
  db.shelves = db.shelves.filter((s) => s.id !== shelf.id);
  // Books stay in the library; only the custom grouping disappears.
  db.shelfEntries = db.shelfEntries.filter((e) => e.shelfId !== shelf.id);
  persistDb();
  return shelvesForUser(CURRENT_USER_ID);
});

route('GET', '/shelves/:id/books', ({ params, query }) => {
  const entries = getDb()
    .shelfEntries.filter((e) => e.shelfId === params.id)
    .sort((a, b) => +new Date(b.addedAt) - +new Date(a.addedAt))
    .map(toShelfEntry);
  return paginate(entries, query);
});

route('PUT', '/books/:bookId/shelf', ({ params, body }) => {
  const db = getDb();
  const book = db.books.find((b) => b.id === params.bookId);
  if (!book) throw new ApiError('NOT_FOUND', 'Book not found', 404);

  const status = body?.status as ShelfStatus | undefined;
  if (!status || !['reading', 'read', 'want_to_read', 'dnf'].includes(status)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid shelf status', 422);
  }

  const shelf =
    (body?.shelfId
      ? db.shelves.find((s) => s.id === body.shelfId && s.userId === CURRENT_USER_ID)
      : undefined) ??
    db.shelves.find((s) => s.userId === CURRENT_USER_ID && s.status === status)!;

  const progressPage =
    status === 'read' ? book.pageCount : Math.max(0, Number(body?.progressPage ?? 0));

  const existing = db.shelfEntries.find(
    (e) => e.userId === CURRENT_USER_ID && e.bookId === book.id,
  );

  if (existing) {
    existing.shelfId = shelf.id;
    existing.status = status;
    existing.progressPage = progressPage;
    if (status === 'read' && !existing.finishedAt) existing.finishedAt = nowIso();
    if (status !== 'read') existing.finishedAt = null;
    if (status !== 'want_to_read' && !existing.startedAt) existing.startedAt = nowIso();
  } else {
    db.shelfEntries.push({
      id: nextId('se'),
      userId: CURRENT_USER_ID,
      bookId: book.id,
      shelfId: shelf.id,
      status,
      progressPage,
      startedAt: status === 'want_to_read' ? null : nowIso(),
      finishedAt: status === 'read' ? nowIso() : null,
      addedAt: nowIso(),
    });
  }

  // Finishing a book can complete the yearly goal.
  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
  const stats = computeStats(CURRENT_USER_ID);
  if (status === 'read' && stats.booksRead === user.goal.target) {
    pushNotification({ type: 'goal_reached', params: {}, actor: null, link: '/profile' });
  }

  persistDb();
  return findBook(book.id);
});

route('DELETE', '/books/:bookId/shelf', ({ params }) => {
  const db = getDb();
  db.shelfEntries = db.shelfEntries.filter(
    (e) => !(e.userId === CURRENT_USER_ID && e.bookId === params.bookId),
  );
  persistDb();
  return findBook(params.bookId);
});

route('PATCH', '/books/:bookId/progress', ({ params, body }) => {
  const db = getDb();
  const book = db.books.find((b) => b.id === params.bookId);
  if (!book) throw new ApiError('NOT_FOUND', 'Book not found', 404);

  const page = Math.max(0, Math.min(book.pageCount, Number(body?.page ?? 0)));
  const entry = db.shelfEntries.find(
    (e) => e.userId === CURRENT_USER_ID && e.bookId === book.id,
  );
  if (!entry) throw new ApiError('NOT_FOUND', 'Book is not on any shelf', 404);

  entry.progressPage = page;
  // Reaching the last page moves the book to "read" automatically.
  if (page >= book.pageCount) {
    entry.status = 'read';
    entry.shelfId = db.shelves.find(
      (s) => s.userId === CURRENT_USER_ID && s.status === 'read',
    )!.id;
    entry.finishedAt = nowIso();
  } else if (entry.status !== 'reading') {
    entry.status = 'reading';
    entry.shelfId = db.shelves.find(
      (s) => s.userId === CURRENT_USER_ID && s.status === 'reading',
    )!.id;
  }

  // Any progress update counts as reading activity for the streak.
  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
  if (!user.stats.readToday) {
    user.stats.readToday = true;
    user.stats.streakDays += 1;
    user.stats.longestStreak = Math.max(user.stats.longestStreak, user.stats.streakDays);
  }

  persistDb();
  return findBook(book.id);
});

/* ---- reviews ---- */

route('GET', '/reviews/:id', ({ params }) => {
  const db = getDb();
  const review = db.reviews.find((r) => r.id === params.id);
  if (!review) throw new ApiError('NOT_FOUND', 'Review not found', 404);
  return { ...review, isLiked: db.likedReviews.includes(review.id) };
});

route('POST', '/reviews', ({ body }) => {
  const db = getDb();
  const book = db.books.find((b) => b.id === body?.bookId);
  if (!book) throw new ApiError('NOT_FOUND', 'Book not found', 404);

  const rating = Number(body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    throw new ApiError('VALIDATION_ERROR', 'Rating must be between 1 and 10', 422);
  }

  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
  const review: Review = {
    id: nextId('r'),
    bookId: book.id,
    user: toSummary(user),
    rating: Math.round(rating),
    body: String(body?.body ?? '').trim(),
    isSpoiler: !!body?.isSpoiler,
    photos: Array.isArray(body?.photos) ? body.photos : [],
    likesCount: 0,
    commentsCount: 0,
    isLiked: false,
    createdAt: nowIso(),
  };

  db.reviews.unshift(review);

  // Keep the aggregate in sync so the book page updates immediately.
  const total = book.ratingAverage * book.ratingCount + review.rating;
  book.ratingCount += 1;
  book.reviewsCount += 1;
  book.ratingAverage = Math.round((total / book.ratingCount) * 10) / 10;

  persistDb();
  return review;
});

route('PATCH', '/reviews/:id', ({ params, body }) => {
  const db = getDb();
  const review = db.reviews.find((r) => r.id === params.id);
  if (!review) throw new ApiError('NOT_FOUND', 'Review not found', 404);
  if (review.user.id !== CURRENT_USER_ID) throw new ApiError('FORBIDDEN', 'Not your review', 403);
  if (body?.rating) review.rating = Math.round(Number(body.rating));
  if (typeof body?.body === 'string') review.body = body.body;
  if (typeof body?.isSpoiler === 'boolean') review.isSpoiler = body.isSpoiler;
  persistDb();
  return review;
});

route('DELETE', '/reviews/:id', ({ params }) => {
  const db = getDb();
  const review = db.reviews.find((r) => r.id === params.id);
  if (!review) throw new ApiError('NOT_FOUND', 'Review not found', 404);
  if (review.user.id !== CURRENT_USER_ID) throw new ApiError('FORBIDDEN', 'Not your review', 403);
  db.reviews = db.reviews.filter((r) => r.id !== review.id);
  persistDb();
  return { success: true };
});

route('POST', '/reviews/:id/like', ({ params }) => toggleLike('review', params.id, true));
route('DELETE', '/reviews/:id/like', ({ params }) => toggleLike('review', params.id, false));

route('GET', '/reviews/:id/comments', ({ params, query }) =>
  paginate(commentsFor('review', params.id), query),
);

route('POST', '/reviews/:id/comments', ({ params, body }) =>
  addComment('review', params.id, String(body?.body ?? '')),
);

/* ---- quotes ---- */

route('GET', '/quotes', ({ query }) => {
  const db = getDb();
  const bookId = q(query, 'bookId');
  const userId = q(query, 'userId');
  const sort = q(query, 'sort') ?? 'newest';

  let list = db.quotes.slice();
  if (bookId) list = list.filter((qt) => qt.bookId === bookId);
  if (userId) list = list.filter((qt) => qt.user.id === userId);

  list = list.map((qt) => ({ ...qt, isLiked: db.likedQuotes.includes(qt.id) }));
  list.sort(sort === 'popular' ? (a, b) => b.likesCount - a.likesCount : byNewest);

  return paginate(list, query);
});

route('GET', '/quotes/:id', ({ params }) => {
  const db = getDb();
  const quote = db.quotes.find((qt) => qt.id === params.id);
  if (!quote) throw new ApiError('NOT_FOUND', 'Quote not found', 404);
  return { ...quote, isLiked: db.likedQuotes.includes(quote.id) };
});

route('POST', '/quotes', ({ body }) => {
  const db = getDb();
  const book = db.books.find((b) => b.id === body?.bookId);
  if (!book) throw new ApiError('NOT_FOUND', 'Book not found', 404);

  const text = String(body?.text ?? '').trim();
  if (text.length < 5) throw new ApiError('VALIDATION_ERROR', 'Quote is too short', 422);
  if (text.length > 1000) throw new ApiError('VALIDATION_ERROR', 'Quote is too long', 422);

  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
  const quote: Quote = {
    id: nextId('q'),
    bookId: book.id,
    book: { id: book.id, title: book.title, authorName: book.authorName, coverUrl: book.coverUrl },
    user: toSummary(user),
    text,
    page: body?.page ? Number(body.page) : null,
    background: String(body?.background ?? 'paper'),
    likesCount: 0,
    commentsCount: 0,
    isLiked: false,
    createdAt: nowIso(),
  };

  db.quotes.unshift(quote);
  book.quotesCount += 1;
  persistDb();
  return quote;
});

route('DELETE', '/quotes/:id', ({ params }) => {
  const db = getDb();
  const quote = db.quotes.find((qt) => qt.id === params.id);
  if (!quote) throw new ApiError('NOT_FOUND', 'Quote not found', 404);
  if (quote.user.id !== CURRENT_USER_ID) throw new ApiError('FORBIDDEN', 'Not your quote', 403);
  db.quotes = db.quotes.filter((qt) => qt.id !== quote.id);
  persistDb();
  return { success: true };
});

route('POST', '/quotes/:id/like', ({ params }) => toggleLike('quote', params.id, true));
route('DELETE', '/quotes/:id/like', ({ params }) => toggleLike('quote', params.id, false));

route('GET', '/quotes/:id/comments', ({ params, query }) =>
  paginate(commentsFor('quote', params.id), query),
);

route('POST', '/quotes/:id/comments', ({ params, body }) =>
  addComment('quote', params.id, String(body?.body ?? '')),
);

function toggleLike(kind: 'review' | 'quote', id: string, liked: boolean) {
  const db = getDb();
  const collection = kind === 'review' ? db.reviews : db.quotes;
  const item = (collection as { id: string; likesCount: number }[]).find((x) => x.id === id);
  if (!item) throw new ApiError('NOT_FOUND', 'Not found', 404);

  const bucket = kind === 'review' ? db.likedReviews : db.likedQuotes;
  const already = bucket.includes(id);

  if (liked && !already) {
    bucket.push(id);
    item.likesCount += 1;
  } else if (!liked && already) {
    const next = bucket.filter((x) => x !== id);
    if (kind === 'review') db.likedReviews = next;
    else db.likedQuotes = next;
    item.likesCount = Math.max(0, item.likesCount - 1);
  }

  persistDb();
  return { liked, likesCount: item.likesCount };
}

/** Comments are generated on demand — the seed does not ship a comment table. */
const commentStore = new Map<string, { id: string; user: any; body: string; createdAt: string }[]>();

function commentsFor(kind: 'review' | 'quote', id: string) {
  const key = `${kind}:${id}`;
  if (!commentStore.has(key)) {
    const db = getDb();
    const sample = ['Çox doğru deyilib 👏', 'Mən də eyni fikirdəyəm.', 'Bu kitabı siyahıma əlavə etdim, sağ ol!'];
    const count = (id.charCodeAt(id.length - 1) + kind.length) % 3;
    commentStore.set(
      key,
      Array.from({ length: count }, (_, i) => ({
        id: `c_${id}_${i}`,
        targetType: kind,
        targetId: id,
        user: toSummary(db.users[(i + 3) % db.users.length]),
        body: sample[i % sample.length],
        createdAt: seed.daysAgo(i + 1),
      })),
    );
  }
  return commentStore.get(key)!;
}

function addComment(kind: 'review' | 'quote', id: string, body: string) {
  const text = body.trim();
  if (!text) throw new ApiError('VALIDATION_ERROR', 'Comment cannot be empty', 422);

  const db = getDb();
  const list = commentsFor(kind, id);
  const comment = {
    id: nextId('c'),
    targetType: kind,
    targetId: id,
    user: toSummary(db.users.find((u) => u.id === CURRENT_USER_ID)!),
    body: text,
    createdAt: nowIso(),
  };
  list.unshift(comment);

  const collection = kind === 'review' ? db.reviews : db.quotes;
  const item = (collection as { id: string; commentsCount: number }[]).find((x) => x.id === id);
  if (item) item.commentsCount += 1;

  persistDb();
  return comment;
}

/* ---- OCR & uploads ---- */

route('POST', '/ocr/extract', () => {
  // The real backend hands the image to an OCR service (see
  // backend-guide/INTEGRATIONS.md). The mock returns a plausible passage so the
  // quote composer flow can be demonstrated end to end.
  const samples = [
    'Hər kəs dünyanı dəyişdirmək istəyir, amma heç kim özünü dəyişdirmək istəmir.',
    'Kitablar insanın öz-özü ilə apardığı ən uzun söhbətdir.',
    'Yalnız itirdiyimiz şeylərin əsl qiymətini bilirik, çünki onlar bizi tərk edərkən danışmağa başlayır.',
  ];
  return {
    text: samples[Math.floor(Math.random() * samples.length)],
    confidence: 0.93,
  };
});

route('POST', '/uploads', ({ body }) => ({
  url: String(body?.uri ?? ''),
  id: nextId('up'),
}));

/* ---- buddy reads ---- */

route('GET', '/buddy-reads', ({ query }) => {
  const db = getDb();
  const mine = db.buddyReads.filter((br) =>
    br.members.some((m) => m.user.id === CURRENT_USER_ID),
  );
  const discover = db.buddyReads.filter(
    (br) => !br.members.some((m) => m.user.id === CURRENT_USER_ID),
  );
  return paginate([...mine, ...discover], query);
});

route('POST', '/buddy-reads', ({ body }) => {
  const db = getDb();
  const book = db.books.find((b) => b.id === body?.bookId);
  if (!book) throw new ApiError('NOT_FOUND', 'Book not found', 404);
  const name = String(body?.name ?? '').trim();
  if (name.length < 2) throw new ApiError('VALIDATION_ERROR', 'Name is too short', 422);

  const user = db.users.find((u) => u.id === CURRENT_USER_ID)!;
  const buddy: BuddyRead = {
    id: nextId('br'),
    name,
    bookId: book.id,
    book: {
      id: book.id,
      title: book.title,
      authorName: book.authorName,
      coverUrl: book.coverUrl,
      pageCount: book.pageCount,
    },
    ownerId: user.id,
    members: [{ user: toSummary(user), progressPage: 0 }],
    targetDate: body?.targetDate ?? null,
    messagesCount: 0,
    createdAt: nowIso(),
  };
  db.buddyReads.unshift(buddy);
  persistDb();
  return buddy;
});

route('GET', '/buddy-reads/:id', ({ params }) => {
  const buddy = getDb().buddyReads.find((br) => br.id === params.id);
  if (!buddy) throw new ApiError('NOT_FOUND', 'Buddy read not found', 404);
  return buddy;
});

route('POST', '/buddy-reads/:id/join', ({ params }) => {
  const db = getDb();
  const buddy = db.buddyReads.find((br) => br.id === params.id);
  if (!buddy) throw new ApiError('NOT_FOUND', 'Buddy read not found', 404);
  if (!buddy.members.some((m) => m.user.id === CURRENT_USER_ID)) {
    buddy.members.push({
      user: toSummary(db.users.find((u) => u.id === CURRENT_USER_ID)!),
      progressPage: 0,
    });
  }
  persistDb();
  return buddy;
});

route('DELETE', '/buddy-reads/:id/members/me', ({ params }) => {
  const db = getDb();
  const buddy = db.buddyReads.find((br) => br.id === params.id);
  if (!buddy) throw new ApiError('NOT_FOUND', 'Buddy read not found', 404);
  buddy.members = buddy.members.filter((m) => m.user.id !== CURRENT_USER_ID);
  persistDb();
  return buddy;
});

route('PATCH', '/buddy-reads/:id/progress', ({ params, body }) => {
  const db = getDb();
  const buddy = db.buddyReads.find((br) => br.id === params.id);
  if (!buddy) throw new ApiError('NOT_FOUND', 'Buddy read not found', 404);
  const member = buddy.members.find((m) => m.user.id === CURRENT_USER_ID);
  if (member) member.progressPage = Math.max(0, Number(body?.page ?? 0));
  persistDb();
  return buddy;
});

route('GET', '/buddy-reads/:id/messages', ({ params, query }) => {
  const list = getDb()
    .buddyMessages.filter((m) => m.buddyReadId === params.id)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  return paginate(list, { limit: 100, ...query });
});

route('POST', '/buddy-reads/:id/messages', ({ params, body }) => {
  const db = getDb();
  const buddy = db.buddyReads.find((br) => br.id === params.id);
  if (!buddy) throw new ApiError('NOT_FOUND', 'Buddy read not found', 404);
  const text = String(body?.body ?? '').trim();
  if (!text) throw new ApiError('VALIDATION_ERROR', 'Message cannot be empty', 422);

  const message = {
    id: nextId('bm'),
    buddyReadId: buddy.id,
    user: toSummary(db.users.find((u) => u.id === CURRENT_USER_ID)!),
    body: text,
    chapter: body?.chapter ?? null,
    createdAt: nowIso(),
  };
  db.buddyMessages.push(message);
  buddy.messagesCount += 1;
  persistDb();
  return message;
});

/* ---- cart ---- */

route('GET', '/cart', () => buildCart());

route('POST', '/cart/items', ({ body }) => {
  const db = getDb();
  const book = db.books.find((b) => b.id === body?.bookId);
  if (!book) throw new ApiError('NOT_FOUND', 'Book not found', 404);
  if (book.stock <= 0) throw new ApiError('OUT_OF_STOCK', 'Book is out of stock', 409);

  const quantity = Math.max(1, Number(body?.quantity ?? 1));
  const line = db.cart.find((l) => l.bookId === book.id);
  const nextQuantity = (line?.quantity ?? 0) + quantity;
  if (nextQuantity > book.stock) throw new ApiError('OUT_OF_STOCK', 'Not enough stock', 409);

  if (line) line.quantity = nextQuantity;
  else db.cart.push({ bookId: book.id, quantity });

  persistDb();
  return buildCart();
});

route('PATCH', '/cart/items/:bookId', ({ params, body }) => {
  const db = getDb();
  const line = db.cart.find((l) => l.bookId === params.bookId);
  if (!line) throw new ApiError('NOT_FOUND', 'Item not in cart', 404);
  const quantity = Math.max(0, Number(body?.quantity ?? 1));
  const book = db.books.find((b) => b.id === params.bookId);
  if (book && quantity > book.stock) throw new ApiError('OUT_OF_STOCK', 'Not enough stock', 409);

  if (quantity === 0) db.cart = db.cart.filter((l) => l.bookId !== params.bookId);
  else line.quantity = quantity;

  persistDb();
  return buildCart();
});

route('DELETE', '/cart/items/:bookId', ({ params }) => {
  const db = getDb();
  db.cart = db.cart.filter((l) => l.bookId !== params.bookId);
  persistDb();
  return buildCart();
});

route('DELETE', '/cart', () => {
  getDb().cart = [];
  persistDb();
  return buildCart();
});

/* ---- orders, payments, wallet ---- */

route('POST', '/orders', ({ body }) => createOrders(body));

route('GET', '/orders', ({ query }) => {
  const list = getDb().orders.map(advanceOrder).sort(byNewest);
  return paginate(list, query);
});

route('GET', '/orders/:id', ({ params }) => {
  const order = getDb().orders.find((o) => o.id === params.id);
  if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
  return advanceOrder(order);
});

route('POST', '/orders/:id/cancel', ({ params }) => {
  const order = getDb().orders.find((o) => o.id === params.id);
  if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
  if (['shipped', 'out_for_delivery', 'delivered'].includes(order.status)) {
    throw new ApiError('CONFLICT', 'Order can no longer be cancelled', 409);
  }
  order.status = 'cancelled';
  order.timeline.push({ status: 'cancelled', at: nowIso() });
  persistDb();
  return order;
});

route('GET', '/orders/:id/receipt', ({ params }) => {
  const order = getDb().orders.find((o) => o.id === params.id);
  if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
  return {
    orderId: order.id,
    code: order.code,
    issuedAt: nowIso(),
    // The real backend returns a signed PDF URL; the app renders this payload.
    url: null,
    lines: order.items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unitPrice: i.price,
      total: round2(i.price * i.quantity),
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    total: order.total,
  };
});

route('POST', '/payments/initiate', ({ body }) => ({
  reference: nextId('pay'),
  // Payriff would return a hosted checkout URL here.
  redirectUrl: null,
  amount: Number(body?.amount ?? 0),
  status: 'requires_confirmation',
}));

route('POST', '/payments/:reference/verify', () => ({ status: 'paid' }));

route('GET', '/wallet', () => {
  const user = getDb().users.find((u) => u.id === CURRENT_USER_ID)!;
  return { balance: user.walletBalance, currency: 'AZN' };
});

route('POST', '/gift-cards/redeem', ({ body }) => {
  const db = getDb();
  const code = String(body?.code ?? '').toUpperCase();
  const card = db.giftCards.find((c) => c.code === code);
  if (!card || card.used) throw new ApiError('VALIDATION_ERROR', 'Invalid or used gift card', 422);
  return { code: card.code, amount: card.amount, valid: true };
});

/* ---- gamification ---- */

route('GET', '/badges', () => badgesForUser());
route('GET', '/users/:username/badges', () => badgesForUser());

route('GET', '/leaderboard', ({ query }) => {
  const metric = (q(query, 'metric') ?? 'books') as 'books' | 'pages';
  const period = q(query, 'period') ?? 'weekly';
  const db = getDb();

  const scale = period === 'weekly' ? 0.12 : period === 'monthly' ? 0.4 : 1;

  const entries: LeaderboardEntry[] = db.users
    .map((u) => {
      const stats = computeStats(u.id);
      return {
        rank: 0,
        user: toSummary(u),
        books: Math.max(1, Math.round(stats.booksRead * scale)),
        pages: Math.max(10, Math.round(stats.pagesRead * scale)),
        isMe: u.id === CURRENT_USER_ID,
      };
    })
    .sort((a, b) => (metric === 'books' ? b.books - a.books : b.pages - a.pages))
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return paginate(entries, { limit: 50, ...query });
});

route('GET', '/streak', () => {
  const stats = computeStats(CURRENT_USER_ID);
  return {
    current: stats.streakDays,
    longest: stats.longestStreak,
    readToday: stats.readToday,
    weeklyPages: stats.weeklyPages,
  };
});

route('POST', '/streak/check-in', () => {
  const user = getDb().users.find((u) => u.id === CURRENT_USER_ID)!;
  if (!user.stats.readToday) {
    user.stats.readToday = true;
    user.stats.streakDays += 1;
    user.stats.longestStreak = Math.max(user.stats.longestStreak, user.stats.streakDays);
    persistDb();
  }
  return {
    current: user.stats.streakDays,
    longest: user.stats.longestStreak,
    readToday: true,
  };
});

/* ---- notifications ---- */

route('GET', '/notifications', ({ query }) => {
  const list = getDb().notifications.slice().sort(byNewest);
  return paginate(list, query);
});

route('POST', '/notifications/read-all', () => {
  getDb().notifications.forEach((n) => (n.read = true));
  persistDb();
  return { success: true };
});

route('PATCH', '/notifications/:id/read', ({ params }) => {
  const n = getDb().notifications.find((x) => x.id === params.id);
  if (n) n.read = true;
  persistDb();
  return { success: true };
});

route('POST', '/notifications/device-token', () => ({ success: true }));

/* ---- reports ---- */

route('POST', '/reports', ({ body }) => {
  const db = getDb();
  const report: Report = {
    id: nextId('rp'),
    targetType: body?.targetType === 'quote' ? 'quote' : 'review',
    targetId: String(body?.targetId ?? ''),
    reason: body?.reason ?? 'other',
    note: body?.note ?? null,
    reportedBy: toSummary(db.users.find((u) => u.id === CURRENT_USER_ID)!),
    status: 'open',
    createdAt: nowIso(),
    snapshot: {
      text: String(body?.snapshotText ?? ''),
      authorName: String(body?.snapshotAuthor ?? ''),
      bookTitle: body?.snapshotBook ?? null,
    },
  };
  db.reports.unshift(report);
  persistDb();
  return report;
});

/* ---- publisher ---- */

function requirePublisher(): string {
  const db = getDb();
  if (db.demoRole !== 'publisher') {
    throw new ApiError('FORBIDDEN', 'Publisher role required', 403);
  }
  return db.demoPublisherId;
}

route('GET', '/publisher/stats', () => {
  const publisherId = requirePublisher();
  const db = getDb();
  const own = db.books.filter((b) => b.publisherId === publisherId);
  const orders = db.orders.filter((o) => o.publisherId === publisherId);

  // Deterministic synthetic sales so the dashboard is populated before any
  // real order exists in the demo.
  const syntheticUnits = own.reduce((sum, b) => sum + (b.ratingCount % 60), 0);
  const syntheticRevenue = own.reduce((sum, b) => sum + b.price * (b.ratingCount % 60), 0);

  const months = ['Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq'];
  const salesTrend = months.map((month, i) => ({
    month,
    revenue: round2((syntheticRevenue / 6) * (0.7 + ((i * 13) % 7) / 10)),
  }));

  const topBooks = own
    .slice()
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, 5)
    .map((book) => ({
      book,
      units: book.ratingCount % 60,
      revenue: round2(book.price * (book.ratingCount % 60)),
    }));

  const genreRevenue = new Map<GenreSlug, number>();
  for (const book of own) {
    const revenue = book.price * (book.ratingCount % 60);
    book.genres.forEach((g) => genreRevenue.set(g, (genreRevenue.get(g) ?? 0) + revenue));
  }

  const stats: PublisherStats = {
    revenue: round2(syntheticRevenue + orders.reduce((s, o) => s + o.total, 0)),
    unitsSold: syntheticUnits + orders.reduce((s, o) => s + o.items.length, 0),
    pendingOrders: orders.filter((o) => ['pending', 'confirmed', 'preparing'].includes(o.status))
      .length,
    activeBooks: own.filter((b) => b.stock > 0).length,
    salesTrend,
    topBooks,
    revenueByGenre: [...genreRevenue.entries()]
      .map(([genre, revenue]) => ({ genre, revenue: round2(revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6),
  };

  return stats;
});

route('GET', '/publisher/books', ({ query }) => {
  const publisherId = requirePublisher();
  const list = getDb().books.filter((b) => b.publisherId === publisherId);
  return paginate(decorate(list), { limit: 50, ...query });
});

route('POST', '/publisher/books', ({ body }) => {
  const publisherId = requirePublisher();
  const db = getDb();
  const publisher = db.publishers.find((p) => p.id === publisherId)!;

  const title = String(body?.title ?? '').trim();
  const authorName = String(body?.authorName ?? '').trim();
  if (title.length < 2) throw new ApiError('VALIDATION_ERROR', 'Title is required', 422);
  if (authorName.length < 2) throw new ApiError('VALIDATION_ERROR', 'Author is required', 422);

  let author = db.authors.find((a) => a.name.toLowerCase() === authorName.toLowerCase());
  if (!author) {
    author = {
      id: nextId('au'),
      name: authorName,
      slug: authorName.toLowerCase().replace(/\s+/g, '-'),
      bio: '',
      photoUrl: null,
      bookCount: 0,
      followersCount: 0,
      isFollowing: false,
    };
    db.authors.push(author);
  }
  author.bookCount += 1;

  const book: Book = {
    id: nextId('b'),
    title,
    subtitle: null,
    authorId: author.id,
    authorName: author.name,
    publisherId: publisher.id,
    publisherName: publisher.name,
    isbn: String(body?.isbn ?? '').trim() || `978${Date.now()}`.slice(0, 13),
    language: (body?.language ?? 'az') as BookLanguage,
    genres: Array.isArray(body?.genres) && body.genres.length ? body.genres : ['novel'],
    coverUrl: body?.coverUrl || null,
    description: String(body?.description ?? ''),
    pageCount: Math.max(1, Number(body?.pageCount ?? 200)),
    publishedYear: Number(body?.publishedYear ?? new Date().getFullYear()),
    price: round2(Math.max(0, Number(body?.price ?? 0))),
    oldPrice: null,
    stock: Math.max(0, Number(body?.stock ?? 0)),
    ratingAverage: 0,
    ratingCount: 0,
    reviewsCount: 0,
    quotesCount: 0,
    createdAt: nowIso(),
  };

  db.books.unshift(book);
  persistDb();
  return book;
});

route('PATCH', '/publisher/books/:id', ({ params, body }) => {
  const publisherId = requirePublisher();
  const db = getDb();
  const book = db.books.find((b) => b.id === params.id && b.publisherId === publisherId);
  if (!book) throw new ApiError('NOT_FOUND', 'Book not found', 404);

  if (body?.title) book.title = String(body.title);
  if (body?.description !== undefined) book.description = String(body.description);
  if (body?.price !== undefined) book.price = round2(Math.max(0, Number(body.price)));
  if (body?.stock !== undefined) book.stock = Math.max(0, Number(body.stock));
  if (body?.coverUrl !== undefined) book.coverUrl = body.coverUrl || null;
  if (Array.isArray(body?.genres) && body.genres.length) book.genres = body.genres;

  persistDb();
  return book;
});

route('DELETE', '/publisher/books/:id', ({ params }) => {
  const publisherId = requirePublisher();
  const db = getDb();
  db.books = db.books.filter((b) => !(b.id === params.id && b.publisherId === publisherId));
  persistDb();
  return { success: true };
});

route('GET', '/publisher/orders', ({ query }) => {
  const publisherId = requirePublisher();
  const list = getDb()
    .orders.filter((o) => o.publisherId === publisherId)
    .map(advanceOrder)
    .sort(byNewest);
  return paginate(list, query);
});

route('PATCH', '/publisher/orders/:id/status', ({ params, body }) => {
  const publisherId = requirePublisher();
  const order = getDb().orders.find((o) => o.id === params.id && o.publisherId === publisherId);
  if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);

  const status = body?.status as Order['status'];
  if (!ORDER_FLOW.includes(status) && status !== 'cancelled') {
    throw new ApiError('VALIDATION_ERROR', 'Invalid status', 422);
  }
  order.status = status;
  order.timeline.push({ status, at: nowIso() });
  persistDb();
  return order;
});

/* ---- admin ---- */

function requireAdmin(): void {
  if (getDb().demoRole !== 'admin') {
    throw new ApiError('FORBIDDEN', 'Admin role required', 403);
  }
}

route('GET', '/admin/stats', () => {
  requireAdmin();
  const db = getDb();
  const stats: AdminStats = {
    openReports: db.reports.filter((r) => r.status === 'open').length,
    removedContent: db.reports.filter((r) => r.status === 'removed').length,
    activeUsers: db.users.length,
    newUsersThisWeek: 3,
  };
  return stats;
});

route('GET', '/admin/reports', ({ query }) => {
  requireAdmin();
  const status = q(query, 'status');
  let list = getDb().reports.slice().sort(byNewest);
  if (status) list = list.filter((r) => r.status === status);
  return paginate(list, query);
});

route('PATCH', '/admin/reports/:id', ({ params, body }) => {
  requireAdmin();
  const db = getDb();
  const report = db.reports.find((r) => r.id === params.id);
  if (!report) throw new ApiError('NOT_FOUND', 'Report not found', 404);

  const action = body?.action as 'keep' | 'remove';
  report.status = action === 'remove' ? 'removed' : 'kept';

  if (action === 'remove') {
    if (report.targetType === 'review') {
      db.reviews = db.reviews.filter((r) => r.id !== report.targetId);
    } else {
      db.quotes = db.quotes.filter((qt) => qt.id !== report.targetId);
    }
  }

  persistDb();
  return report;
});

route('GET', '/admin/reviews', ({ query }) => {
  requireAdmin();
  return paginate(getDb().reviews.slice().sort(byNewest), query);
});

route('DELETE', '/admin/reviews/:id', ({ params }) => {
  requireAdmin();
  const db = getDb();
  db.reviews = db.reviews.filter((r) => r.id !== params.id);
  persistDb();
  return { success: true };
});

route('GET', '/admin/quotes', ({ query }) => {
  requireAdmin();
  return paginate(getDb().quotes.slice().sort(byNewest), query);
});

route('DELETE', '/admin/quotes/:id', ({ params }) => {
  requireAdmin();
  const db = getDb();
  db.quotes = db.quotes.filter((qt) => qt.id !== params.id);
  persistDb();
  return { success: true };
});

/* ---- demo-only helpers (no backend counterpart) ---- */

route('POST', '/_demo/role', ({ body }) => {
  const db = getDb();
  const role = body?.role as UserRole;
  if (!['user', 'publisher', 'admin'].includes(role)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid role', 422);
  }
  db.demoRole = role;
  persistDb();
  return hydrateUser(db.users.find((u) => u.id === CURRENT_USER_ID)!);
});

/* ================================ dispatch ================================= */

/**
 * Entry point used by `client.ts` when `USE_MOCK_API` is true.
 * Mirrors the real transport: same paths, same status codes, same `ApiError`s.
 */
export async function handleMockRequest<T>(path: string, options: RequestOptions): Promise<T> {
  await ensureDbReady();
  // Artificial latency keeps loading states, skeletons and optimistic updates
  // honest during development.
  if (MOCK_LATENCY_MS > 0) {
    await delay(MOCK_LATENCY_MS * (0.6 + Math.random() * 0.8));
  }

  const method = options.method ?? 'GET';
  const matched = matchRoute(method, path);

  if (!matched) {
    throw new ApiError('NOT_FOUND', `Mock route not implemented: ${method} ${path}`, 404);
  }

  const result = matched.route.handler({
    params: matched.params,
    query: options.query,
    body: options.body,
  });

  return result as T;
}

export { badgesForUser, buildCart, computeStats };
