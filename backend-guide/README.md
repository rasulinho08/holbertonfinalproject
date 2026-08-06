# KitabDostu — Backend Guide

This folder is the **complete specification of the backend** for KitabDostu / Reader.
It lives in the frontend repository on purpose: the mobile app is already built and
already calls every endpoint documented here (against a bundled mock). Implement the
routes exactly as specified and the app switches from mock to live by changing one
environment variable.

> **The backend itself is developed in a separate repository.** Copy this folder into
> that repo (or keep it referenced) and treat it as the source of truth.

---

## Contents

| File | What it covers |
|---|---|
| [`CONVENTIONS.md`](./CONVENTIONS.md) | Response envelope, pagination, error codes, status codes, headers, rate limits |
| [`ENDPOINTS.md`](./ENDPOINTS.md) | **Every route** — method, path, auth, params, request body, response, errors |
| [`DATABASE.md`](./DATABASE.md) | Full PostgreSQL schema: tables, columns, enums, indexes, constraints, triggers |
| [`AUTH.md`](./AUTH.md) | JWT access/refresh, OAuth (Google/Apple/Facebook), password reset, TOTP 2FA, roles |
| [`INTEGRATIONS.md`](./INTEGRATIONS.md) | Google Books sync, Payriff/MilliKart payments, SMS, push, uploads, OCR |
| [`ROADMAP.md`](./ROADMAP.md) | Sprint-ordered build sequence with acceptance criteria |
| [`openapi.yaml`](./openapi.yaml) | Machine-readable spec — import into Swagger UI, Postman or a codegen tool |
| [`postman_collection.json`](./postman_collection.json) | Ready-to-run request collection |
| [`seed-data/`](./seed-data/) | The exact dataset the frontend mock uses — seed with this and the app behaves identically |

---

## Recommended stack

The product spec calls for Node.js + PostgreSQL. A setup that matches this
specification with the least friction:

| Concern | Choice |
|---|---|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express 4 or Fastify 4 |
| Language | TypeScript |
| ORM | Prisma (schema maps 1:1 to `DATABASE.md`) or Drizzle |
| Database | PostgreSQL 15+ |
| Validation | Zod — one schema per endpoint body |
| Auth | `jsonwebtoken` + `argon2` (or `bcrypt`) |
| 2FA | `otplib` |
| File storage | S3-compatible (AWS S3, Cloudflare R2) via presigned uploads |
| Cache / rate limit | Redis (optional for MVP) |
| Tests | Vitest + Supertest |

---

## Suggested project layout

```
backend/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts                # loads ../backend-guide/seed-data/*.json
├─ src/
│  ├─ index.ts               # server bootstrap
│  ├─ app.ts                 # express app, middleware chain
│  ├─ config/env.ts          # typed env parsing
│  ├─ middleware/
│  │  ├─ auth.ts             # requireAuth, requireRole
│  │  ├─ error.ts            # ApiError -> error envelope
│  │  ├─ validate.ts         # zod body/query validation
│  │  └─ rateLimit.ts
│  ├─ lib/
│  │  ├─ prisma.ts
│  │  ├─ jwt.ts
│  │  ├─ pagination.ts       # ?page&limit -> { data, meta }
│  │  └─ envelope.ts         # ok(data, meta) / fail(code, message)
│  ├─ modules/
│  │  ├─ auth/               # routes.ts | service.ts | schemas.ts
│  │  ├─ users/
│  │  ├─ books/
│  │  ├─ shelves/
│  │  ├─ reviews/
│  │  ├─ quotes/
│  │  ├─ buddy-reads/
│  │  ├─ cart/
│  │  ├─ orders/
│  │  ├─ payments/
│  │  ├─ gamification/
│  │  ├─ notifications/
│  │  ├─ publisher/
│  │  └─ admin/
│  └─ integrations/
│     ├─ googleBooks.ts
│     ├─ payriff.ts
│     ├─ sms.ts
│     ├─ push.ts
│     └─ ocr.ts
└─ tests/
```

Each module owns three files: `routes.ts` (wiring), `service.ts` (logic),
`schemas.ts` (Zod). Keeping them together makes the module boundaries obvious
and lets several people work in parallel without merge conflicts.

---

## Getting started

```bash
# 1. scaffold
mkdir backend && cd backend
npm init -y
npm i express cors helmet compression zod jsonwebtoken argon2 otplib @prisma/client
npm i -D typescript tsx @types/node @types/express prisma vitest supertest

# 2. database
npx prisma init --datasource-provider postgresql
#    paste the schema derived from DATABASE.md into prisma/schema.prisma
npx prisma migrate dev --name init

# 3. seed with the same data the frontend mock uses
npx tsx prisma/seed.ts

# 4. run
npm run dev        # http://localhost:4000/api/v1
```

### Required environment variables

```bash
PORT=4000
DATABASE_URL=postgresql://user:pass@localhost:5432/kitabdostu
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
CORS_ORIGINS=http://localhost:8081,exp://127.0.0.1:8081

GOOGLE_BOOKS_API_KEY=
GOOGLE_OAUTH_CLIENT_ID=
APPLE_OAUTH_CLIENT_ID=
FACEBOOK_OAUTH_APP_ID=

PAYRIFF_MERCHANT_ID=
PAYRIFF_SECRET_KEY=
PAYRIFF_BASE_URL=https://api.payriff.com/api/v2

S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

SMS_PROVIDER_KEY=
EXPO_PUSH_ACCESS_TOKEN=
OCR_PROVIDER_KEY=
```

---

## Connecting the frontend

Once the backend answers on `http://localhost:4000/api/v1`, in the **frontend**
repository create `.env.local`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
EXPO_PUBLIC_USE_MOCK_API=false
```

Then restart Metro (`npm run web -- --clear`). No frontend code changes.

Device-specific host values:

| Target | `EXPO_PUBLIC_API_BASE_URL` |
|---|---|
| Web (same machine) | `http://localhost:4000/api/v1` |
| iOS simulator | `http://localhost:4000/api/v1` |
| Android emulator | `http://10.0.2.2:4000/api/v1` |
| Physical device | `http://<your-LAN-IP>:4000/api/v1` |

---

## Definition of done for an endpoint

An endpoint is finished when all of the following hold:

1. Path, method and status codes match [`ENDPOINTS.md`](./ENDPOINTS.md) exactly.
2. The success body is wrapped in `{ "data": ... }`, list endpoints add `"meta"`.
3. Errors use the envelope and the codes in [`CONVENTIONS.md`](./CONVENTIONS.md).
4. Request bodies are validated with Zod; a failure returns `422 VALIDATION_ERROR`
   with per-field messages.
5. Auth is enforced per the "Auth" column, and ownership is checked on mutations.
6. There is at least one happy-path and one failure test.
7. The corresponding frontend screen works with `EXPO_PUBLIC_USE_MOCK_API=false`.

---

## Where the frontend calls each endpoint

Useful when you want to see the expected shape in practice — the frontend's mock
implementation is a working reference server:

| Frontend file | Role |
|---|---|
| `src/api/endpoints.ts` | Every path, as typed constants — mirrors `ENDPOINTS.md` |
| `src/api/mock/handlers.ts` | A working implementation of every route |
| `src/api/mock/seed.ts` | The dataset exported to `seed-data/` |
| `src/types/index.ts` | TypeScript definitions of every response payload |
| `src/api/hooks/*` | Which screen calls which endpoint |

If you are unsure what a response should contain, read the matching handler in
`src/api/mock/handlers.ts` — it is intentionally small and readable.
