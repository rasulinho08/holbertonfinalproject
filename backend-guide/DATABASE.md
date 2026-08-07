# Database Schema — PostgreSQL

The product spec sketches five tables. This is the full schema the implemented
frontend actually requires: 26 tables covering social, commerce, gamification and
moderation.

DDL is written for **PostgreSQL 15+**. If you use Prisma, the mapping is
mechanical — each table below becomes a model with the same columns.

---

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive email/username
CREATE EXTENSION IF NOT EXISTS "unaccent";    -- diacritic-insensitive search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- "did you mean…?" suggestions
```

## Enums

```sql
CREATE TYPE user_role        AS ENUM ('user', 'publisher', 'admin');
CREATE TYPE book_language    AS ENUM ('az', 'en', 'tr', 'ru');
CREATE TYPE shelf_status     AS ENUM ('reading', 'read', 'want_to_read', 'dnf');
CREATE TYPE order_status     AS ENUM ('pending', 'confirmed', 'preparing',
                                      'shipped', 'out_for_delivery',
                                      'delivered', 'cancelled');
CREATE TYPE payment_method   AS ENUM ('card', 'cod', 'pos_on_delivery', 'wallet');
CREATE TYPE delivery_method  AS ENUM ('courier', 'pickup', 'post');
CREATE TYPE payment_status   AS ENUM ('requires_confirmation', 'paid',
                                      'failed', 'refunded');
CREATE TYPE report_reason    AS ENUM ('spam', 'offensive', 'spoiler',
                                      'copyright', 'other');
CREATE TYPE report_status    AS ENUM ('open', 'kept', 'removed');
CREATE TYPE target_type      AS ENUM ('review', 'quote');
CREATE TYPE notification_type AS ENUM ('follow', 'new_book', 'order_shipped',
                                       'review_comment', 'quote_like',
                                       'buddy_invite', 'goal_reached',
                                       'badge_earned');
```

Genres are a **fixed vocabulary** but are stored as `text[]` on `books` rather
than an enum, so adding one does not require a migration. The allowed values are
listed in [`ENDPOINTS.md` §3](./ENDPOINTS.md#3-books--discovery); validate them
in the application layer.

---

## 1. Identity

### `users`

```sql
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username          citext UNIQUE NOT NULL,
  email             citext UNIQUE NOT NULL,
  name              text NOT NULL,
  password_hash     text,                    -- NULL for OAuth-only accounts
  avatar_url        text,
  bio               text,
  role              user_role NOT NULL DEFAULT 'user',
  publisher_id      uuid REFERENCES publishers(id) ON DELETE SET NULL,
  wallet_balance    numeric(10,2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  two_factor_secret text,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  favorite_genres   text[] NOT NULL DEFAULT '{}',
  locale            text NOT NULL DEFAULT 'az',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,

  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  CONSTRAINT publisher_role  CHECK (role <> 'publisher' OR publisher_id IS NOT NULL)
);

CREATE INDEX idx_users_role ON users (role) WHERE deleted_at IS NULL;
```

`citext` on `username`/`email` gives case-insensitive uniqueness without
`LOWER()` everywhere.

### `user_favorite_authors`

Onboarding quiz answers. A join table rather than an array, so it can be joined
against for recommendations.

```sql
CREATE TABLE user_favorite_authors (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, author_id)
);
```

### `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,     -- sha256 of the token, never the token
  family_id   uuid NOT NULL,            -- rotation lineage; see AUTH.md
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  user_agent  text,
  ip          inet,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_user   ON refresh_tokens (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_family ON refresh_tokens (family_id);
```

### `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `oauth_accounts`

```sql
CREATE TABLE oauth_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     text NOT NULL,           -- google | apple | facebook
  provider_uid text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_uid)
);
```

### `follows`

```sql
CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> followee_id)
);

CREATE INDEX idx_follows_followee ON follows (followee_id);
```

Counts (`followersCount`, `followingCount`) are computed with a `COUNT(*)` on
these indexes. Denormalise into `users` only if profile reads become hot.

---

## 2. Catalogue

### `publishers`

```sql
CREATE TABLE publishers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  logo_url   text,
  city       text NOT NULL DEFAULT 'Bakı',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `authors`

```sql
CREATE TABLE authors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  bio        text NOT NULL DEFAULT '',
  photo_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_authors_name_trgm ON authors USING gin (name gin_trgm_ops);
```

### `author_follows`

```sql
CREATE TABLE author_follows (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, author_id)
);
```

Used to fire `new_book` notifications when a followed author publishes.

### `books`

```sql
CREATE TABLE books (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  subtitle        text,
  author_id       uuid NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  publisher_id    uuid NOT NULL REFERENCES publishers(id) ON DELETE RESTRICT,
  isbn            text UNIQUE,
  language        book_language NOT NULL DEFAULT 'az',
  genres          text[] NOT NULL DEFAULT '{}',
  cover_url       text,
  description     text NOT NULL DEFAULT '',
  page_count      integer NOT NULL CHECK (page_count > 0),
  published_year  integer CHECK (published_year BETWEEN 800 AND 2100),
  price           numeric(10,2) NOT NULL CHECK (price >= 0),
  old_price       numeric(10,2) CHECK (old_price IS NULL OR old_price > price),
  stock           integer NOT NULL DEFAULT 0 CHECK (stock >= 0),

  -- maintained by triggers; never computed on read
  rating_sum      integer NOT NULL DEFAULT 0,
  rating_count    integer NOT NULL DEFAULT 0,
  reviews_count   integer NOT NULL DEFAULT 0,
  quotes_count    integer NOT NULL DEFAULT 0,

  google_books_id text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
```

`rating_average` is derived, not stored: `rating_sum::numeric / NULLIF(rating_count, 0)`
rounded to one decimal. Storing the sum keeps updates a single increment and
avoids drift.

#### Search index

The catalogue is Azerbaijani, so search has to ignore diacritics — `eli` must
find `Əli`. `unaccent` alone does not fold `ə`, so add an immutable helper:

```sql
CREATE OR REPLACE FUNCTION kd_normalize(input text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT lower(
    translate(unaccent(input),
              'əıöüçşğƏIÖÜÇŞĞ',
              'eioucsgeioucsg')
  );
$$;

ALTER TABLE books ADD COLUMN search_text text
  GENERATED ALWAYS AS (kd_normalize(title || ' ' || coalesce(subtitle, ''))) STORED;

CREATE INDEX idx_books_search_trgm ON books USING gin (search_text gin_trgm_ops);
CREATE INDEX idx_books_genres      ON books USING gin (genres);
CREATE INDEX idx_books_language    ON books (language) WHERE deleted_at IS NULL;
CREATE INDEX idx_books_publisher   ON books (publisher_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_books_author      ON books (author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_books_price       ON books (price) WHERE deleted_at IS NULL;
```

Search: `WHERE search_text LIKE '%' || kd_normalize($1) || '%'`.
Suggestion: `ORDER BY similarity(search_text, kd_normalize($1)) DESC LIMIT 1`
when the result set is empty.

---

## 3. Shelves & reading

### `shelves`

```sql
CREATE TABLE shelves (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     shelf_status,          -- NULL for custom shelves
  name       text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT default_has_status CHECK (is_default = (status IS NOT NULL))
);

-- exactly one default shelf per status per user
CREATE UNIQUE INDEX idx_shelves_default
  ON shelves (user_id, status) WHERE is_default;
CREATE INDEX idx_shelves_user ON shelves (user_id);
```

Create all four default shelves in the same transaction as the user.

### `shelf_entries`

The spec's `User_Books`. One row per (user, book) — a book lives on exactly one
status shelf at a time.

```sql
CREATE TABLE shelf_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  shelf_id      uuid NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  status        shelf_status NOT NULL,
  progress_page integer NOT NULL DEFAULT 0 CHECK (progress_page >= 0),
  started_at    timestamptz,
  finished_at   timestamptz,
  added_at      timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, book_id),
  CONSTRAINT finished_only_when_read CHECK (status = 'read' OR finished_at IS NULL)
);

CREATE INDEX idx_shelf_entries_shelf  ON shelf_entries (shelf_id, added_at DESC);
CREATE INDEX idx_shelf_entries_user   ON shelf_entries (user_id, status);
CREATE INDEX idx_shelf_entries_book   ON shelf_entries (book_id);
```

### `reading_sessions`

One row per **sitting**, not per day. Drives streaks, the weekly chart, the
reading-speed estimate and the `reading_marathon` badge.

> **Changed.** This table used to be a daily aggregate keyed
> `UNIQUE (user_id, book_id, session_date)` with a single `pages_read` column.
> The app now ships a session timer (`app/read/[id].tsx`), so a reader can log
> two separate sittings with the same book on the same day — which the old
> unique constraint forbade — and each sitting carries a duration and a page
> range. The daily aggregate is still available, as a query rather than a table:
> see `weeklyPages` below.

```sql
CREATE TABLE reading_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id          uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  start_page       integer NOT NULL CHECK (start_page >= 0),
  end_page         integer NOT NULL CHECK (end_page >= 0),
  -- 0 is legal: a session logged after the fact has no stopwatch reading.
  -- Those rows are excluded from the speed estimate, not rejected.
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  note             text CHECK (note IS NULL OR char_length(note) <= 280),
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz NOT NULL,
  -- Denormalised calendar day in the *user's* timezone, so "did they read
  -- today?" and the streak are an index lookup rather than a per-row
  -- timezone conversion across the whole table.
  session_date     date NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pages_forward CHECK (end_page >= start_page),
  CONSTRAINT ends_after_start CHECK (ended_at >= started_at)
);

CREATE INDEX idx_sessions_user_date ON reading_sessions (user_id, session_date DESC);
CREATE INDEX idx_sessions_user_book ON reading_sessions (user_id, book_id, started_at DESC);
```

`start_page` / `end_page` are not foreign-keyed to `books.page_count`: the API
validates `end_page <= book.page_count` at write time, but a publisher editing a
book's page count later must not retroactively invalidate stored history.

Derived values:

```sql
-- weeklyPages[i] — pages per day, last 7 days
SELECT session_date, SUM(end_page - start_page) AS pages
FROM reading_sessions
WHERE user_id = $1 AND session_date > current_date - 7
GROUP BY session_date ORDER BY session_date;

-- pagesPerHour — timed sessions only, or you divide by zero
SELECT ROUND(SUM(end_page - start_page)::numeric * 3600 / NULLIF(SUM(duration_seconds), 0))
FROM reading_sessions
WHERE user_id = $1 AND duration_seconds > 0 AND session_date > current_date - $2;
```

`session_date` must be computed from `started_at` in the account's timezone (see
[`ENDPOINTS.md` §18](./ENDPOINTS.md#18-reading-sessions)). Storing UTC days would
cost a Baku reader their streak every time they read after 20:00.

### `reading_goals`

```sql
CREATE TABLE reading_goals (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year       integer NOT NULL,
  target     integer NOT NULL CHECK (target BETWEEN 1 AND 999),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year)
);
```

`completed` is derived:
`COUNT(*) FROM shelf_entries WHERE user_id = $1 AND status = 'read' AND EXTRACT(year FROM finished_at) = $2`.

---

## 4. Social content

### `reviews`

```sql
CREATE TABLE reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id        uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating         integer NOT NULL CHECK (rating BETWEEN 1 AND 10),
  body           text NOT NULL DEFAULT '' CHECK (length(body) <= 5000),
  is_spoiler     boolean NOT NULL DEFAULT false,
  photos         text[] NOT NULL DEFAULT '{}' CHECK (array_length(photos, 1) IS NULL
                                                     OR array_length(photos, 1) <= 4),
  likes_count    integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,

  UNIQUE (user_id, book_id)         -- one review per user per book
);

CREATE INDEX idx_reviews_book ON reviews (book_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_user ON reviews (user_id) WHERE deleted_at IS NULL;
```

### `quotes`

```sql
CREATE TABLE quotes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id        uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  text           text NOT NULL CHECK (length(text) BETWEEN 5 AND 1000),
  page           integer CHECK (page IS NULL OR page > 0),
  background     text NOT NULL DEFAULT 'paper',
  likes_count    integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  source_image_url text,             -- kept when the quote came from OCR
  created_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

CREATE INDEX idx_quotes_created ON quotes (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_book    ON quotes (book_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_user    ON quotes (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_popular ON quotes (likes_count DESC) WHERE deleted_at IS NULL;
```

### `likes`

One polymorphic table for both reviews and quotes.

```sql
CREATE TABLE likes (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type target_type NOT NULL,
  target_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE INDEX idx_likes_target ON likes (target_type, target_id);
```

`isLiked` is `EXISTS (SELECT 1 FROM likes WHERE …)`. Keep `likes_count` on the
parent row in sync via trigger — see [Triggers](#8-triggers).

### `comments`

```sql
CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type target_type NOT NULL,
  target_id   uuid NOT NULL,
  body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX idx_comments_target ON comments (target_type, target_id, created_at DESC)
  WHERE deleted_at IS NULL;
```

---

### `book_lists`, `book_list_items`, `book_list_follows`

Curated collections. A shelf is private reading state; a list is an editorial
artefact other readers follow, so it is a separate tree rather than a flag on
`shelves`.

```sql
CREATE TABLE book_lists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description     text NOT NULL DEFAULT '' CHECK (char_length(description) <= 400),
  owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Staff-curated. Never settable from POST /lists — the verified badge in the
  -- UI is keyed on it.
  is_official     boolean NOT NULL DEFAULT false,
  followers_count integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_lists_owner    ON book_lists (owner_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_lists_ranking  ON book_lists (is_official DESC, followers_count DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE book_list_items (
  list_id   uuid NOT NULL REFERENCES book_lists(id) ON DELETE CASCADE,
  book_id   uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  note      text CHECK (note IS NULL OR char_length(note) <= 200),
  -- Contiguous from 0. Removing an item re-packs the survivors; the client
  -- renders by position and a gap shows up as a jump in the numbering.
  position  integer NOT NULL CHECK (position >= 0),
  added_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (list_id, book_id)
);

CREATE INDEX idx_list_items_order ON book_list_items (list_id, position);
CREATE INDEX idx_list_items_book  ON book_list_items (book_id);  -- GET /books/:id/lists

CREATE TABLE book_list_follows (
  list_id     uuid NOT NULL REFERENCES book_lists(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (list_id, user_id)
);
```

`PRIMARY KEY (list_id, book_id)` is what makes a duplicate add a `409` rather
than a silent second row — the client surfaces "already on this list".

`followers_count` is a counter cache on `book_lists`, maintained by the same
trigger pattern used for `likes_count` on `reviews`. The browse list sorts on
it, and counting `book_list_follows` per row would make that query quadratic.

`slug` is generated from the title, ASCII-folded (`ə→e`, `ı→i`, `ö→o`, `ü→u`,
`ç→c`, `ş→s`, `ğ→g`) so `/lists/azerbaycan-klassikleri` is URL-safe. Both the id
and the slug resolve on `GET /lists/:id`.

---

## 5. Buddy reads

```sql
CREATE TABLE buddy_reads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  book_id     uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_date timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE buddy_read_members (
  buddy_read_id uuid NOT NULL REFERENCES buddy_reads(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress_page integer NOT NULL DEFAULT 0,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buddy_read_id, user_id)
);

CREATE TABLE buddy_read_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_read_id uuid NOT NULL REFERENCES buddy_reads(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  chapter       integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buddy_messages ON buddy_read_messages (buddy_read_id, created_at);
```

---

## 6. Commerce

### `cart_items`

```sql
CREATE TABLE cart_items (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  quantity   integer NOT NULL CHECK (quantity > 0),
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
```

The cart lives server-side so it follows the user across devices.

### `orders`

```sql
CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text UNIQUE NOT NULL,          -- 6-digit human reference
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  publisher_id       uuid NOT NULL REFERENCES publishers(id) ON DELETE RESTRICT,

  subtotal           numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee       numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  discount           numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total              numeric(10,2) NOT NULL CHECK (total >= 0),

  status             order_status NOT NULL DEFAULT 'pending',
  payment_method     payment_method NOT NULL,
  delivery_method    delivery_method NOT NULL,

  address_full_name  text NOT NULL,
  address_phone      text NOT NULL,
  address_city       text NOT NULL,
  address_line       text NOT NULL DEFAULT '',
  address_note       text,

  gift_card_id       uuid REFERENCES gift_cards(id) ON DELETE SET NULL,
  estimated_delivery timestamptz,
  idempotency_key    text UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user      ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_publisher ON orders (publisher_id, created_at DESC);
CREATE INDEX idx_orders_status    ON orders (status);
```

**One order per publisher.** A cart spanning three publishers produces three
rows here, each with its own delivery fee and status.

The address is copied in, not referenced — an order must show the address it was
delivered to, even if the user later edits their saved address.

### `order_items`

```sql
CREATE TABLE order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id      uuid REFERENCES books(id) ON DELETE SET NULL,
  -- denormalised so a deleted book does not erase order history
  title        text NOT NULL,
  author_name  text NOT NULL,
  cover_url    text,
  unit_price   numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity     integer NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
```

### `order_events`

The tracking timeline the app renders.

```sql
CREATE TABLE order_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     order_status NOT NULL,
  note       text,
  actor_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order ON order_events (order_id, created_at);
```

### `payments`

```sql
CREATE TABLE payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider      text NOT NULL DEFAULT 'payriff',
  reference     text UNIQUE NOT NULL,
  amount        numeric(10,2) NOT NULL,
  status        payment_status NOT NULL DEFAULT 'requires_confirmation',
  raw_response  jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

Store the provider's raw payload in `raw_response` — reconciliation disputes are
much easier with it than without.

### `gift_cards`

```sql
CREATE TABLE gift_cards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text UNIQUE NOT NULL,
  amount     numeric(10,2) NOT NULL CHECK (amount > 0),
  used_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  used_at    timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `wallet_transactions`

```sql
CREATE TABLE wallet_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     numeric(10,2) NOT NULL,        -- negative = debit
  reason     text NOT NULL,                 -- order_payment | refund | gift_card
  order_id   uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

`users.wallet_balance` must always equal `SUM(amount)` here. Never write the
balance without writing a transaction row.

---

## 7. Gamification, notifications, moderation

### `badges` / `user_badges`

```sql
CREATE TABLE badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name_az     text NOT NULL,
  name_en     text NOT NULL,
  description_az text NOT NULL,
  description_en text NOT NULL,
  icon        text NOT NULL,          -- emoji
  target      integer NOT NULL
);

CREATE TABLE user_badges (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id  uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);
```

Progress is computed on read; only the *earned* moment is persisted.

### `notifications`

```sql
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  params     jsonb NOT NULL DEFAULT '{}',   -- interpolated client-side
  actor_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  link       text,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread
  ON notifications (user_id) WHERE read_at IS NULL;
```

No display text is stored — the app owns the AZ/EN strings, so a translation fix
does not require a data migration.

### `device_tokens`

```sql
CREATE TABLE device_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      text UNIQUE NOT NULL,
  platform   text NOT NULL,           -- ios | android | web
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now()
);
```

### `reports`

```sql
CREATE TABLE reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type    target_type NOT NULL,
  target_id      uuid NOT NULL,
  reason         report_reason NOT NULL,
  note           text,
  status         report_status NOT NULL DEFAULT 'open',
  -- snapshot survives removal of the underlying content
  snapshot_text        text NOT NULL,
  snapshot_author_name text NOT NULL,
  snapshot_book_title  text,
  resolved_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),

  UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX idx_reports_open ON reports (created_at DESC) WHERE status = 'open';
```

### `admin_actions`

```sql
CREATE TABLE admin_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action      text NOT NULL,            -- remove_review | keep_report | …
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

Every moderation decision is auditable. Do not skip this — it is the difference
between a moderation panel and an unaccountable delete button.

### `search_history`

```sql
CREATE TABLE search_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  term       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_user ON search_history (user_id, created_at DESC);
```

Feeds `recent` in `/search/suggest`. Keep the last 20 per user.

---

## 8. Triggers

Counters must never drift. Maintain them in the database rather than in
application code, so a background job or a manual fix can't desynchronise them.

```sql
-- likes_count on reviews and quotes
CREATE OR REPLACE FUNCTION sync_likes_count() RETURNS trigger AS $$
DECLARE delta integer := CASE TG_OP WHEN 'INSERT' THEN 1 ELSE -1 END;
        row_id uuid   := CASE TG_OP WHEN 'INSERT' THEN NEW.target_id ELSE OLD.target_id END;
        kind target_type := CASE TG_OP WHEN 'INSERT' THEN NEW.target_type ELSE OLD.target_type END;
BEGIN
  IF kind = 'review' THEN
    UPDATE reviews SET likes_count = GREATEST(0, likes_count + delta) WHERE id = row_id;
  ELSE
    UPDATE quotes  SET likes_count = GREATEST(0, likes_count + delta) WHERE id = row_id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_likes_count
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION sync_likes_count();
```

```sql
-- book rating aggregates
CREATE OR REPLACE FUNCTION sync_book_rating() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books SET rating_sum = rating_sum + NEW.rating,
                     rating_count = rating_count + 1,
                     reviews_count = reviews_count + 1
     WHERE id = NEW.book_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE books SET rating_sum = GREATEST(0, rating_sum - OLD.rating),
                     rating_count = GREATEST(0, rating_count - 1),
                     reviews_count = GREATEST(0, reviews_count - 1)
     WHERE id = OLD.book_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.rating <> OLD.rating THEN
    UPDATE books SET rating_sum = rating_sum - OLD.rating + NEW.rating
     WHERE id = NEW.book_id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_book_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION sync_book_rating();
```

Equivalent triggers handle `quotes_count` on `books` and `comments_count` on
`reviews`/`quotes`.

```sql
-- updated_at everywhere
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;
```

Attach `touch_updated_at` to `users`, `books`, `shelf_entries`, `reviews`,
`orders` and `payments`.

---

## 9. Entity relationships

```
users ──< follows >── users
  │
  ├──< shelves ──< shelf_entries >── books
  ├──< reading_sessions
  ├──< reading_goals
  ├──< reviews >── books
  ├──< quotes  >── books
  ├──< likes / comments  (polymorphic → reviews | quotes)
  ├──< cart_items >── books
  ├──< orders ──< order_items
  │        └──< order_events
  │        └──< payments
  ├──< user_badges >── badges
  ├──< notifications
  ├──< device_tokens
  ├──< reports
  └──< buddy_read_members >── buddy_reads ──< buddy_read_messages
                                    │
books ──> authors ──< author_follows >── users
  └──> publishers ──< users (role = publisher)
```

---

## 10. Seeding

[`seed-data/`](./seed-data/) contains the exact dataset the frontend mock uses:
8 publishers, 58 books, 55 authors, 14 users, 26 quotes and the 10 badge
definitions. Seeding with it means the app behaves identically before and after
the switch from mock to live, which makes the cutover verifiable instead of
hopeful.

```ts
// prisma/seed.ts
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const load = (name: string) =>
  JSON.parse(readFileSync(`../backend-guide/seed-data/${name}.json`, 'utf8'));

async function main() {
  await prisma.publisher.createMany({ data: load('publishers') });
  await prisma.author.createMany({ data: load('authors') });
  await prisma.book.createMany({ data: load('books') });
  await prisma.badge.createMany({ data: load('badges') });
  // users, quotes and reviews reference the above — insert them after
}

main().finally(() => prisma.$disconnect());
```

---

## 11. Migration order

Foreign keys constrain the order. Create in this sequence:

1. extensions, enums, `kd_normalize`
2. `publishers` → `authors` → `users` (users reference publishers)
3. `books`
4. `refresh_tokens`, `password_reset_tokens`, `oauth_accounts`, `follows`,
   `author_follows`, `user_favorite_authors`
5. `shelves` → `shelf_entries`, `reading_sessions`, `reading_goals`
6. `reviews`, `quotes` → `likes`, `comments`
7. `buddy_reads` → `buddy_read_members`, `buddy_read_messages`
8. `gift_cards` → `cart_items`, `orders` → `order_items`, `order_events`,
   `payments`, `wallet_transactions`
9. `badges` → `user_badges`, `notifications`, `device_tokens`
10. `reports`, `admin_actions`, `search_history`
11. triggers and indexes
