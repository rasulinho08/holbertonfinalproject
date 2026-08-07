# Backend Roadmap

Build order for the backend, arranged so that **each milestone unblocks a
visible slice of the already-built app**. After every milestone you can flip
`EXPO_PUBLIC_USE_MOCK_API=false` and check that the corresponding screens work
against real data.

Effort is a rough estimate for one developer.

---

## Milestone 0 — Foundations (½ day)

Nothing user-visible; everything after this depends on it.

- [ ] Project scaffold: TypeScript, Express/Fastify, `tsx` dev runner
- [ ] `config/env.ts` — parse and validate env with Zod, fail fast on startup
- [ ] Prisma schema from [`DATABASE.md`](./DATABASE.md), first migration
- [ ] `lib/envelope.ts` — `ok(data, meta)` / `fail(code, message, fields)`
- [ ] `middleware/error.ts` — one handler that turns any thrown `ApiError` into
      the error envelope, and anything else into a logged `500 SERVER_ERROR`
- [ ] `middleware/validate.ts` — Zod body/query validation → `422`
- [ ] `lib/pagination.ts` — `?page&limit` → `{ data, meta }`
- [ ] CORS, helmet, compression, `X-Request-Id`, request logging
- [ ] `GET /health` → `{ "data": { "status": "ok" } }`

**Done when:** `curl localhost:4000/api/v1/health` returns the envelope, and a
deliberately thrown error returns the error envelope with a request id.

---

## Milestone 1 — Auth (1 day) → unblocks sign-in, sign-up, onboarding

- [ ] `POST /auth/register` — creates user + 4 default shelves + goal row
- [ ] `POST /auth/login`
- [ ] `POST /auth/refresh` with rotation and reuse detection
- [ ] `POST /auth/logout`
- [ ] `GET /auth/me`
- [ ] `PATCH /users/me`, `PATCH /users/me/goal`, `PATCH /users/me/preferences`
- [ ] `requireAuth` / `requireRole` middleware
- [ ] Rate limits on the auth routes

**Acceptance**
- Registering creates exactly four shelves and one `reading_goals` row.
- A 15-minute-old access token gets refreshed transparently by the app — sign in,
  wait for expiry, navigate; you should never see the sign-in screen.
- Reusing a rotated refresh token revokes the whole family.
- Onboarding writes `favorite_genres` and `user_favorite_authors`.

**App screens live:** `/login`, `/register`, `/onboarding`, `/settings/profile`.

---

## Milestone 2 — Catalogue (1 day) → unblocks Explore and book detail

- [ ] Seed from [`seed-data/`](./seed-data/)
- [ ] `GET /books` — filters, sort, pagination
- [ ] Diacritic-insensitive search (`kd_normalize` + trigram index)
- [ ] `meta.suggestion` for zero-result queries
- [ ] `GET /books/:id`, `/books/:id/similar`
- [ ] `GET /books/trending`, `/books/new-releases`, `/books/recommendations`
- [ ] `GET /search/suggest`
- [ ] `GET /genres`
- [ ] `GET /authors/:id`, `/authors/:id/books`

**Acceptance**
- `?q=eli` returns *Əli və Nino*.
- `?genres=novel&genres=poetry&languages=az&minRating=8` combines correctly
  (AND across groups, OR within).
- A misspelled query returns `meta.suggestion`.
- `/books/recommendations` differs between two users with different onboarding
  answers.

**App screens live:** `/explore`, `/book/[id]`, `/author/[id]`.

---

## Milestone 3 — Shelves & progress (1 day) → unblocks the core reading loop

- [ ] `GET /shelves`, `POST/PATCH/DELETE /shelves/:id`
- [ ] `GET /shelves/:id/books`
- [ ] `PUT /books/:bookId/shelf` (idempotent)
- [ ] `DELETE /books/:bookId/shelf`
- [ ] `PATCH /books/:bookId/progress`
- [ ] `shelfStatus` / `progressPage` attached to every `Book` for authed requests
- [ ] `GET /users/:username`, `/users/:username/stats` with computed statistics

**Acceptance — this is the spec's User Flow 1**
Search a book → open it → "Rəfə əlavə et" → choose *Oxuyuram* → enter a page →
the book appears on the shelf, the profile's `booksRead`/`pagesRead` update, and
the genre pie chart changes.

Also verify:
- Setting progress to `pageCount` moves the book to *Oxudum* and sets `finished_at`.
- Calling `PUT …/shelf` twice with the same body changes nothing the second time.
- Default shelves cannot be renamed or deleted (`403`).

**App screens live:** `/(tabs)/shelves`, `/shelf/[id]`, `/(tabs)/index`, `/(tabs)/profile`.

---

## Milestone 3b — Reading sessions (½ day) → unblocks the session timer

Split out from Milestone 3 because `reading_sessions` is now a first-class
resource with its own screens, not a side effect of a progress update.

- [ ] `POST /reading-sessions` with the four side effects listed in
      [`ENDPOINTS.md` §18](./ENDPOINTS.md#18-reading-sessions) — raise progress,
      promote `want_to_read` → `reading`, complete at `page_count`, recompute streak
- [ ] `GET /reading-sessions`, `GET /books/:id/reading-sessions`
- [ ] `DELETE /reading-sessions/:id` with an ownership check
- [ ] `GET /reading-sessions/stats` — `dailyMinutes` bucketed in the account's timezone
- [ ] `started_at` derived server-side from `ended_at - duration_seconds`

**Acceptance**
Open a book → "Oxu seansı başlat" → run the timer → enter an end page → save.
The shelf entry's page advances, the streak counts today, and the profile's
reading-stats card appears with a non-zero pages-per-hour.

Also verify:
- Two sessions for the same book on the same day both persist (the old schema
  forbade this).
- A session with `durationSeconds: 0` saves, and does **not** drag
  `pagesPerHour` towards zero.
- `endPage` beyond `book.pageCount` returns `422`, not a clamped save.

**App screens live:** `/read/[id]`, `/sessions`, the stats card on `/(tabs)/profile`.

---

## Milestone 4 — Social content (1½ days) → unblocks quotes and reviews

- [ ] `POST /reviews` with book-aggregate triggers, `GET /books/:id/reviews`
- [ ] `PATCH`/`DELETE /reviews/:id` with ownership checks
- [ ] `POST /quotes`, `GET /quotes`, `DELETE /quotes/:id`
- [ ] Likes on both, idempotent, with counter triggers
- [ ] Comments on both
- [ ] `POST /users/:id/follow`, `DELETE`, followers/following lists
- [ ] `GET /feed`, `GET /users/:username/activity`

**Acceptance**
- Posting a review updates the book's `ratingAverage` and `ratingCount` immediately.
- Liking twice does not double-count; unliking twice does not go negative.
- Reviewing a book that is not on your shelf and was never purchased → `403`.
- The feed shows only activity from followed users, newest first.

**App screens live:** `/(tabs)/quotes`, `/quote/[id]`, `/quote/new`,
`/review/new`, `/book/[id]/reviews`, `/user/[username]`.

---

## Milestone 5 — Commerce (2 days) → unblocks cart, checkout, orders

- [ ] `GET /cart` with publisher grouping and per-group delivery fees
- [ ] `POST/PATCH/DELETE /cart/items`, `DELETE /cart`
- [ ] `POST /orders` — the multi-publisher split, stock check, gift card
- [ ] `GET /orders`, `GET /orders/:id` with the timeline
- [ ] `POST /orders/:id/cancel` with stock restoration
- [ ] `GET /orders/:id/receipt`
- [ ] `GET /wallet`, `POST /gift-cards/redeem`
- [ ] Idempotency-Key handling on checkout

**Acceptance — this is the spec's User Flow 2**
Add books from two different publishers → the cart shows two groups with
separate delivery fees → checkout with cash on delivery → **two** orders are
created → each has its own tracking timeline.

Also verify:
- Ordering more copies than `stock` → `409 OUT_OF_STOCK` naming the title.
- Stock decrements on order and is restored on cancel.
- A group subtotal ≥ 40 AZN gets free delivery; `pickup` zeroes all fees.
- The same `Idempotency-Key` twice creates one set of orders.

**App screens live:** `/cart`, `/checkout`, `/checkout/payment`,
`/checkout/success`, `/orders`, `/orders/[id]`.

---

## Milestone 6 — Engagement (1 day) → unblocks streaks, badges, notifications

- [ ] `GET /badges` with progress for all ten definitions
- [ ] Badge award detection + `badge_earned` notification
- [ ] `GET /leaderboard` with period and metric
- [ ] `GET /streak`, `POST /streak/check-in` (Asia/Baku day boundaries)
- [ ] `GET /notifications`, mark-read endpoints
- [ ] Notification creation on follow, comment, like, order shipped, goal reached
- [ ] `POST /notifications/device-token`

**Acceptance**
- Reading on consecutive days increments the streak; skipping a day resets it.
- The leaderboard's `isMe` row is present even when the caller is outside page 1.
- Crossing a badge target creates exactly one notification, not one per request.

**App screens live:** `/badges`, `/leaderboard`, `/notifications`.

---

## Milestone 7 — Buddy reads (½ day)

- [ ] Full `/buddy-reads` CRUD, join/leave, per-member progress, messages
- [ ] Membership checks on messages

**App screens live:** `/buddy-reads`, `/buddy-reads/[id]`.

---

## Milestone 8 — Publisher panel (1 day)

- [ ] `GET /publisher/stats` with the trend, top books and revenue-by-genre
- [ ] `GET/POST/PATCH/DELETE /publisher/books`
- [ ] `GET /publisher/orders`, `PATCH /publisher/orders/:id/status`
- [ ] Publisher scoping — every query filtered by the token's `publisherId`

**Acceptance**
- Publisher A gets `403`, not `404`, when touching publisher B's book.
- Advancing an order to `shipped` appends a timeline event, notifies the buyer
  and sends the SMS.

**App screens live:** `/publisher`, `/publisher/books`, `/publisher/books/new`,
`/publisher/orders`, `/publisher/analytics`.

---

## Milestone 9 — Moderation (½ day)

- [ ] `POST /reports` with a server-side content snapshot
- [ ] `GET /admin/stats`, `/admin/reports`, `PATCH /admin/reports/:id`
- [ ] `GET/DELETE /admin/reviews`, `/admin/quotes` (soft delete)
- [ ] `admin_actions` audit row for every decision

**Acceptance**
- Removing content hides it everywhere but keeps the report snapshot readable.
- Every decision leaves an audit row naming the admin.

**App screens live:** `/admin`, `/admin/reports`, `/admin/reviews`, `/admin/quotes`.

---

## Milestone 10 — Integrations (1–2 days)

- [ ] Google Books sync script
- [ ] `POST /uploads` (or presigned S3)
- [ ] `POST /ocr/extract`
- [ ] OAuth for Google, Apple, Facebook
- [ ] 2FA enable/verify/disable
- [ ] Payriff create-order + webhook
- [ ] SMS and Expo push senders

**App screens live:** OCR in `/quote/new`, social sign-in, `/settings/security`,
card payment in `/checkout/payment`.

---

## Milestone 11 — Hardening (ongoing)

- [ ] Tests: happy path + failure path per endpoint (Vitest + Supertest)
- [ ] The security checklist in [`AUTH.md` §8](./AUTH.md#8-security-checklist)
- [ ] Structured logging with request ids; error tracking (Sentry)
- [ ] `EXPLAIN ANALYZE` the search and feed queries; add indexes where needed
- [ ] OpenAPI served at `/api/v1/docs`
- [ ] Dockerfile + `docker-compose.yml` (api + postgres)
- [ ] CI: typecheck, lint, test, migrate on a throwaway database

---

## Suggested sprint split

| Sprint | Milestones | Outcome |
|---|---|---|
| **1** | 0–2 | Auth works; the catalogue is real. The app runs on live data for browsing. |
| **2** | 3–4 | The full reading and social loop is live. Mock only needed for commerce. |
| **3** | 5–6 | Orders and gamification. `EXPO_PUBLIC_USE_MOCK_API=false` permanently. |
| **4** | 7–10 | Buddy reads, publisher, moderation, third parties. |
| **5** | 11 | Hardening, load testing, deployment. |

---

## Parallelising across two developers

The module boundaries are clean enough to split after Milestone 0:

| Developer A | Developer B |
|---|---|
| M1 Auth → M3 Shelves → M6 Engagement | M2 Catalogue → M4 Social → M5 Commerce |
| M8 Publisher | M9 Moderation |

Both need M0 first. The only shared surface is `books`, so agree on that schema
before splitting.

---

## Definition of done for the whole backend

The frontend runs with `EXPO_PUBLIC_USE_MOCK_API=false` and:

1. `npm run e2e` in the frontend repo passes all 17 steps against the live API.
2. Both spec user flows work end to end.
3. No endpoint returns a shape that differs from [`ENDPOINTS.md`](./ENDPOINTS.md).
4. The security checklist is fully ticked.
