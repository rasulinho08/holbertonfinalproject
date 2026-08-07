import type { BookFilters, LeaderboardMetric, LeaderboardPeriod } from '@/types';

/**
 * Central query-key registry.
 *
 * Keys live here rather than inline so invalidation stays reliable: after a
 * mutation you invalidate `qk.books.all` and every book list refetches, without
 * having to remember which screens built which key.
 */
export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },

  users: {
    all: ['users'] as const,
    detail: (username: string) => ['users', 'detail', username] as const,
    followers: (username: string) => ['users', 'followers', username] as const,
    following: (username: string) => ['users', 'following', username] as const,
    activity: (username: string) => ['users', 'activity', username] as const,
  },

  feed: ['feed'] as const,

  books: {
    all: ['books'] as const,
    list: (filters: BookFilters) => ['books', 'list', filters] as const,
    detail: (id: string) => ['books', 'detail', id] as const,
    similar: (id: string) => ['books', 'similar', id] as const,
    trending: ['books', 'trending'] as const,
    recommendations: ['books', 'recommendations'] as const,
    newReleases: ['books', 'new-releases'] as const,
    reviews: (id: string) => ['books', id, 'reviews'] as const,
    quotes: (id: string) => ['books', id, 'quotes'] as const,
  },

  search: {
    suggest: (term: string) => ['search', 'suggest', term] as const,
  },

  authors: {
    detail: (id: string) => ['authors', id] as const,
    books: (id: string) => ['authors', id, 'books'] as const,
  },

  genres: ['genres'] as const,

  shelves: {
    all: ['shelves'] as const,
    mine: ['shelves', 'mine'] as const,
    books: (shelfId: string) => ['shelves', shelfId, 'books'] as const,
  },

  quotes: {
    all: ['quotes'] as const,
    list: (params: Record<string, unknown>) => ['quotes', 'list', params] as const,
    detail: (id: string) => ['quotes', 'detail', id] as const,
    comments: (id: string) => ['quotes', id, 'comments'] as const,
  },

  reviews: {
    all: ['reviews'] as const,
    detail: (id: string) => ['reviews', 'detail', id] as const,
    comments: (id: string) => ['reviews', id, 'comments'] as const,
  },

  sessions: {
    all: ['reading-sessions'] as const,
    list: ['reading-sessions', 'list'] as const,
    stats: ['reading-sessions', 'stats'] as const,
    forBook: (bookId: string) => ['reading-sessions', 'book', bookId] as const,
  },

  lists: {
    all: ['lists'] as const,
    list: (params: Record<string, unknown>) => ['lists', 'list', params] as const,
    detail: (id: string) => ['lists', 'detail', id] as const,
    forBook: (bookId: string) => ['lists', 'book', bookId] as const,
  },

  buddyReads: {
    all: ['buddy-reads'] as const,
    detail: (id: string) => ['buddy-reads', id] as const,
    messages: (id: string) => ['buddy-reads', id, 'messages'] as const,
  },

  cart: ['cart'] as const,

  orders: {
    all: ['orders'] as const,
    detail: (id: string) => ['orders', id] as const,
    receipt: (id: string) => ['orders', id, 'receipt'] as const,
  },

  wallet: ['wallet'] as const,

  badges: ['badges'] as const,

  leaderboard: (period: LeaderboardPeriod, metric: LeaderboardMetric) =>
    ['leaderboard', period, metric] as const,

  streak: ['streak'] as const,

  notifications: ['notifications'] as const,

  publisher: {
    stats: ['publisher', 'stats'] as const,
    books: ['publisher', 'books'] as const,
    orders: ['publisher', 'orders'] as const,
  },

  admin: {
    stats: ['admin', 'stats'] as const,
    reports: (status?: string) => ['admin', 'reports', status ?? 'all'] as const,
    reviews: ['admin', 'reviews'] as const,
    quotes: ['admin', 'quotes'] as const,
  },
} as const;
