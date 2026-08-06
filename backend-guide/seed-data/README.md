# Seed data

Exported directly from the frontend's mock dataset
(`src/api/mock/seed.ts`). Seeding the real database with these files means the
app looks and behaves **identically** before and after switching from the mock
API to the live backend — which turns the cutover into something you can verify
rather than hope for.

| File | Records | Notes |
|---|---|---|
| `publishers.json` | 8 | Azerbaijani publishing houses |
| `authors.json` | 43 | Derived from the book list |
| `books.json` | 58 | Azerbaijani, Turkish, Russian and world literature |
| `users.json` | 14 | `users[0]` (`leyla`) is the demo account |
| `shelves.json` | 58 | 4 default shelves per user + 2 custom for the demo user |
| `shelf_entries.json` | 147 | Books distributed across shelves with progress |
| `reviews.json` | 162 | 1–10 ratings, some flagged as spoilers |
| `quotes.json` | 26 | With background presets and page numbers |
| `buddy_reads.json` | 2 | Plus `buddy_read_messages.json` |
| `reports.json` | 5 | Pre-populated moderation queue |
| `badges.json` | 10 | Badge definitions — insert these in every environment |
| `quote_backgrounds.json` | 8 | Reference only; the gradients live in the client |

## Field mapping

The JSON uses the **API shape** (camelCase, as returned by the endpoints), not
the database shape (snake_case). When writing your seeder, map accordingly:

| JSON | Column |
|---|---|
| `authorId` | `author_id` |
| `publisherId` | `publisher_id` |
| `pageCount` | `page_count` |
| `publishedYear` | `published_year` |
| `oldPrice` | `old_price` |
| `ratingAverage` + `ratingCount` | `rating_sum` = round(avg × count), `rating_count` |
| `coverUrl` | `cover_url` |
| `createdAt` | `created_at` |

Ids are prefixed strings (`b_1`, `u_3`, `pub_2`). Either keep them as text
primary keys, or generate UUIDs and hold a mapping while seeding — the frontend
treats ids as opaque, so both work.

## Notes

- `books[].coverUrl` is `null` throughout. The app renders a generated
  typographic cover in that case, so the catalogue looks complete without
  licensed cover images. Populate it when you have real assets.
- `users[].email` follows `<username>@kitabdostu.az`. There are no password
  hashes — set a known development password for every seeded user.
- `reviews.json` contains multiple reviews per book. Since the schema enforces
  one review per user per book, de-duplicate on `(user.id, bookId)` while
  seeding, or the unique constraint will reject rows.
- Dates are ISO-8601 and were generated relative to the export date. Shifting
  them to be relative to your seed run keeps "3 days ago" labels sensible.

## Regenerating

From the frontend repository root:

```bash
node .export-seed.mjs      # see git history for the script
```

The dataset is deterministic — it is generated from a fixed PRNG seed
(`mulberry32(20260810)`), so re-exporting produces the same records.
