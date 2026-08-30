# API Endpoints

Complete REST reference for KitabDostu. Base URL: `/api/v1`.
Read [`CONVENTIONS.md`](./CONVENTIONS.md) first — the `{ data, meta }` envelope,
error codes and pagination rules are assumed throughout and are not repeated per
endpoint.

**Auth column:** `public` · `auth` · `publisher` · `admin`.

Every route below has a working reference implementation in the frontend repo at
`src/api/mock/handlers.ts`, and the exact TypeScript shape of every payload is in
`src/types/index.ts`.

---

## Table of contents

1. [Auth](#1-auth) · 2. [Users & social](#2-users--social) · 3. [Books & discovery](#3-books--discovery)
4. [Shelves & progress](#4-shelves--reading-progress) · 5. [Reviews](#5-reviews) · 6. [Quotes](#6-quotes)
7. [Comments](#7-comments) · 8. [Buddy reads](#8-buddy-reads) · 9. [Cart](#9-cart)
10. [Orders](#10-orders) · 11. [Payments & wallet](#11-payments--wallet) · 12. [Gamification](#12-gamification)
13. [Notifications](#13-notifications) · 14. [Reports](#14-reports) · 15. [Publisher](#15-publisher)
16. [Admin](#16-admin) · 17. [Uploads & OCR](#17-uploads--ocr)
18. [Reading sessions](#18-reading-sessions) · 19. [Book lists](#19-book-lists)

---

## 1. Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create an account |
| POST | `/auth/login` | public | Email + password sign-in |
| POST | `/auth/oauth/:provider` | public | `google` \| `apple` \| `facebook` |
| POST | `/auth/refresh` | public | Exchange a refresh token |
| POST | `/auth/logout` | auth | Revoke the current refresh token |
| POST | `/auth/forgot-password` | public | Send a reset link |
| POST | `/auth/reset-password` | public | Consume the reset token |
| POST | `/auth/change-password` | auth | Change while signed in |
| GET | `/auth/me` | auth | Current user |
| POST | `/auth/2fa/enable` | auth | Start TOTP enrolment |
| POST | `/auth/2fa/verify` | auth | Confirm enrolment with a code |
| POST | `/auth/2fa/disable` | auth | Turn TOTP off |

### POST `/auth/register`

```jsonc
// request
{ "name": "Leyla Məmmədova", "username": "leyla",
  "email": "leyla@example.com", "password": "min8chars" }
```

```jsonc
// 201
{ "data": {
  "accessToken": "eyJhbGciOi…",
  "refreshToken": "eyJhbGciOi…",
  "user": { /* User — see §2 */ }
}}
```

Errors: `422 VALIDATION_ERROR` · `409 EMAIL_TAKEN` · `409 USERNAME_TAKEN`.

Rules: password ≥ 8 chars, hashed with argon2id. Username `^[a-z0-9_]{3,20}$`,
stored lowercase. On success create the four default shelves for the user
(`reading`, `read`, `want_to_read`, `dnf`) and a `reading_goals` row for the
current year.

### POST `/auth/login`

```jsonc
{ "email": "leyla@example.com", "password": "…", "twoFactorCode": "123456" }
```

Returns the same `AuthSession` shape as register. Errors:
`401 INVALID_CREDENTIALS` · `401 TWO_FACTOR_REQUIRED` (when the password is
correct, 2FA is on, and `twoFactorCode` is missing or wrong).

### POST `/auth/oauth/:provider`

```jsonc
{ "idToken": "<provider id_token>" }
```

Verify the token against the provider, then match on the verified email:
existing user → sign in; no user → create one (username derived from the email
local part, de-duplicated with a numeric suffix). Returns `AuthSession`.

### POST `/auth/refresh`

```jsonc
{ "refreshToken": "…" }   →   { "data": { "accessToken": "…", "refreshToken": "…" } }
```

Rotate: the presented refresh token is revoked and a new pair issued. A revoked
token presented again means theft — revoke the whole family for that user.
Errors: `401 UNAUTHORIZED`.

### GET `/auth/me`

Returns the full `User` object (§2). This is called on every cold start, so keep
it fast — it is the app's session check.

### POST `/auth/2fa/enable`

```jsonc
{ "data": { "secret": "JBSWY3DPEHPK3PXP",
            "otpauthUrl": "otpauth://totp/KitabDostu:leyla?secret=…&issuer=KitabDostu" } }
```

The secret is stored but 2FA is **not** active until `/auth/2fa/verify` succeeds.

---

## 2. Users & social

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/users/:username` | public | Public profile |
| PATCH | `/users/me` | auth | Update own profile |
| DELETE | `/users/me` | auth | Delete account |
| GET | `/users/:username/stats` | public | Reading statistics only |
| GET | `/users/:username/followers` | public | Paginated |
| GET | `/users/:username/following` | public | Paginated |
| POST | `/users/:userId/follow` | auth | Follow |
| DELETE | `/users/:userId/follow` | auth | Unfollow |
| GET | `/users/:username/activity` | public | Activity feed for one user |
| GET | `/feed` | auth | Combined feed of followed users |
| PATCH | `/users/me/goal` | auth | Set the yearly goal |
| PATCH | `/users/me/preferences` | auth | Onboarding quiz answers |
| GET | `/users/:username/badges` | public | Same shape as `/badges` |

### `User` object

```jsonc
{
  "id": "u_1",
  "username": "leyla",
  "name": "Leyla Məmmədova",
  "email": "leyla@example.com",      // omitted for other users' profiles
  "avatarUrl": null,
  "bio": "Kitab oxumaq — başqasının həyatını yaşamaqdır.",
  "website": null,
  "role": "user",                     // user | publisher | admin
  "createdAt": "2023-12-17T09:00:00.000Z",
  "followersCount": 875,
  "followingCount": 182,
  "isFollowing": false,               // only when viewer ≠ this user
  "stats": {
    "booksRead": 7,
    "pagesRead": 3640,
    "reviewsCount": 12,
    "quotesCount": 31,
    "streakDays": 57,
    "longestStreak": 84,
    "readToday": false,
    "genreDistribution": [ { "genre": "novel", "count": 9 } ],
    "weeklyPages": [42, 0, 66, 31, 80, 12, 55]   // oldest → newest, 7 entries
  },
  "goal": { "year": 2026, "target": 24, "completed": 7 },
  "favoriteGenres": ["novel", "mystery", "classic"],
  "favoriteAuthorIds": ["au_3", "au_11"],
  "walletBalance": 12.50,
  "twoFactorEnabled": false,
  "publisherId": "pub_1"              // only when role = publisher
}
```

`UserSummary` — the trimmed form embedded in reviews, quotes, comments and
leaderboards: `{ id, username, name, avatarUrl }`.

### PATCH `/users/me`

Accepts any subset of `{ name, username, bio, avatarUrl, website }`. Returns the updated
`User`. `409 USERNAME_TAKEN` if the username is in use. `website`/`bio`/`avatarUrl` accept
`null` to clear the field, and must be absolute URLs (`https://…`).

### PATCH `/users/me/goal`

```jsonc
{ "target": 24 }   →   { "data": { "year": 2026, "target": 24, "completed": 7 } }
```

`target` must be 1–999, else `422`.

### PATCH `/users/me/preferences`

```jsonc
{ "favoriteGenres": ["novel", "poetry"], "favoriteAuthorIds": ["au_3"] }
```

Written by the onboarding quiz; drives `/books/recommendations`. Returns `User`.

### POST/DELETE `/users/:userId/follow`

```jsonc
{ "data": { "following": true, "followersCount": 876 } }
```

Following yourself is `422`. Following twice is a no-op, not a `409`.

### GET `/feed`

Merged, newest-first activity of everyone the caller follows. `ActivityItem`:

```jsonc
{
  "id": "act_1",
  "kind": "finished_book",   // finished_book | started_book | posted_quote | posted_review | earned_badge
  "user": { /* UserSummary */ },
  "book": { "id": "b_1", "title": "Əli və Nino", "authorName": "Qurban Səid", "coverUrl": null },
  "quoteId": null,
  "reviewId": null,
  "badgeName": null,
  "createdAt": "2026-08-05T10:22:00.000Z"
}
```

---

## 3. Books & discovery

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/books` | public | Search + filter + sort, paginated |
| GET | `/books/:id` | public | Book detail |
| GET | `/books/:id/similar` | public | "Readers also liked" |
| GET | `/books/:id/reviews` | public | Reviews for a book |
| GET | `/books/:id/quotes` | public | Quotes from a book |
| GET | `/books/trending` | public | Highest engagement |
| GET | `/books/new-releases` | public | Newest publication year |
| GET | `/books/recommendations` | auth | Personalised |
| GET | `/search/suggest` | public | Type-ahead |
| GET | `/authors/:id` | public | Author detail |
| GET | `/authors/:id/books` | public | Books by author |
| POST/DELETE | `/authors/:id/follow` | auth | Follow an author |
| GET | `/genres` | public | Genre list with counts |

### `Book` object

```jsonc
{
  "id": "b_1",
  "title": "Əli və Nino",
  "subtitle": null,
  "authorId": "au_1",
  "authorName": "Qurban Səid",
  "publisherId": "pub_1",
  "publisherName": "Qanun Nəşriyyatı",
  "isbn": "9789952000000",
  "language": "az",                  // az | en | tr | ru
  "genres": ["novel", "classic"],
  "coverUrl": null,
  "description": "…",
  "pageCount": 288,
  "publishedYear": 1937,
  "price": 14.90,
  "oldPrice": 18.60,                 // null when not discounted
  "stock": 23,
  "ratingAverage": 9.0,              // 1–10, one decimal
  "ratingCount": 6759,
  "reviewsCount": 512,
  "quotesCount": 88,
  "createdAt": "2024-02-11T00:00:00.000Z",
  "shelfStatus": "reading",          // authenticated only; null if not shelved
  "progressPage": 96                 // authenticated only; 0 if not shelved
}
```

### GET `/books`

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches title, author, ISBN, publisher |
| `genres` | repeated | `?genres=novel&genres=poetry` — OR within the group |
| `languages` | repeated | `az` \| `en` \| `tr` \| `ru` |
| `minRating` | number | `ratingAverage >= minRating` |
| `minPrice`, `maxPrice` | number | Inclusive |
| `authorId`, `publisherId` | string | Exact match |
| `sort` | enum | `relevance` \| `rating` \| `newest` \| `price_asc` \| `price_desc` |
| `page`, `limit` | integer | Standard pagination |

Filter groups combine with AND; values within a group with OR.

**Search must be diacritic-insensitive**: `eli` matches `Əli`, `sehir` matches
`şəhər`. In Postgres, use `unaccent` plus a custom mapping for `ə → e`,
`ı → i`, `ğ → g`, `ş → s`, `ç → c`, `ö → o`, `ü → u`. A generated
`search_vector` column with a GIN index is the recommended approach — see
[`DATABASE.md`](./DATABASE.md).

**Typo suggestion.** When `q` is present and the result set is empty, add a
`suggestion` field to `meta` holding the closest title or author name
(trigram similarity ≥ 0.3, or Levenshtein ≤ 2), else `null`:

```jsonc
{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1,
                        "hasMore": false, "suggestion": "Əli və Nino" } }
```

### GET `/books/:id/similar`

Rank other books by: shared genres ×2 + same author ×3 + same language ×1,
tie-broken by `ratingAverage`. Exclude the book itself. Default `limit=10`.

### GET `/books/recommendations`

Rank books **not already on any of the caller's shelves** by:
`(genres ∩ favoriteGenres) × 3 + (author ∈ favoriteAuthorIds ? 4 : 0) + ratingAverage / 2`.

### GET `/search/suggest?q=`

```jsonc
{ "data": {
  "books":   [ { "id": "b_1", "title": "Əli və Nino", "authorName": "Qurban Səid" } ],
  "authors": [ { "id": "au_1", "name": "Qurban Səid" } ],
  "recent":  ["dostoyevski", "sapiens"]
}}
```

Max 5 books, 3 authors. `recent` is per-user search history; empty for anonymous.

### GET `/genres`

```jsonc
{ "data": [ { "slug": "novel", "bookCount": 21 }, { "slug": "classic", "bookCount": 17 } ] }
```

Slugs are a fixed vocabulary — the frontend translates them, so **do not invent
new slugs**: `novel`, `mystery`, `scifi`, `fantasy`, `history`, `biography`,
`poetry`, `psychology`, `philosophy`, `business`, `children`, `classic`,
`science`, `selfHelp`.

---

## 4. Shelves & reading progress

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/shelves` | auth | Caller's shelves |
| POST | `/shelves` | auth | Create a custom shelf |
| PATCH | `/shelves/:id` | auth | Rename a custom shelf |
| DELETE | `/shelves/:id` | auth | Delete a custom shelf |
| GET | `/shelves/:id/books` | auth | Entries on a shelf |
| PUT | `/books/:bookId/shelf` | auth | Add or move a book |
| DELETE | `/books/:bookId/shelf` | auth | Remove from all shelves |
| PATCH | `/books/:bookId/progress` | auth | Update the page number |

### `Shelf`

```jsonc
{ "id": "sh_1_1", "userId": "u_1",
  "status": "reading",        // reading | read | want_to_read | dnf | null (custom)
  "name": "reading",          // slug for defaults, free text for custom
  "isDefault": true,
  "booksCount": 3,
  "coverUrls": []             // up to 3, for the thumbnail stack
}
```

Return default shelves first, ordered `reading → read → want_to_read → dnf`,
then custom shelves.

### PUT `/books/:bookId/shelf`

```jsonc
{ "status": "reading", "progressPage": 96, "shelfId": "sh_1_c1" }
```

- `status` is required and must be one of the four.
- `shelfId` is optional; when omitted, use the caller's default shelf for that status.
- `progressPage` is ignored for `read` (forced to `pageCount`) and for `want_to_read` (0).
- Idempotent — a second identical call changes nothing.
- Side effects: set `started_at` when leaving `want_to_read`; set `finished_at`
  when moving to `read`; clear it when moving away. If `booksRead` now equals the
  yearly goal, create a `goal_reached` notification.

Returns the updated `Book` (with `shelfStatus` / `progressPage` populated).

### PATCH `/books/:bookId/progress`

```jsonc
{ "page": 128 }
```

Clamp to `0..pageCount`. Then:

- `page >= pageCount` → move to the `read` shelf and set `finished_at`.
- `0 < page < pageCount` and the book is not on `reading` → move it there.
- Record reading activity for today (Asia/Baku) and extend the streak if this is
  the first activity of the day.

Returns the updated `Book`. `404 NOT_FOUND` if the book is not on any shelf.

### `ShelfEntry` (from `/shelves/:id/books`)

```jsonc
{ "id": "se_1", "shelfId": "sh_1_1", "bookId": "b_1",
  "book": { /* full Book */ },
  "status": "reading", "progressPage": 96,
  "startedAt": "2026-07-28T…", "finishedAt": null, "addedAt": "2026-07-28T…" }
```

### Custom shelves

`POST /shelves { "name": "Klassiklər" }` returns the **full shelf list**, not
just the new shelf — the frontend replaces its cache with the response.
The same applies to `PATCH` and `DELETE`. Default shelves cannot be renamed or
deleted (`403 FORBIDDEN`). Deleting a custom shelf removes the grouping only;
the books stay in the user's library.

---

## 5. Reviews

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/reviews/:id` | public | Single review |
| POST | `/reviews` | auth | Create |
| PATCH | `/reviews/:id` | auth (owner) | Edit |
| DELETE | `/reviews/:id` | auth (owner) | Soft delete |
| POST/DELETE | `/reviews/:id/like` | auth | Like / unlike |

### `Review`

```jsonc
{ "id": "r_1", "bookId": "b_1",
  "user": { /* UserSummary */ },
  "rating": 9,               // 1–10
  "body": "Uzun müddətdir belə təsirli bir kitab oxumamışdım…",
  "isSpoiler": false,
  "photos": ["https://…/review-photo.jpg"],
  "likesCount": 24, "commentsCount": 3,
  "isLiked": false,          // relative to the caller
  "createdAt": "2026-06-02T…" }
```

### POST `/reviews`

```jsonc
{ "bookId": "b_1", "rating": 9, "body": "…", "isSpoiler": false, "photos": [] }
```

`rating` 1–10 required (`422` otherwise), `body` ≤ 5000 chars, max 4 photos.
One review per user per book — a second attempt is `409 CONFLICT`.

**In the same transaction**, update the book's `ratingCount`, `reviewsCount` and
recompute `ratingAverage`.

> **Anti-fraud (from the spec's risk analysis):** only allow a review if the user
> has the book on a shelf *or* has purchased it. Otherwise `403 FORBIDDEN`.

### Likes

`POST`/`DELETE /reviews/:id/like` → `{ "data": { "liked": true, "likesCount": 25 } }`.
Idempotent in both directions. The frontend updates optimistically, so the
returned count must be authoritative.

---

## 6. Quotes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/quotes` | public | Feed, paginated |
| GET | `/quotes/:id` | public | Single quote |
| POST | `/quotes` | auth | Create |
| DELETE | `/quotes/:id` | auth (owner) | Soft delete |
| POST/DELETE | `/quotes/:id/like` | auth | Like / unlike |

### `Quote`

```jsonc
{ "id": "q_1", "bookId": "b_1",
  "book": { "id": "b_1", "title": "Əli və Nino",
            "authorName": "Qurban Səid", "coverUrl": null },
  "user": { /* UserSummary */ },
  "text": "İnsan yalnız ürəyi ilə yaxşı görür.",
  "page": 112,
  "background": "ember",     // preset id, see below
  "likesCount": 341, "commentsCount": 12,
  "isLiked": false,
  "createdAt": "2026-08-01T…" }
```

### GET `/quotes`

Query: `bookId`, `userId`, `sort` (`newest` default, or `popular` by
`likesCount`), plus pagination.

### POST `/quotes`

```jsonc
{ "bookId": "b_1", "text": "…", "page": 112, "background": "ember" }
```

`text` 5–1000 chars. `page` optional. `background` must be one of the presets —
store the id only; the gradients live in the client:

`paper` · `ember` · `ink` · `sea` · `plum` · `rose` · `moss` · `dusk`

Increment the book's `quotesCount` in the same transaction.

---

## 7. Comments

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/reviews/:id/comments` | public | Paginated |
| POST | `/reviews/:id/comments` | auth | Add |
| GET | `/quotes/:id/comments` | public | Paginated |
| POST | `/quotes/:id/comments` | auth | Add |

```jsonc
{ "id": "c_1", "targetType": "quote", "targetId": "q_1",
  "user": { /* UserSummary */ }, "body": "Çox doğru deyilib 👏",
  "createdAt": "2026-08-04T…" }
```

`body` 1–1000 chars. Increment the parent's `commentsCount` and notify the
parent's author (`review_comment` / `quote_like` style notification) unless the
commenter is the author.

---

## 8. Buddy reads

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/buddy-reads` | auth | Caller's groups first, then discoverable |
| POST | `/buddy-reads` | auth | Create |
| GET | `/buddy-reads/:id` | auth | Detail |
| POST | `/buddy-reads/:id/join` | auth | Join |
| DELETE | `/buddy-reads/:id/members/me` | auth | Leave |
| PATCH | `/buddy-reads/:id/progress` | auth | Update own progress |
| GET | `/buddy-reads/:id/messages` | auth (member) | Discussion, oldest first |
| POST | `/buddy-reads/:id/messages` | auth (member) | Post a message |

```jsonc
{ "id": "br_1", "name": "Dostoyevski birlikdə", "bookId": "b_23",
  "book": { "id": "b_23", "title": "Cinayət və cəza",
            "authorName": "Fyodor Dostoyevski", "coverUrl": null, "pageCount": 576 },
  "ownerId": "u_1",
  "members": [ { "user": { /* UserSummary */ }, "progressPage": 184 } ],
  "targetDate": "2026-08-27T…",   // nullable
  "messagesCount": 4,
  "createdAt": "2026-07-25T…" }
```

Messages carry an optional `chapter` anchor so discussion can be filtered:

```jsonc
{ "id": "bm_1", "buddyReadId": "br_1", "user": { /* UserSummary */ },
  "body": "2-ci hissəyə keçdim.", "chapter": 2, "createdAt": "2026-07-28T…" }
```

`POST /buddy-reads` requires `{ name, bookId }`, optional `targetDate`. The
creator is added as the first member. When the owner leaves, transfer ownership
to the longest-standing remaining member, or delete the group if empty.

---

## 9. Cart

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/cart` | auth | Current cart |
| POST | `/cart/items` | auth | Add |
| PATCH | `/cart/items/:bookId` | auth | Set quantity |
| DELETE | `/cart/items/:bookId` | auth | Remove |
| DELETE | `/cart` | auth | Empty the cart |

**Every one of these returns the full `CartSummary`.** The frontend replaces its
cache with the response rather than patching it, which keeps totals honest.

```jsonc
{ "data": {
  "groups": [
    { "publisherId": "pub_1", "publisherName": "Qanun Nəşriyyatı",
      "items": [ { "bookId": "b_1", "book": { /* Book */ }, "quantity": 1 } ],
      "subtotal": 14.90,
      "deliveryFee": 3.50 }
  ],
  "itemCount": 1,
  "subtotal": 14.90,
  "deliveryTotal": 3.50,
  "discount": 0,
  "total": 18.40
}}
```

**Grouping is by publisher** — the spec's multi-vendor requirement. Delivery is
charged per publisher because each ships its own parcel:

```
deliveryFee(group) = group.subtotal >= 40.00 ? 0 : 3.50
```

`POST /cart/items { bookId, quantity }` → `409 OUT_OF_STOCK` if the resulting
quantity exceeds `stock`. `PATCH` with `quantity: 0` removes the line.

---

## 10. Orders

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/orders` | auth | Checkout |
| GET | `/orders` | auth | Caller's orders, newest first |
| GET | `/orders/:id` | auth (owner) | Detail with timeline |
| POST | `/orders/:id/cancel` | auth (owner) | Cancel |
| GET | `/orders/:id/receipt` | auth (owner) | E-receipt payload |

### POST `/orders` — checkout

```jsonc
{
  "address": { "fullName": "Leyla Məmmədova", "phone": "+994501234567",
               "city": "Bakı", "line": "Nizami küç. 12, mənzil 5",
               "note": "Zəng edin" },
  "deliveryMethod": "courier",     // courier | pickup | post
  "paymentMethod": "cod",          // card | cod | pos_on_delivery | wallet
  "giftCardCode": "KITAB10"        // optional
}
```

**Returns an array** — one order per publisher in the cart:

```jsonc
{ "data": [ { /* Order */ }, { /* Order */ } ] }
```

Sequence, all in one transaction:

1. Validate stock for every line → `409 OUT_OF_STOCK` naming the offending title.
2. Validate and consume the gift card → `422` if invalid or already used.
3. Group lines by publisher; create one order per group.
4. Apply the gift card across groups until exhausted (`discount` per order).
5. `deliveryFee = 0` when `deliveryMethod = "pickup"`, else the group fee.
6. Decrement `stock`.
7. `paymentMethod = "wallet"` → debit the wallet; `402 PAYMENT_FAILED` if short.
8. `paymentMethod = "card"` → create a Payriff payment (see [`INTEGRATIONS.md`](./INTEGRATIONS.md))
   and leave the order `pending` until the webhook confirms.
9. Empty the cart, emit an `order_shipped`-family notification, send the SMS.

### `Order`

```jsonc
{ "id": "o_1", "code": "482913", "userId": "u_1",
  "publisherId": "pub_1", "publisherName": "Qanun Nəşriyyatı",
  "items": [ { "bookId": "b_1", "title": "Əli və Nino", "authorName": "Qurban Səid",
               "coverUrl": null, "publisherId": "pub_1",
               "publisherName": "Qanun Nəşriyyatı", "price": 14.90, "quantity": 1 } ],
  "subtotal": 14.90, "deliveryFee": 3.50, "discount": 0, "total": 18.40,
  "status": "preparing",
  "paymentMethod": "cod", "deliveryMethod": "courier",
  "address": { /* … */ },
  "estimatedDelivery": "2026-08-07T…",
  "timeline": [ { "status": "pending", "at": "2026-08-06T…" },
                { "status": "confirmed", "at": "2026-08-06T…" } ],
  "createdAt": "2026-08-06T…" }
```

Status flow — the frontend renders this exact sequence as a timeline:

```
pending → confirmed → preparing → shipped → out_for_delivery → delivered
                                                            ↘ cancelled
```

`code` is a human-friendly 6-digit reference, unique, shown in SMS and support.

Estimated delivery: Baku + courier → +24h; pickup → +2 days; post/regions → +5 days.

### POST `/orders/:id/cancel`

Allowed only while `pending`, `confirmed` or `preparing`; otherwise
`409 CONFLICT`. Restores stock and refunds a wallet/card payment.

### GET `/orders/:id/receipt`

```jsonc
{ "data": {
  "orderId": "o_1", "code": "482913", "issuedAt": "2026-08-06T…",
  "url": "https://…/receipts/o_1.pdf",     // null if not generated yet
  "lines": [ { "title": "Əli və Nino", "quantity": 1, "unitPrice": 14.90, "total": 14.90 } ],
  "subtotal": 14.90, "deliveryFee": 3.50, "discount": 0, "total": 18.40
}}
```

The app renders this payload directly; `url` is optional and only used for the
"download PDF" action.

---

## 11. Payments & wallet

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/payments/initiate` | auth | Start a card payment |
| POST | `/payments/:reference/verify` | auth | Poll payment state |
| POST | `/payments/webhook` | public (signed) | Provider callback — **not called by the app** |
| GET | `/wallet` | auth | Balance |
| POST | `/gift-cards/redeem` | auth | Validate a gift card code |

```jsonc
// POST /payments/initiate  { "orderId": "o_1", "amount": 18.40 }
{ "data": { "reference": "pay_9f2", "redirectUrl": "https://checkout.payriff.com/…",
            "amount": 18.40, "status": "requires_confirmation" } }

// GET /wallet
{ "data": { "balance": 12.50, "currency": "AZN" } }

// POST /gift-cards/redeem  { "code": "KITAB10" }
{ "data": { "code": "KITAB10", "amount": 10.00, "valid": true } }
```

`redeem` **validates only** — the card is consumed at checkout, not here.
Invalid or already-used → `422 VALIDATION_ERROR`.

Webhook handling and signature verification are covered in
[`INTEGRATIONS.md`](./INTEGRATIONS.md).

---

## 12. Gamification

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/badges` | auth | Caller's badges with progress |
| GET | `/leaderboard` | auth | Rankings |
| GET | `/streak` | auth | Streak state |
| POST | `/streak/check-in` | auth | Mark today as read |

### `Badge`

```jsonc
{ "id": "bd_1", "slug": "first_10", "name": "İlk 10 kitab",
  "description": "10 kitab oxu", "icon": "📚",
  "earned": false, "earnedAt": null, "progress": 7, "target": 10 }
```

Return **all** badges, earned and locked, so the app can show progress bars.
Definitions and their progress source:

| Slug | Name | Target | Progress from |
|---|---|---|---|
| `first_10` | İlk 10 kitab | 10 | `stats.booksRead` |
| `quote_master` | Sitat ustası | 25 | `stats.quotesCount` |
| `genre_explorer` | Janr kəşfiyyatçısı | 6 | distinct genres read |
| `book_collector` | Kolleksiyaçı | 50 | total shelf entries |
| `reading_marathon` | Oxu marafonu | 500 | pages in the last 7 days |
| `bookworm` | Kitab qurdu | 30 | `stats.streakDays` |
| `critic` | Tənqidçi | 20 | `stats.reviewsCount` |
| `night_owl` | Gecə quşu | 10 | reading sessions after 00:00 |
| `social_reader` | Sosial oxucu | 25 | following count |
| `goal_crusher` | Hədəf ovçusu | 1 | yearly goal completed |

When a badge crosses its target, create a `badge_earned` notification once.

### GET `/leaderboard`

Query: `period` (`weekly` \| `monthly` \| `all_time`), `metric` (`books` \| `pages`),
plus pagination.

```jsonc
{ "data": [ { "rank": 1, "user": { /* UserSummary */ },
              "books": 9, "pages": 3120, "isMe": false } ] }
```

Rank over the requested window, ordered by the requested metric. `isMe` marks
the caller's row. Include the caller's row even if they fall outside the
requested page — the app pins it above the list.

### GET `/streak` · POST `/streak/check-in`

```jsonc
{ "data": { "current": 57, "longest": 84, "readToday": true,
            "weeklyPages": [42, 0, 66, 31, 80, 12, 55] } }
```

Days are evaluated in **Asia/Baku**. A day counts when the user updates reading
progress or explicitly checks in. Missing a day resets `current` to 0 (and,
optionally, allow one "freeze" per month — not required for MVP).

---

## 13. Notifications

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/notifications` | auth | Paginated, newest first |
| POST | `/notifications/read-all` | auth | Mark everything read |
| PATCH | `/notifications/:id/read` | auth | Mark one read |
| POST | `/notifications/device-token` | auth | Register for push |

```jsonc
{ "id": "n_1",
  "type": "follow",
  "params": { "name": "Tural Həsənov" },   // interpolated into the localized string
  "actor": { /* UserSummary */ },          // null for system notifications
  "read": false,
  "link": "/user/tural",                   // in-app route to open on tap
  "createdAt": "2026-08-06T…" }
```

**The server never sends display text.** It sends a `type` and `params`; the app
holds the AZ and EN strings. Types and their params:

| Type | Params | Triggered when |
|---|---|---|
| `follow` | `name` | Someone follows the user |
| `new_book` | `name` (author) | A followed author releases a book |
| `order_shipped` | `code` | An order changes to `shipped` |
| `review_comment` | `name` | Someone comments on the user's review |
| `quote_like` | `name` | Someone likes the user's quote |
| `buddy_invite` | `name` | Invited to a buddy read |
| `goal_reached` | — | Yearly goal completed |
| `badge_earned` | `name` (badge) | A badge is unlocked |

`POST /notifications/device-token { "token": "ExponentPushToken[…]", "platform": "ios" }`
registers an Expo push token; see [`INTEGRATIONS.md`](./INTEGRATIONS.md).

---

## 14. Reports

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/reports` | auth | Report a review or quote |

```jsonc
{ "targetType": "review",          // review | quote
  "targetId": "r_12",
  "reason": "spoiler",             // spam | offensive | spoiler | copyright | other
  "note": "Finalı açıq yazıb.",
  "snapshotText": "…",             // client-side copy of the content
  "snapshotAuthor": "Kamran Nəbiyev",
  "snapshotBook": "Ölüm hökmü" }
```

The server **must store its own snapshot** of the reported content rather than
trusting the client's — the client fields are a convenience for the moderation
UI, not evidence. Duplicate reports from the same user for the same target are a
no-op.

---

## 15. Publisher

All routes require role `publisher`, and every resource must belong to the
caller's publisher — otherwise `403 FORBIDDEN` (not `404`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/publisher/stats` | Dashboard metrics |
| GET | `/publisher/books` | Own catalogue |
| POST | `/publisher/books` | Add a book |
| PATCH | `/publisher/books/:id` | Update price, stock, description, cover, genres |
| DELETE | `/publisher/books/:id` | Soft delete |
| GET | `/publisher/orders` | Orders for this publisher |
| PATCH | `/publisher/orders/:id/status` | Advance fulfilment |

### GET `/publisher/stats`

```jsonc
{ "data": {
  "revenue": 18420.50,
  "unitsSold": 1204,
  "pendingOrders": 7,
  "activeBooks": 42,
  "salesTrend": [ { "month": "Mar", "revenue": 2100.00 } ],   // last 6, oldest first
  "topBooks": [ { "book": { /* Book */ }, "units": 58, "revenue": 864.20 } ],
  "revenueByGenre": [ { "genre": "novel", "revenue": 6120.00 } ]
}}
```

Count only `delivered` and in-flight (non-cancelled) orders towards revenue.

### POST `/publisher/books`

```jsonc
{ "title": "…", "authorName": "…", "isbn": "…", "language": "az",
  "genres": ["novel"], "description": "…", "coverUrl": null,
  "pageCount": 240, "publishedYear": 2026, "price": 16.90, "stock": 50 }
```

`authorName` is resolved to an existing author by case-insensitive name match, or
a new author row is created. `publisherId` comes from the token, never the body.

### PATCH `/publisher/orders/:id/status`

```jsonc
{ "status": "shipped" }
```

Only forward transitions along the flow in §10, plus `cancelled`. Appends to
`timeline` and, for `shipped`, emits an `order_shipped` notification and SMS.

---

## 16. Admin

All routes require role `admin`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/stats` | Moderation overview |
| GET | `/admin/reports` | Report queue, `?status=open\|kept\|removed` |
| PATCH | `/admin/reports/:id` | Resolve a report |
| GET | `/admin/reviews` | All reviews |
| DELETE | `/admin/reviews/:id` | Remove a review |
| GET | `/admin/quotes` | All quotes |
| DELETE | `/admin/quotes/:id` | Remove a quote |

```jsonc
// GET /admin/stats
{ "data": { "openReports": 4, "removedContent": 12,
            "activeUsers": 1420, "newUsersThisWeek": 37 } }
```

### `Report`

```jsonc
{ "id": "rp_1", "targetType": "review", "targetId": "r_12",
  "reason": "spoiler", "note": "Finalı açıq yazıb.",
  "reportedBy": { /* UserSummary */ },
  "status": "open",                 // open | kept | removed
  "createdAt": "2026-08-04T…",
  "snapshot": { "text": "…", "authorName": "Kamran Nəbiyev",
                "bookTitle": "Ölüm hökmü" } }
```

### PATCH `/admin/reports/:id`

```jsonc
{ "action": "remove" }   // keep | remove
```

`keep` → `status: "kept"`, content untouched.
`remove` → `status: "removed"`, and the target is **soft-deleted**; the snapshot
survives so the decision stays auditable. Write an `admin_actions` audit row for
every resolution.

---

## 17. Uploads & OCR

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/uploads` | auth | Upload an image (avatar, review photo, cover) |
| POST | `/ocr/extract` | auth | Extract text from a photo of a page |

### POST `/uploads`

`multipart/form-data` with a `file` field, or JSON `{ "uri": "…" }` when the
client already has a hosted URL.

```jsonc
{ "data": { "id": "up_1", "url": "https://cdn.kitabdostu.az/uploads/up_1.jpg" } }
```

Accept `image/jpeg`, `image/png`, `image/webp`; max 5 MB. Strip EXIF, generate a
resized variant, store on S3. Presigned direct-to-S3 uploads are preferable in
production — keep this endpoint as the fallback.

### POST `/ocr/extract`

```jsonc
{ "imageUri": "https://cdn.kitabdostu.az/uploads/up_1.jpg" }
```

```jsonc
{ "data": { "text": "İnsan yalnız ürəyi ilə yaxşı görür.", "confidence": 0.93 } }
```

Powers the quote composer's "scan text from photo". Must handle Azerbaijani
characters (`ə ğ ı ö ş ü ç`) — see [`INTEGRATIONS.md`](./INTEGRATIONS.md) for
provider options. The user always reviews and edits the result, so imperfect
recognition is acceptable; returning an error is not.

Rate limit: 30/hour/user. `422` if the image cannot be read.

---

## 18. Reading sessions

A session is one sitting with a book. It is the event the streak, the weekly
activity chart and the reading-speed estimate are all derived from — before it
existed, "progress" was only a page number the reader typed in, and the streak
had nothing real behind it.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/reading-sessions` | auth | Caller's sessions, newest first |
| POST | `/reading-sessions` | auth | Log a session |
| DELETE | `/reading-sessions/:id` | auth (owner) | Delete one |
| GET | `/reading-sessions/stats` | auth | Aggregates over a window |
| GET | `/books/:id/reading-sessions` | auth | Caller's sessions for one book |

```jsonc
{ "id": "rs_1", "userId": "u_1", "bookId": "b_23",
  "book": { "id": "b_23", "title": "Əli və Nino", "authorName": "Qurban Səid",
            "coverUrl": "https://covers.openlibrary.org/b/id/8231856-M.jpg",
            "pageCount": 288 },
  "startPage": 96, "endPage": 134,
  "durationSeconds": 2820,
  "note": "Metroda oxudum.",     // nullable, max 280 chars
  "startedAt": "2026-08-07T19:12:00Z",
  "endedAt": "2026-08-07T19:59:00Z" }
```

### POST `/reading-sessions`

```jsonc
// request
{ "bookId": "b_23", "startPage": 96, "endPage": 134,
  "durationSeconds": 2820, "note": "Metroda oxudum." }
```

Validation:

- `endPage >= startPage`, else `422` with `fields.endPage = "invalid"`.
- `endPage <= book.pageCount`, else `422` with `fields.endPage = "out_of_range"`.
- `durationSeconds >= 0`. Zero is allowed — a reader logging yesterday's reading
  after the fact has no stopwatch value, and those rows are simply excluded from
  the speed calculation rather than rejected.

**Side effects.** Creating a session is also a progress update, and the backend
owns that consequence rather than making the client fire a second request:

1. If `endPage` exceeds the shelf entry's `progress_page`, raise it.
2. If the book was on `want_to_read`, move it to `reading` and stamp `started_at`.
3. If `endPage >= book.page_count`, move it to `read` and stamp `finished_at`.
4. Recompute the streak for the calling user (see §12) and re-evaluate badges.

`startedAt` is derived server-side as `endedAt - durationSeconds`; do not trust a
client-supplied `startedAt`, since it would let a client forge streak history.

### GET `/reading-sessions/stats`

Query: `days` (default `30`).

```jsonc
{ "data": {
  "sessionCount": 46,
  "totalMinutes": 1884,
  "totalPages": 1420,
  "pagesPerHour": 45,          // over sessions with durationSeconds > 0 only
  "dailyMinutes": [42, 0, 65, 30, 51, 0, 38],  // last 7 days, oldest first
  "longestSessionMinutes": 95
}}
```

`dailyMinutes` is always seven entries regardless of `days`, and buckets by the
**caller's** local day. The mock uses the server's timezone; production should
take an IANA timezone from the account (or an `X-Timezone` header) so a reader in
Baku does not lose a streak to a UTC day boundary.

---

## 19. Book lists

A curated, shareable collection — "Bir gecəyə sığan kitablar". Distinct from a
shelf: a shelf is private reading state, a list is an editorial artefact other
readers follow.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/lists` | public | Browse; `scope`, `q`, pagination |
| POST | `/lists` | auth | Create |
| GET | `/lists/:id` | public | Detail, including items |
| PATCH | `/lists/:id` | auth (owner) | Rename / re-describe |
| DELETE | `/lists/:id` | auth (owner) | Delete |
| POST | `/lists/:id/follow` | auth | `{ follow: boolean }` |
| POST | `/lists/:id/books` | auth (owner) | Add a book |
| DELETE | `/lists/:id/books/:bookId` | auth (owner) | Remove a book |
| GET | `/books/:id/lists` | public | Lists featuring this book |

`GET /lists` query: `scope` = `mine` \| `following` (omit for all), `q` for a
title/description search, plus the usual `page` / `limit`. Ordering is official
lists first, then by `followersCount` descending.

`:id` accepts either the id or the slug, so `/lists/azerbaycan-klassikleri` is a
shareable URL.

```jsonc
// BookList — the browse shape
{ "id": "bl_1", "slug": "azerbaycan-klassikleri",
  "title": "Azərbaycan klassikləri",
  "description": "Məktəb proqramından tanıdığın, amma yenidən oxumağa dəyən əsərlər.",
  "owner": { /* UserSummary */ },
  "isOfficial": true,
  "bookCount": 20,
  "followersCount": 1732,
  "isFollowing": false,
  "coverUrls": ["https://covers.openlibrary.org/b/id/8231856-M.jpg", "…"], // ≤ 4
  "createdAt": "2026-05-02T…" }
```

`GET /lists/:id` returns the same object plus `items`:

```jsonc
{ "items": [
  { "bookId": "b_12", "book": { /* full Book, decorated with shelfStatus */ },
    "note": "Siyahının ən yaxşı başlanğıc nöqtəsi.",   // nullable, max 200
    "position": 0 }
]}
```

Rules:

- `title` at least 3 characters, else `422` with `fields.title = "too_short"`.
- Adding a book already on the list is `409 CONFLICT`, not a silent no-op — the
  client shows "already on this list".
- `position` is contiguous from 0. Removing an item re-packs the remaining
  positions; do not leave gaps, the client renders by `position`.
- `isOfficial` is set by staff only. Never let `POST /lists` accept it from the
  body — it is what the verified badge in the UI is keyed on.
- `isFollowing` requires the caller; return `false` for anonymous requests.

---

## Appendix — endpoints the mock implements that have no backend counterpart

`POST /_demo/role` switches the demo account between `user`, `publisher` and
`admin` so one login can show all three experiences during a review.
**Do not implement this.** In production the role comes from the account.
