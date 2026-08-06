# API Conventions

Everything in this document is already assumed by the frontend HTTP client
(`src/api/client.ts`). Deviating from it breaks the app silently, so treat these
rules as part of the contract rather than as suggestions.

---

## 1. Base URL and versioning

```
http://<host>:<port>/api/v1
```

The version lives in the path. A breaking change means `/api/v2` running
alongside `v1`, never a silent change to an existing route.

---

## 2. Response envelope

### Success

Every 2xx response wraps its payload in `data`:

```json
{
  "data": { "id": "b_1", "title": "Əli və Nino" }
}
```

List endpoints add `meta`:

```json
{
  "data": [ { "id": "b_1" }, { "id": "b_2" } ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 58,
    "totalPages": 3,
    "hasMore": true
  }
}
```

`204 No Content` is the only response allowed to have an empty body.

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rating must be between 1 and 10",
    "fields": {
      "rating": "Must be between 1 and 10"
    }
  }
}
```

- `code` — machine-readable, from the table below. The frontend switches on this.
- `message` — human-readable English. Shown to the user only for 4xx responses;
  5xx messages are replaced with a localized generic string.
- `fields` — optional, only for `VALIDATION_ERROR`. Keys are request-body field names.

---

## 3. Error codes

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Body or query failed schema validation |
| `UNAUTHORIZED` | 401 | Missing, malformed or expired access token |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password on sign-in |
| `TWO_FACTOR_REQUIRED` | 401 | Correct password, but a TOTP code is still needed |
| `FORBIDDEN` | 403 | Authenticated but not allowed (wrong role, not the owner) |
| `NOT_FOUND` | 404 | Resource does not exist, or is not visible to this user |
| `CONFLICT` | 409 | State conflict (cancelling a shipped order, duplicate follow) |
| `EMAIL_TAKEN` | 409 | Registration with an existing email |
| `USERNAME_TAKEN` | 409 | Registration/update with an existing username |
| `OUT_OF_STOCK` | 409 | Cart or checkout exceeds available stock |
| `PAYMENT_FAILED` | 402 | Payment provider declined |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Anything unhandled |

The frontend treats `NETWORK_ERROR` and `TIMEOUT` as client-side codes; the
server never sends them.

**Never leak internals.** A 500 must not contain a stack trace or SQL text.

---

## 4. Pagination

Query parameters, on every list endpoint:

| Param | Type | Default | Max |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | — |
| `limit` | integer ≥ 1 | `20` | `100` |

Out-of-range values are clamped, not rejected. Requesting a page past the end
returns an empty `data` array with correct `meta`, not a 404.

---

## 5. Filtering and arrays

Repeated keys, not comma-separated values:

```
GET /books?genres=novel&genres=poetry&languages=az&minRating=8
```

Accepting the comma form as well is fine, but the repeated form must work — it
is what the frontend sends.

---

## 6. Sorting

`?sort=` with a fixed vocabulary per endpoint. For `/books`:

`relevance` (default) · `rating` · `newest` · `price_asc` · `price_desc`

An unknown value falls back to the default rather than erroring.

---

## 7. Authentication

```
Authorization: Bearer <accessToken>
```

See [`AUTH.md`](./AUTH.md). Endpoints are marked in `ENDPOINTS.md` as:

- **public** — no token needed
- **auth** — valid access token required
- **publisher** — role `publisher`, and the resource must belong to that publisher
- **admin** — role `admin`

Requests with an expired access token get `401 UNAUTHORIZED`. The frontend then
calls `POST /auth/refresh` once and retries the original request automatically —
so the refresh endpoint must be reliable and idempotent-ish.

---

## 8. Headers

| Header | Direction | Notes |
|---|---|---|
| `Content-Type: application/json` | both | Except uploads (`multipart/form-data`) |
| `Accept: application/json` | request | Sent by the client |
| `Authorization` | request | See above |
| `Accept-Language: az \| en` | request | Optional; used for server-generated text |
| `X-Request-Id` | response | UUID, echoed in logs — makes support tickets traceable |

---

## 9. Identifiers

Ids are **opaque strings**. The frontend never parses them. The mock uses
prefixed ids (`b_1`, `u_3`, `q_12`); UUIDs are equally fine. What matters is
that they are stable strings and that the same id appears in list and detail
responses.

---

## 10. Dates and numbers

- All timestamps: **ISO-8601 UTC** — `2026-08-06T18:42:11.000Z`.
- Money: **JSON numbers with 2 decimals**, currency is always AZN. Store as
  `numeric(10,2)`; never send formatted strings — the app formats per locale.
- Ratings: integers `1..10`. Aggregates (`ratingAverage`) are numbers with one
  decimal.

---

## 11. Idempotency and concurrency

- `PUT /books/:id/shelf` is idempotent — calling it twice with the same body
  leaves the same state. The frontend's offline queue relies on this when it
  replays writes.
- `POST /orders` should accept an optional `Idempotency-Key` header. If the same
  key is seen twice within 24h, return the original result instead of creating
  duplicate orders.

---

## 12. Rate limits

| Scope | Limit |
|---|---|
| `POST /auth/login`, `/auth/register`, `/auth/forgot-password` | 10 / 15 min / IP |
| `POST /ocr/extract` | 30 / hour / user |
| Write endpoints (`POST`/`PATCH`/`PUT`/`DELETE`) | 120 / min / user |
| Read endpoints | 600 / min / user |

Exceeding a limit returns `429` with `Retry-After` in seconds.

---

## 13. CORS

Allow the origins in `CORS_ORIGINS`, with `Authorization` in
`Access-Control-Allow-Headers` and `GET, POST, PATCH, PUT, DELETE, OPTIONS` in
`Access-Control-Allow-Methods`. Expo web runs on `http://localhost:8081`.

---

## 14. Soft deletes

Reviews, quotes and books are **soft-deleted** (`deleted_at`). Moderation needs
the original text after removal, and the spec's moderation panel shows a snapshot
of removed content. Deleted rows are excluded from every public query.

---

## 15. Consistency rules worth stating explicitly

These caused the most edge cases while building the frontend:

1. **Book aggregates** (`ratingAverage`, `ratingCount`, `reviewsCount`,
   `quotesCount`) are maintained by the backend, not computed by the client.
   Update them in the same transaction as the review/quote write.
2. **`shelfStatus` / `progressPage`** are included on every `Book` object when
   the request is authenticated, and are `null`/`0` for anonymous requests.
3. **Reaching the final page** of a book automatically moves it to the `read`
   shelf and sets `finished_at`.
4. **Any reading-progress update** counts as reading activity for the streak on
   that calendar day (Asia/Baku).
5. **A cart with books from N publishers becomes N orders** at checkout, each
   with its own delivery fee and status timeline.
