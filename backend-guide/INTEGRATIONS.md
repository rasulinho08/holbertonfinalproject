# Third-party Integrations

Everything the backend has to talk to that is not the database. Each section
gives the purpose, the flow, and what the frontend expects back.

---

## 1. Google Books API — catalogue seeding

**Why:** the spec's risk analysis flags "limited book database" as a high
probability risk, with the mitigation "manually curate the first 1,000 most
popular books before launch". Google Books gets you most of the way there.

```
GET https://www.googleapis.com/books/v1/volumes?q=isbn:9789952000000&key=$GOOGLE_BOOKS_API_KEY
```

Field mapping:

| Google Books | `books` column |
|---|---|
| `volumeInfo.title` | `title` |
| `volumeInfo.subtitle` | `subtitle` |
| `volumeInfo.authors[0]` | resolve/create `authors.name` |
| `volumeInfo.publisher` | resolve/create `publishers.name` |
| `volumeInfo.publishedDate` (year part) | `published_year` |
| `volumeInfo.pageCount` | `page_count` |
| `volumeInfo.description` | `description` |
| `volumeInfo.language` | `language` (map to the enum; skip unsupported) |
| `volumeInfo.imageLinks.thumbnail` | `cover_url` — **re-host it, do not hotlink** |
| `volumeInfo.industryIdentifiers[ISBN_13]` | `isbn` |
| `id` | `google_books_id` (unique — makes the sync idempotent) |

Implementation notes:

- Run as a CLI script (`npm run sync:books -- --isbn-file isbns.txt`), not as a
  request-time call. Catalogue sync is an admin operation.
- Upsert on `google_books_id`; never create duplicates.
- Google returns nothing useful for much of the Azerbaijani catalogue. Those
  books come from local publisher data and the National Library — expect to
  import them from CSV. Build the importer to accept both sources.
- `price` and `stock` are **never** from Google. They are commercial data owned
  by the publisher.
- Quota is 1,000 requests/day on the free tier. Throttle to ~1 req/sec.

---

## 2. Payriff — card payments

Primary gateway for Visa/Mastercard, per the spec. MilliKart is the documented
fallback and follows the same shape.

### Flow

```
app                    backend                    Payriff
 │                        │                          │
 │ POST /orders           │                          │
 │  paymentMethod: card   │                          │
 │───────────────────────>│                          │
 │                        │ create order (pending)   │
 │                        │ POST /api/v2/createOrder │
 │                        │─────────────────────────>│
 │                        │  { paymentUrl, orderId } │
 │                        │<─────────────────────────│
 │  { redirectUrl }       │                          │
 │<───────────────────────│                          │
 │                                                   │
 │ open redirectUrl in a browser, user pays          │
 │──────────────────────────────────────────────────>│
 │                        │   POST /payments/webhook │
 │                        │<─────────────────────────│
 │                        │ verify signature         │
 │                        │ mark paid, confirm order │
 │ GET /orders/:id (poll) │                          │
 │───────────────────────>│                          │
```

### Request

```http
POST https://api.payriff.com/api/v2/createOrder
Authorization: <PAYRIFF_SECRET_KEY>
Content-Type: application/json

{
  "merchantId": "<PAYRIFF_MERCHANT_ID>",
  "amount": 18.40,
  "currencyType": "AZN",
  "language": "AZ",
  "description": "KitabDostu order #482913",
  "approveURL": "https://api.kitabdostu.az/payments/return?status=approved",
  "cancelURL":  "https://api.kitabdostu.az/payments/return?status=cancelled",
  "declineURL": "https://api.kitabdostu.az/payments/return?status=declined"
}
```

Store the returned reference in `payments.reference` and the whole body in
`payments.raw_response`.

### Webhook — the part that must be right

```
POST /payments/webhook          (public, signature-verified)
```

Rules:

1. **Verify the signature before anything else.** An unsigned or mis-signed
   payload is a `401`, full stop. Never trust the amount or status in the body.
2. **Be idempotent.** Providers retry. Key on `payments.reference`; if the
   payment is already `paid`, return `200` and do nothing.
3. **Re-check the amount** against the order total. A mismatch is a security
   event: log it, do not confirm the order.
4. On success: `payments.status = 'paid'`, order → `confirmed`, append an
   `order_events` row, notify the user.
5. On failure: `payments.status = 'failed'`, order → `cancelled`, restore stock.
6. Respond `200` quickly and do the slow work (SMS, push) asynchronously —
   providers time out and retry.

### Other payment methods

| Method | Backend behaviour |
|---|---|
| `cod` | No gateway. Order goes straight to `confirmed`. Cash collected on delivery. |
| `pos_on_delivery` | Same as `cod`; the courier carries a terminal. Flag it on the order for logistics. |
| `wallet` | Debit `users.wallet_balance` inside the checkout transaction and write a `wallet_transactions` row. `402 PAYMENT_FAILED` if the balance is short. |

Gift cards are **not** a payment method — they are a discount applied at
checkout and consumed in the same transaction.

---

## 3. Delivery & logistics

Three methods, matching the spec's local strategy:

| Method | SLA | Fee |
|---|---|---|
| `courier` | Baku within 24h | 3.50 AZN per publisher, free at ≥ 40 AZN |
| `pickup` | 1–2 days | Free |
| `post` (Azərpoçt) | Regions, 3–5 business days | 3.50 AZN per publisher |

`estimated_delivery` = `now()` + 1 / 2 / 5 days respectively.

Courier partner integration (e.g. 166 Courier, named in the spec's mitigation
plan) is out of scope for the MVP — status is advanced manually by the publisher
through `PATCH /publisher/orders/:id/status`. Design the status update path so a
webhook from a courier API can call the same service function later.

---

## 4. SMS notifications

The spec requires SMS on order status changes. Any Azerbaijani gateway works
(Atabank SMS, Lider SMS, or Twilio for testing).

Send on: order confirmed, shipped, out for delivery, delivered.

```
KitabDostu: №482913 sifarişiniz yola salındı. İzləmək üçün: kitabdostu.az/o/482913
```

Rules:

- Phone numbers are normalised to `+994XXXXXXXXX` before storage.
- Never send from inside the request path — enqueue and send asynchronously; a
  failing SMS gateway must not fail a checkout.
- Respect the user's notification preferences.
- Rate-limit per phone number to prevent an SMS-pumping attack.

---

## 5. Push notifications

The app is Expo-based, so use **Expo Push** — no Firebase/APNs credentials needed
for the MVP.

```
POST /notifications/device-token
{ "token": "ExponentPushToken[xxxxxxxxxxxx]", "platform": "ios" }
```

Sending:

```http
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json

[{
  "to": "ExponentPushToken[…]",
  "title": "KitabDostu",
  "body": "Tural Həsənov səni izləməyə başladı",
  "data": { "link": "/user/tural", "type": "follow" }
}]
```

Notes:

- `data.link` is the in-app route the app opens on tap — the same value stored in
  `notifications.link`.
- Batch up to 100 tokens per request.
- Handle `DeviceNotRegistered` in the receipt by deleting the token row.
- Push text **is** localized server-side (unlike in-app notifications, which the
  app renders from `type` + `params`). Use `users.locale` to choose AZ or EN.

---

## 6. File uploads

Avatars, review photos, book covers and OCR source images.

**Preferred:** presigned direct-to-S3 uploads. The client asks for a presigned
PUT, uploads straight to storage, then sends the resulting URL back. This keeps
image bytes out of the API server entirely.

**Fallback:** `POST /uploads` as `multipart/form-data`, which is what the current
frontend uses.

Requirements:

- Accept `image/jpeg`, `image/png`, `image/webp`; max 5 MB.
- Validate the **magic bytes**, not just the `Content-Type` header.
- Strip EXIF — user photos carry GPS coordinates.
- Generate a resized variant (avatars 256×256, covers 600×900) and serve WebP.
- Store on S3-compatible storage (AWS S3, Cloudflare R2) behind a CDN.
- Serve uploads from a **separate domain** so a malicious file can never run in
  the app's origin.
- Names are random UUIDs — never the user-supplied filename.

---

## 7. OCR — "scan text from photo"

Powers the quote composer, which is the spec's headline social feature.

```
POST /ocr/extract  { "imageUri": "https://cdn.kitabdostu.az/uploads/up_1.jpg" }
   → { "data": { "text": "…", "confidence": 0.93 } }
```

### Provider options

| Provider | Azerbaijani support | Notes |
|---|---|---|
| **Google Cloud Vision** `DOCUMENT_TEXT_DETECTION` | Good | Best accuracy; ~$1.50 / 1000 images |
| Azure AI Vision Read | Good | Comparable; sometimes better on skewed pages |
| Tesseract (`aze` traineddata) | Fair | Free, self-hosted; noticeably weaker on photos |

Start with Cloud Vision and keep the call behind an interface
(`integrations/ocr.ts`) so it can be swapped.

### Requirements

- Must handle `ə ğ ı ö ş ü ç` correctly — this is the whole point for an
  Azerbaijani catalogue. Set the language hint to `["az", "tr", "en"]`.
- Pre-process before sending: downscale to ≤ 2000px, convert to greyscale,
  auto-rotate from EXIF. Accuracy improves noticeably and cost drops.
- Join the returned lines with spaces, collapse hyphenated line breaks
  (`kitab-\nlar` → `kitablar`), and trim.
- **Never return an error for poor recognition.** The user always reviews and
  edits the text before posting, so low-confidence output is still useful.
  Reserve `422` for images that cannot be decoded at all.
- Rate limit: 30/hour/user. OCR is the most expensive call in the system.
- Store the source image URL on the quote (`quotes.source_image_url`) — useful
  for copyright reports.

### Copyright

Reproducing whole pages is a real risk (there is already a `copyright` report
reason). Enforce the 1000-character limit on `quotes.text` server-side, and
consider flagging a quote whose OCR text exceeds ~600 characters for review.

---

## 8. Environment variables

```bash
# Google
GOOGLE_BOOKS_API_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_CLOUD_VISION_KEY=

# Apple / Facebook OAuth
APPLE_OAUTH_CLIENT_ID=
APPLE_TEAM_ID=
FACEBOOK_OAUTH_APP_ID=
FACEBOOK_OAUTH_APP_SECRET=

# Payments
PAYRIFF_MERCHANT_ID=
PAYRIFF_SECRET_KEY=
PAYRIFF_BASE_URL=https://api.payriff.com/api/v2
PAYRIFF_WEBHOOK_SECRET=

# Storage
S3_ENDPOINT=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
CDN_BASE_URL=https://cdn.kitabdostu.az

# Messaging
SMS_PROVIDER_KEY=
SMS_SENDER_ID=KitabDostu
EXPO_PUSH_ACCESS_TOKEN=
```

---

## 9. Failure policy

None of these services may take the app down with them.

| Integration | If it fails |
|---|---|
| Google Books | Sync script fails; the app is unaffected |
| Payriff | Checkout returns `402 PAYMENT_FAILED`; cash on delivery still works |
| SMS | Log and continue — never fail an order |
| Push | Log and continue — the in-app notification row is the source of truth |
| Uploads | Return `503`; the user can retry without losing their draft |
| OCR | Return `422`; the user can type the quote manually |

Wrap every outbound call in a timeout (5s) and a circuit breaker. A hanging
third party should degrade one feature, not the whole API.
