/**
 * Domain model.
 *
 * These types are the frontend's half of the API contract. Every shape here has
 * a matching definition in `backend-guide/ENDPOINTS.md` and a table in
 * `backend-guide/DATABASE.md`. If you change a field here, change it in the
 * backend too — this file is what the API has to satisfy.
 */

export type ID = string;
export type ISODate = string;

export type BookLanguage = 'az' | 'en' | 'tr' | 'ru';

export type GenreSlug =
  | 'novel'
  | 'mystery'
  | 'scifi'
  | 'fantasy'
  | 'history'
  | 'biography'
  | 'poetry'
  | 'psychology'
  | 'philosophy'
  | 'business'
  | 'children'
  | 'classic'
  | 'science'
  | 'selfHelp';

export type ShelfStatus = 'reading' | 'read' | 'want_to_read' | 'dnf';
export type UserRole = 'user' | 'publisher' | 'admin';

/* -------------------------------- people --------------------------------- */

export interface GenreCount {
  genre: GenreSlug;
  count: number;
}

export interface UserStats {
  booksRead: number;
  pagesRead: number;
  reviewsCount: number;
  quotesCount: number;
  streakDays: number;
  longestStreak: number;
  /** Did the user log reading activity today? Drives the streak flame state. */
  readToday: boolean;
  genreDistribution: GenreCount[];
  /** Pages per day for the last 7 days, oldest first. */
  weeklyPages: number[];
}

export interface ReadingGoal {
  year: number;
  target: number;
  completed: number;
}

export interface User {
  id: ID;
  username: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  createdAt: ISODate;
  followersCount: number;
  followingCount: number;
  /** Only present when the viewer is authenticated and is not this user. */
  isFollowing?: boolean;
  stats: UserStats;
  goal: ReadingGoal;
  favoriteGenres: GenreSlug[];
  favoriteAuthorIds: ID[];
  /** Platform wallet balance in AZN. */
  walletBalance: number;
  twoFactorEnabled: boolean;
  /** Set for role === 'publisher'. */
  publisherId?: ID;
}

/** Trimmed user object embedded in reviews, quotes, comments, leaderboards. */
export interface UserSummary {
  id: ID;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export interface Author {
  id: ID;
  name: string;
  slug: string;
  bio: string;
  photoUrl: string | null;
  bookCount: number;
  followersCount: number;
  isFollowing?: boolean;
}

export interface Publisher {
  id: ID;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string;
}

/* --------------------------------- books --------------------------------- */

export interface Book {
  id: ID;
  title: string;
  subtitle: string | null;
  authorId: ID;
  authorName: string;
  publisherId: ID;
  publisherName: string;
  isbn: string;
  language: BookLanguage;
  genres: GenreSlug[];
  coverUrl: string | null;
  description: string;
  pageCount: number;
  publishedYear: number;
  /** AZN. */
  price: number;
  /** Set when the book is discounted; renders as a struck-through price. */
  oldPrice: number | null;
  stock: number;
  /** 1–10 scale, matching the review rating scale. */
  ratingAverage: number;
  ratingCount: number;
  reviewsCount: number;
  quotesCount: number;
  createdAt: ISODate;
  /** Present when authenticated: the viewer's shelf state for this book. */
  shelfStatus?: ShelfStatus | null;
  progressPage?: number;
}

export interface Genre {
  slug: GenreSlug;
  bookCount: number;
}

/* -------------------------------- shelves -------------------------------- */

export interface Shelf {
  id: ID;
  userId: ID;
  /** Default shelves map 1:1 onto `ShelfStatus`; custom shelves have `null`. */
  status: ShelfStatus | null;
  name: string;
  isDefault: boolean;
  booksCount: number;
  /** Up to 3 covers for the shelf thumbnail stack. */
  coverUrls: string[];
}

export interface ShelfEntry {
  id: ID;
  shelfId: ID;
  bookId: ID;
  book: Book;
  status: ShelfStatus;
  progressPage: number;
  startedAt: ISODate | null;
  finishedAt: ISODate | null;
  addedAt: ISODate;
}

/* -------------------------------- social --------------------------------- */

export interface Review {
  id: ID;
  bookId: ID;
  book?: Book;
  user: UserSummary;
  /** 1–10, per the spec's 1000Kitap-style scale. */
  rating: number;
  body: string;
  isSpoiler: boolean;
  photos: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: ISODate;
}

export interface Quote {
  id: ID;
  bookId: ID;
  book: Pick<Book, 'id' | 'title' | 'authorName' | 'coverUrl'>;
  user: UserSummary;
  text: string;
  page: number | null;
  /** Id of an entry in `QUOTE_BACKGROUNDS`. */
  background: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: ISODate;
}

export type CommentTarget = 'review' | 'quote';

export interface Comment {
  id: ID;
  targetType: CommentTarget;
  targetId: ID;
  user: UserSummary;
  body: string;
  createdAt: ISODate;
}

export type ActivityKind =
  | 'finished_book'
  | 'started_book'
  | 'posted_quote'
  | 'posted_review'
  | 'earned_badge';

export interface ActivityItem {
  id: ID;
  kind: ActivityKind;
  user: UserSummary;
  book?: Pick<Book, 'id' | 'title' | 'authorName' | 'coverUrl'>;
  quoteId?: ID;
  reviewId?: ID;
  badgeName?: string;
  createdAt: ISODate;
}

/* --------------------------- reading sessions ---------------------------- */

/**
 * One sitting with a book.
 *
 * The app tracks streaks and a weekly pages chart, but until now nothing
 * actually recorded *when* someone read — progress was only ever a page number
 * on a shelf entry. A session is the event those aggregates are derived from:
 * it is what makes the streak honest and what the reading-speed estimate is
 * computed over.
 */
export interface ReadingSession {
  id: ID;
  userId: ID;
  bookId: ID;
  book?: Pick<Book, 'id' | 'title' | 'authorName' | 'coverUrl' | 'pageCount'>;
  /** Page the reader was on when the session started. */
  startPage: number;
  /** Page reached when it ended. */
  endPage: number;
  /** Elapsed reading time in seconds, excluding paused time. */
  durationSeconds: number;
  note: string | null;
  startedAt: ISODate;
  endedAt: ISODate;
}

export interface ReadingSessionDraft {
  bookId: ID;
  startPage: number;
  endPage: number;
  durationSeconds: number;
  note?: string;
}

export interface ReadingStats {
  /** Sessions logged in the period. */
  sessionCount: number;
  totalMinutes: number;
  totalPages: number;
  /** Pages per hour, across every session with a non-zero duration. */
  pagesPerHour: number;
  /** Minutes read per day for the last 7 days, oldest first. */
  dailyMinutes: number[];
  longestSessionMinutes: number;
}

/* ------------------------------- book lists ------------------------------ */

/**
 * A curated, shareable collection of books — "Başlanğıc üçün 10 klassik".
 *
 * Distinct from a shelf: a shelf is private reading state (am I reading this?),
 * a list is an editorial artefact other readers follow and discuss.
 */
export interface BookList {
  id: ID;
  slug: string;
  title: string;
  description: string;
  owner: UserSummary;
  /** Curated by staff rather than a reader; drives the Explore rail. */
  isOfficial: boolean;
  bookCount: number;
  followersCount: number;
  isFollowing: boolean;
  /** Up to 4 covers for the list thumbnail stack. */
  coverUrls: string[];
  createdAt: ISODate;
}

export interface BookListDetail extends BookList {
  items: BookListItem[];
}

export interface BookListItem {
  bookId: ID;
  book: Book;
  /** Why this book is on the list — the curator's one-liner. */
  note: string | null;
  position: number;
}

/* ------------------------------ buddy reads ------------------------------ */

export interface BuddyMember {
  user: UserSummary;
  progressPage: number;
}

export interface BuddyRead {
  id: ID;
  name: string;
  bookId: ID;
  book: Pick<Book, 'id' | 'title' | 'authorName' | 'coverUrl' | 'pageCount'>;
  ownerId: ID;
  members: BuddyMember[];
  targetDate: ISODate | null;
  messagesCount: number;
  createdAt: ISODate;
}

export interface BuddyMessage {
  id: ID;
  buddyReadId: ID;
  user: UserSummary;
  body: string;
  /** Optional chapter anchor so discussion can be filtered by chapter. */
  chapter: number | null;
  createdAt: ISODate;
}

/* ------------------------------- commerce -------------------------------- */

export interface CartItem {
  bookId: ID;
  book: Book;
  quantity: number;
}

/** The cart is grouped by publisher — the spec's multi-vendor requirement. */
export interface CartGroup {
  publisherId: ID;
  publisherName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
}

export interface CartSummary {
  groups: CartGroup[];
  itemCount: number;
  subtotal: number;
  deliveryTotal: number;
  discount: number;
  total: number;
}

export type DeliveryMethod = 'courier' | 'pickup' | 'post';
export type PaymentMethod = 'card' | 'cod' | 'pos_on_delivery' | 'wallet';

export interface Address {
  fullName: string;
  phone: string;
  city: string;
  line: string;
  note?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  bookId: ID;
  title: string;
  authorName: string;
  coverUrl: string | null;
  publisherId: ID;
  publisherName: string;
  price: number;
  quantity: number;
}

export interface OrderEvent {
  status: OrderStatus;
  at: ISODate;
  note?: string;
}

export interface Order {
  id: ID;
  code: string;
  userId: ID;
  /** One order per publisher — the backend splits a multi-vendor cart. */
  publisherId: ID;
  publisherName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  address: Address;
  estimatedDelivery: ISODate;
  timeline: OrderEvent[];
  createdAt: ISODate;
}

export interface GiftCard {
  code: string;
  amount: number;
  used: boolean;
}

/* ----------------------------- gamification ------------------------------ */

export interface Badge {
  id: ID;
  slug: string;
  name: string;
  description: string;
  /** Emoji shown in the badge tile. */
  icon: string;
  earned: boolean;
  earnedAt: ISODate | null;
  progress: number;
  target: number;
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';
export type LeaderboardMetric = 'books' | 'pages';

export interface LeaderboardEntry {
  rank: number;
  user: UserSummary;
  books: number;
  pages: number;
  isMe: boolean;
}

/* ---------------------------- notifications ------------------------------ */

export type NotificationType =
  | 'follow'
  | 'new_book'
  | 'order_shipped'
  | 'review_comment'
  | 'quote_like'
  | 'buddy_invite'
  | 'goal_reached'
  | 'badge_earned';

export interface AppNotification {
  id: ID;
  type: NotificationType;
  /** Values interpolated into the localized notification string. */
  params: Record<string, string | number>;
  actor: UserSummary | null;
  read: boolean;
  /** In-app route to open on tap, e.g. `/book/b_12`. */
  link: string | null;
  createdAt: ISODate;
}

/* ------------------------------ moderation ------------------------------- */

export type ReportReason = 'spam' | 'offensive' | 'spoiler' | 'copyright' | 'other';
export type ReportStatus = 'open' | 'kept' | 'removed';

export interface Report {
  id: ID;
  targetType: CommentTarget;
  targetId: ID;
  reason: ReportReason;
  note: string | null;
  reportedBy: UserSummary;
  status: ReportStatus;
  createdAt: ISODate;
  /** Snapshot so moderators still see the content after it is deleted. */
  snapshot: {
    text: string;
    authorName: string;
    bookTitle: string | null;
  };
}

/** One bucket of a time series. Series are padded, so gaps arrive as zeros. */
export interface TrendPoint {
  label: string;
  value: number;
}

export interface AdminStats {
  users: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    /** "Active" means a reading session was logged, not that an account exists. */
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
    readers: number;
    publishers: number;
    admins: number;
  };
  content: {
    books: number;
    authors: number;
    reviews: number;
    quotes: number;
    lists: number;
    sessions: number;
    pagesRead: number;
  };
  commerce: {
    orders: number;
    /** Excludes cancelled orders. */
    revenue: number;
    pending: number;
    delivered: number;
    cancelled: number;
    averageOrder: number;
  };
  moderation: {
    openReports: number;
    resolvedReports: number;
    removedContent: number;
  };
  /** Signups per week, oldest first — always 12 buckets. */
  signupTrend: TrendPoint[];
  /** Reading sessions per day, oldest first — always 14 buckets. */
  activityTrend: TrendPoint[];
  topBooks: {
    id: string;
    title: string;
    authorName: string;
    coverUrl: string | null;
    readers: number;
  }[];
  topReaders: { user: UserSummary; booksRead: number; pagesRead: number }[];
  genreSpread: { genre: GenreSlug; count: number }[];
}

/**
 * Moderation views of a review and a quote.
 *
 * The admin listings include soft-deleted rows — a moderator has to be able to
 * see what was taken down — so they carry a flag the public shapes do not.
 */
export interface AdminReview extends Review {
  bookTitle: string;
  deleted: boolean;
}

export interface AdminQuote extends Quote {
  deleted: boolean;
}

export interface AdminUserRow {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  booksRead: number;
  reviewsCount: number;
  quotesCount: number;
  lastActiveAt: string | null;
  /** Soft-deleted accounts stay in the directory, marked. */
  deleted: boolean;
}

/* ------------------------------- publisher ------------------------------- */

export interface PublisherStats {
  revenue: number;
  unitsSold: number;
  pendingOrders: number;
  activeBooks: number;
  /** Last 6 months, oldest first. */
  salesTrend: { month: string; revenue: number }[];
  topBooks: { book: Book; units: number; revenue: number }[];
  revenueByGenre: { genre: GenreSlug; revenue: number }[];
}

export interface BookDraft {
  title: string;
  authorName: string;
  isbn: string;
  language: BookLanguage;
  genres: GenreSlug[];
  description: string;
  coverUrl: string | null;
  pageCount: number;
  publishedYear: number;
  price: number;
  stock: number;
}

/* -------------------------------- auth ----------------------------------- */

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export type OAuthProvider = 'google' | 'apple' | 'facebook';

/* ------------------------------ transport -------------------------------- */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface BookFilters {
  q?: string;
  genres?: GenreSlug[];
  languages?: BookLanguage[];
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | 'rating' | 'newest' | 'price_asc' | 'price_desc';
  authorId?: ID;
  publisherId?: ID;
}
