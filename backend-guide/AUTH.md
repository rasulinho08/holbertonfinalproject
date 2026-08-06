# Authentication & Authorization

Covers the token model, the OAuth handoff, password reset, TOTP two-factor and
the role system. The frontend's half of this lives in `src/api/tokens.ts`,
`src/api/client.ts` and `src/store/auth.ts`.

---

## 1. Token model

Two tokens, both JWTs:

| Token | TTL | Stored where (client) | Purpose |
|---|---|---|---|
| **Access** | 15 min | memory + `expo-secure-store` | Sent as `Authorization: Bearer` on every request |
| **Refresh** | 30 days | `expo-secure-store` only | Exchanged for a new pair; never sent to normal endpoints |

On device, `expo-secure-store` is backed by the iOS Keychain and Android
Keystore. On the web build it falls back to `localStorage`, which is acceptable
for the demo but should become an httpOnly cookie before a real web launch.

### Access token payload

```json
{
  "sub": "u_1",
  "role": "user",
  "publisherId": null,
  "iat": 1754500000,
  "exp": 1754500900
}
```

Keep it minimal. `role` and `publisherId` are included so authorization does not
need a database round-trip on every request — the cost is that a role change
takes up to 15 minutes to take effect, which is an acceptable trade.

### Refresh token payload

```json
{ "sub": "u_1", "jti": "<uuid>", "fam": "<uuid>", "iat": …, "exp": … }
```

Only the **SHA-256 hash** of the refresh token is stored in `refresh_tokens`.
A database leak must not hand out working sessions.

---

## 2. Refresh rotation

Every successful refresh **invalidates the presented token and issues a new
pair** in the same family (`fam`).

```
POST /auth/refresh { refreshToken }
  ├─ hash it, look it up
  ├─ not found            → 401
  ├─ expired              → 401
  ├─ already revoked      → REUSE DETECTED: revoke the entire family → 401
  └─ valid  → revoke this one, issue a new access + refresh in the same family
```

Reuse detection is the point of the family id: a stolen refresh token can be
used at most once before the legitimate client's next refresh trips the alarm
and logs out every session in that lineage.

### What the frontend does

`src/api/client.ts` handles this transparently:

1. A request returns `401`.
2. The client calls `/auth/refresh` **once** — concurrent 401s share a single
   in-flight refresh promise, so five parallel queries do not trigger five
   rotations.
3. On success the original request is retried once.
4. On failure the tokens are cleared and a `sessionExpired` event drops the user
   on the sign-in screen.

Two consequences for the backend:

- `/auth/refresh` must be fast and must not itself require an access token.
- A brief grace window (accept a just-rotated token for ~10 seconds) avoids
  spurious logouts when requests race. Recommended, not required.

---

## 3. Password handling

- Hash with **argon2id** (`memoryCost: 19456, timeCost: 2, parallelism: 1`).
  `bcrypt` with cost 12 is an acceptable alternative.
- Minimum 8 characters. Do not impose composition rules — length is what matters.
- Never log or return the hash.
- Reject the request if the password appears in a common-passwords list (optional
  for MVP, cheap to add).

### Reset flow

```
POST /auth/forgot-password { email }
  → always 200, regardless of whether the address exists
  → if it exists: create password_reset_tokens row (hash, 1h TTL), email the link

POST /auth/reset-password { token, password }
  → hash the token, look it up, check expiry and used_at
  → set the new hash, mark used_at
  → revoke every refresh token for that user
```

The identical response for known and unknown addresses is deliberate: it stops
the endpoint being used to enumerate which emails are registered. The frontend
mirrors this — it shows the same confirmation either way.

---

## 4. OAuth

`POST /auth/oauth/:provider` with `{ "idToken": "…" }`, where `provider` is
`google`, `apple` or `facebook`.

The mobile app performs the interactive part with `expo-auth-session` and sends
the resulting identity token. The backend must:

1. **Verify the token with the provider** — never trust its contents unverified.
   - Google: fetch `https://www.googleapis.com/oauth2/v3/certs`, verify RS256,
     check `aud` against `GOOGLE_OAUTH_CLIENT_ID` and `iss` is
     `accounts.google.com`.
   - Apple: verify against `https://appleid.apple.com/auth/keys`, check `aud`
     and `iss`.
   - Facebook: call `GET /debug_token` with an app token.
2. Extract the verified `sub` and `email`.
3. Look up `oauth_accounts (provider, provider_uid)`:
   - found → sign that user in;
   - not found but the email matches an existing user → link the accounts;
   - neither → create a user (username from the email local part, de-duplicated
     with a numeric suffix; `password_hash` stays `NULL`).
4. Return the standard `AuthSession`.

> Apple only returns the user's name on the **first** authorization. Persist it
> then, or the account is left with a placeholder name forever.

---

## 5. Two-factor authentication (TOTP)

Optional per user, per the spec's "Optional Two-Factor Authentication".

### Enrolment

```
POST /auth/2fa/enable       (auth)
  → generate a base32 secret (otplib.authenticator.generateSecret())
  → store in users.two_factor_secret, leave two_factor_enabled = false
  → return { secret, otpauthUrl }

POST /auth/2fa/verify { code }   (auth)
  → verify against the stored secret, window ±1 step (30s)
  → on success set two_factor_enabled = true
  → generate 10 single-use recovery codes, return them once, store hashed
```

The app shows the secret as text and, in a production build, as a QR code
generated from `otpauthUrl`.

### Sign-in with 2FA on

```
POST /auth/login { email, password }
  → password correct, two_factor_enabled = true, no code supplied
  → 401 { "error": { "code": "TWO_FACTOR_REQUIRED", … } }

POST /auth/login { email, password, twoFactorCode }
  → verify TOTP (or a recovery code) → issue tokens
```

Rate-limit code verification to 5 attempts per 15 minutes per account;
lock for 15 minutes after that.

### Disabling

`POST /auth/2fa/disable` — require the current password or a valid TOTP code.
Clear the secret and the recovery codes.

---

## 6. Roles and authorization

Three roles on `users.role`:

| Role | Can |
|---|---|
| `user` | Everything social and commercial — shelves, quotes, reviews, cart, orders |
| `publisher` | All of the above, plus `/publisher/*` scoped to their own `publisher_id` |
| `admin` | All of the above, plus `/admin/*` |

### Middleware

```ts
requireAuth                 // valid access token, attaches req.user
requireRole('publisher')    // requireAuth + role check
requireRole('admin')
requireOwnership(resource)  // requireAuth + the row belongs to req.user
```

### Rules that are easy to get wrong

1. **Publisher scoping is not just a role check.** `PATCH /publisher/books/:id`
   must verify that the book's `publisher_id` equals the token's `publisherId`.
   A publisher editing another publisher's catalogue is the obvious attack.
2. **Return `403`, not `404`,** when a publisher touches another publisher's
   resource. The resource exists; they are not allowed to touch it. (Use `404`
   only where existence itself is private.)
3. **`publisherId` never comes from the request body.** Always from the token.
4. **Ownership on mutations**: `PATCH /reviews/:id`, `DELETE /quotes/:id`,
   `POST /orders/:id/cancel` — the row must belong to the caller. Admins bypass
   this through the `/admin/*` routes, not by relaxing these checks.
5. **Admin actions are audited.** Every `/admin/*` mutation writes an
   `admin_actions` row.

---

## 7. Session lifecycle

```
Cold start
  └─ app reads the stored access token
       ├─ none        → sign-in screen
       └─ present     → GET /auth/me
                          ├─ 200 → authenticated
                          └─ 401 → try refresh → success ? authenticated : sign-in
```

`GET /auth/me` is the session check, so it is called on every launch. Keep it to
a single query plus the derived stats.

`POST /auth/logout` revokes the presented refresh token (and ideally its whole
family). The client clears its store regardless of the response — signing out
must work offline.

---

## 8. Security checklist

- [ ] `helmet` (or equivalent security headers) enabled
- [ ] CORS restricted to `CORS_ORIGINS`, not `*`
- [ ] Rate limits on `/auth/login`, `/auth/register`, `/auth/forgot-password`
- [ ] Passwords hashed with argon2id / bcrypt-12; never logged
- [ ] Refresh tokens stored hashed, rotated on use, reuse detection active
- [ ] JWT secrets ≥ 32 random bytes, different for access and refresh
- [ ] All input validated with Zod before it reaches a query
- [ ] Parameterised queries only (Prisma/Drizzle handle this)
- [ ] Uploads: type + size validated, EXIF stripped, served from a separate domain
- [ ] 5xx responses carry no stack traces
- [ ] `X-Request-Id` on every response, and in every log line
- [ ] HTTPS in production, HSTS enabled
- [ ] Account deletion actually deletes or anonymises personal data
