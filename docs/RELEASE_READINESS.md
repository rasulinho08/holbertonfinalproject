# KitabDostu — release readiness (2026-10-09)

Branch `claude/zealous-faraday-s6709u` in both repositories. Nothing here has
been merged to `main` or deployed. Device testing on physical Android/iOS
hardware has **not** been done; see "Not verified".

## Decision: NOT READY — blockers remain

Ready for **staging** once the branches are merged and Render rebuilds; not
ready for store submission (see blockers).

## What was broken (baseline, before this work)

| | Frontend | Backend |
|---|---|---|
| Typecheck | **219 errors** (`src/types/index.ts` truncated by merge `be4cf57`) | **72 errors** (`users/service.ts` truncated by merge `b35232a`) |
| Build | web bundle built (Babel skips types) | **failed** → every Render deploy since the merge silently failed |
| Runtime | — | **server could not boot** (ESM link error on missing export) |
| Lint | 1 error, 19 warnings | no ESLint config, command failed |
| Tests | none | Vitest configured, **0 tests** |
| CI | typecheck red on `main` | **no CI** |
| expo-doctor | 15/18 | — |

## Results now

| Check | Frontend | Backend |
|---|---|---|
| Typecheck | **0 errors** | **0 errors** |
| Lint | **0 errors** (19 warnings, unused vars) | **clean** |
| Build | web build ✓, Android bundle ✓ (6.6 MB Hermes), iOS bundle ✓ (6.6 MB) | `tsc` build ✓ |
| Tests | browser walk (Playwright, iPhone 13 + 360 px + dark) ✓ | **31/31** integration tests (real Postgres) |
| Smoke | — | `smoke` 55/55, `smoke:full` 156/156 |
| expo-doctor | 17/18 (only package-version drift left) | — |

## Task board

| ID | Sev | Issue | Status | Evidence |
|---|---|---|---|---|
| KD-01 | P0 | Backend `users/service.ts` truncated by merge; build fails, server can't boot, deploys stuck | **Fixed** (3-way merge of parents) | 15/23 tests fail with old file; all pass now |
| KD-02 | P0 | Frontend domain types truncated by merge; CI red | **Fixed** | typecheck 219 → 0 |
| KD-03 | P0 | Wallet checkout charged pre-discount total (lost money on refund) | **Fixed** | `tests/commerce.test.ts`: old code 5 ₼ short |
| KD-04 | P0 | Gift card redeemable twice concurrently (double credit) | **Fixed** | old code: two 200s; now 200 + 409 |
| KD-05 | P1 | Stock / wallet overdraw races in checkout | **Fixed** (conditional updates) | code + tests |
| KD-06 | P1 | Unfinished upload commit (path traversal file route, no bytes stored) | **Backed out** | — |
| KD-07 | P1 | Avatars saved as device-local `file://`/`blob:` URIs, invisible to others; cover photo feature removed | **Fixed**: `media_files` + `POST /uploads` + client resize | browser: 27 KB / 44 KB uploaded, served `image/jpeg` |
| KD-08 | P1 | Network failure during refresh / offline cold start signed users out | **Fixed** | code review; not reproduced on device |
| KD-09 | P1 | Query cache not cleared on logout → next account sees previous user's data | **Fixed** | browser: shelves refetched after switch |
| KD-10 | P1 | Onboarding redirect loop / stuck on login (server vs device flag) | **Fixed** | — |
| KD-11 | P2 | Guest launch: 6× 401 + 6× logout calls | **Fixed** | browser: 0 and 0 |
| KD-12 | P1 | Unused Android/iOS permissions (RECORD_AUDIO, SYSTEM_ALERT_WINDOW, mic, Face ID) | **Fixed** | verified with `expo prebuild` |
| KD-13 | P1 | `react-native-worklets` not a direct dep (0.8.3 transitive vs SDK 0.5.1) | **Fixed** (pinned 0.5.1) | expo-doctor peer check passes |
| KD-14 | P2 | `androidNavigationBar.visible` invalid; production profile without `autoIncrement` | **Fixed** | expo-doctor schema check passes |
| KD-15 | P1 | OCR stub returned canned quotes for any photo, in production | **Fixed** (empty + `available:false`; app says unavailable) | — |
| KD-16 | P2 | Profile links accepted `javascript:` and arbitrary strings | **Fixed** (http(s) only) | tests |
| KD-17 | P2 | Account deletion left name, cover photo and photos | **Fixed** | tests |
| KD-18 | P2 | Brand: icon orange, login green, buttons blue, dark theme blue | **Fixed** (orange primary, full-bleed icon) | screenshots |
| KD-19 | P2 | Tab bar: 6 tabs, "+" covering two of them, fake Cart tab, 9 pt labels | **Fixed** (5 tabs, cart in header) | screenshots |
| KD-20 | P2 | Home rows overflow card; profile name drawn over cover | **Fixed** | screenshots |
| KD-21 | P2 | Developer hint with `SEED_PASSWORD` shown on production login | **Fixed** (`__DEV__` only) | — |
| KD-22 | P2 | 1,760 Lucide icons bundled, 98 used (~17% of JS source) | Open | source-map analysis |
| KD-23 | P3 | `eslint-config-expo` is the SDK 57 line; expo/expo-constants patch updates | Open | expo-doctor |
| KD-24 | P3 | `env.ts` production placeholder check misses `.env.example`'s value | Open | Render generates real secrets, so not live |
| KD-25 | P2 | CORS-refused origin surfaces as 500 | Open | documented in CLAUDE.md |
| KD-26 | P2 | `edgeToEdgeEnabled: false` is ignored on Android 16 | Open — needs device check | prebuild warning |
| KD-27 | P3 | `supportsTablet: true` requires iPad screenshots for App Store | Open — owner decision | — |

## Release blockers (must be done outside this code)

1. **Merge the branches and redeploy.** Production Render still runs a build
   from before merge `b35232a`; it will pick up the fixes (and run the new
   additive `media_files` migration via `migrate deploy`) on the next deploy.
2. **No device testing yet.** Android and iOS JS bundles compile and native
   config was verified with `expo prebuild`, but no APK/IPA was built and run.
   Build `eas build -p android --profile preview` and test on a phone.
3. **Payments are a stub.** Card payment refuses in production without
   Payriff credentials; the checkout should not offer card payment until it
   is configured (not changed here).
4. **Store requirements still missing:** privacy policy URL, iOS build needs
   an Apple Developer account, Play data-safety form.
5. **Demo accounts with a published password** exist on the production DB
   (`password123`) — change or remove before real users.

## Not verified

- Behaviour on physical Android / iOS devices (only web at phone viewports).
- The audit agents for UI/UX, security and contract review stopped early on
  an API rate limit; their findings were partially recovered from the probe
  scripts they left (checkout overcharge) and the rest re-checked manually.
  A full security review and a contract-level frontend/backend comparison of
  every endpoint have not been completed.
