/**
 * Every REST path the app calls, in one place.
 *
 * This file is the frontend half of the contract documented in
 * `backend-guide/ENDPOINTS.md`. Nothing else in `src/` may build a URL by hand —
 * that way a route rename is one edit here plus one edit in the guide, and the
 * two cannot silently drift apart.
 *
 * Paths are relative to `${API_BASE_URL}` (which already ends in `/api/v1`).
 */
export const Endpoints = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    oauth: (provider: string) => `/auth/oauth/${provider}`,
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
    twoFactorEnable: '/auth/2fa/enable',
    twoFactorVerify: '/auth/2fa/verify',
    twoFactorDisable: '/auth/2fa/disable',
    changePassword: '/auth/change-password',
  },

  users: {
    byUsername: (username: string) => `/users/${username}`,
    updateMe: '/users/me',
    deleteMe: '/users/me',
    stats: (username: string) => `/users/${username}/stats`,
    followers: (username: string) => `/users/${username}/followers`,
    following: (username: string) => `/users/${username}/following`,
    follow: (userId: string) => `/users/${userId}/follow`,
    activity: (username: string) => `/users/${username}/activity`,
    goal: '/users/me/goal',
    preferences: '/users/me/preferences',
    badges: (username: string) => `/users/${username}/badges`,
  },

  feed: {
    friends: '/feed',
  },

  books: {
    list: '/books',
    detail: (id: string) => `/books/${id}`,
    similar: (id: string) => `/books/${id}/similar`,
    reviews: (id: string) => `/books/${id}/reviews`,
    quotes: (id: string) => `/books/${id}/quotes`,
    trending: '/books/trending',
    recommendations: '/books/recommendations',
    newReleases: '/books/new-releases',
  },

  search: {
    suggest: '/search/suggest',
  },

  authors: {
    detail: (id: string) => `/authors/${id}`,
    books: (id: string) => `/authors/${id}/books`,
    follow: (id: string) => `/authors/${id}/follow`,
  },

  genres: {
    list: '/genres',
  },

  shelves: {
    mine: '/shelves',
    create: '/shelves',
    update: (id: string) => `/shelves/${id}`,
    remove: (id: string) => `/shelves/${id}`,
    books: (id: string) => `/shelves/${id}/books`,
    /** Put a book on a shelf (create or move). */
    setForBook: (bookId: string) => `/books/${bookId}/shelf`,
    removeForBook: (bookId: string) => `/books/${bookId}/shelf`,
    progress: (bookId: string) => `/books/${bookId}/progress`,
  },

  reviews: {
    detail: (id: string) => `/reviews/${id}`,
    create: '/reviews',
    update: (id: string) => `/reviews/${id}`,
    remove: (id: string) => `/reviews/${id}`,
    like: (id: string) => `/reviews/${id}/like`,
    comments: (id: string) => `/reviews/${id}/comments`,
  },

  quotes: {
    list: '/quotes',
    detail: (id: string) => `/quotes/${id}`,
    create: '/quotes',
    remove: (id: string) => `/quotes/${id}`,
    like: (id: string) => `/quotes/${id}/like`,
    comments: (id: string) => `/quotes/${id}/comments`,
  },

  ocr: {
    extract: '/ocr/extract',
  },

  uploads: {
    create: '/uploads',
  },

  buddyReads: {
    list: '/buddy-reads',
    create: '/buddy-reads',
    detail: (id: string) => `/buddy-reads/${id}`,
    join: (id: string) => `/buddy-reads/${id}/join`,
    leave: (id: string) => `/buddy-reads/${id}/members/me`,
    messages: (id: string) => `/buddy-reads/${id}/messages`,
    progress: (id: string) => `/buddy-reads/${id}/progress`,
  },

  cart: {
    get: '/cart',
    addItem: '/cart/items',
    updateItem: (bookId: string) => `/cart/items/${bookId}`,
    removeItem: (bookId: string) => `/cart/items/${bookId}`,
    clear: '/cart',
  },

  orders: {
    create: '/orders',
    list: '/orders',
    detail: (id: string) => `/orders/${id}`,
    cancel: (id: string) => `/orders/${id}/cancel`,
    receipt: (id: string) => `/orders/${id}/receipt`,
  },

  payments: {
    initiate: '/payments/initiate',
    verify: (reference: string) => `/payments/${reference}/verify`,
  },

  wallet: {
    get: '/wallet',
    redeemGiftCard: '/gift-cards/redeem',
  },

  gamification: {
    badges: '/badges',
    leaderboard: '/leaderboard',
    streak: '/streak',
    checkIn: '/streak/check-in',
  },

  notifications: {
    list: '/notifications',
    readAll: '/notifications/read-all',
    read: (id: string) => `/notifications/${id}/read`,
    deviceToken: '/notifications/device-token',
  },

  reports: {
    create: '/reports',
  },

  publisher: {
    stats: '/publisher/stats',
    books: '/publisher/books',
    createBook: '/publisher/books',
    updateBook: (id: string) => `/publisher/books/${id}`,
    removeBook: (id: string) => `/publisher/books/${id}`,
    orders: '/publisher/orders',
    updateOrderStatus: (id: string) => `/publisher/orders/${id}/status`,
  },

  admin: {
    stats: '/admin/stats',
    reports: '/admin/reports',
    resolveReport: (id: string) => `/admin/reports/${id}`,
    reviews: '/admin/reviews',
    removeReview: (id: string) => `/admin/reviews/${id}`,
    quotes: '/admin/quotes',
    removeQuote: (id: string) => `/admin/quotes/${id}`,
  },
} as const;
