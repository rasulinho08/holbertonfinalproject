# KitabDostu — layihə konteksti

Bu fayl bu qovluqda hər Claude Code sessiyası başlayanda avtomatik oxunur.
Məqsədi: heç bir izahat verilmədən layihənin tam vəziyyətini bilmək.

## Nə layihədir

**KitabDostu** — Azərbaycan üçün kitabsevərlər sosial şəbəkəsi + bazar yeri.
Holberton School bitirmə layihəsi (məzun işi), GRC layihələri ilə heç bir əlaqəsi yoxdur.

İki ayrı repo var, ayrı qovluqlarda:

| | Yer | Repo |
|---|---|---|
| **Frontend** (bu qovluq) | `C:\Users\User\holbertonfinalproject` | `rasulinho08/holbertonfinalproject` |
| **Backend** | `C:\Users\User\kitabdostu-backend` | `rasulinho08/holbertonfinalproject-backend` |

Diskdə bu adla bir neçə köhnə/artıq nüsxə var (`holbertonfinalproject-1`, `-2`,
`-3`, Desktop-dakı `MOBILE APP\holbertonfinalproject`) — hamısı `main`-dən
geridə qalıb, işləmə üçün istifadə olunmur. **Yalnız bu qovluq canlıdır.**

## Texnologiya

Expo Router / React Native Web, TypeScript. `expo export --platform web` ilə
statik sayt kimi ixrac olunur, `dist/` içinə. Server kodu yoxdur.

## Deploy — Frontend (bu repo)

**Canlı ünvan:** https://holbertonfinalproject0.mamishovrasul028.workers.dev

Cloudflare **Workers** (Pages yox!) — hesabda `holbertonfinalproject0` adlı
Worker var, `main` branch-dan Git inteqrasiyası ilə avtomatik build olunur.

- Build command: `npm run build:web` (= `expo export --platform web --output-dir dist && node scripts/inject-pwa-head.mjs`)
- Deploy command: `npx wrangler deploy`
- Config: [wrangler.jsonc](wrangler.jsonc)

**Tələlər (təkrar kəşf etmə):**
- `wrangler.jsonc`-dakı `"name"` **mütləq** Cloudflare-dəki Worker adı ilə eyni
  olmalıdır (`holbertonfinalproject0`). Build token yalnız o Worker-ə bağlıdır;
  fərqli ad yazsan build yaşıl görünür, deploy addımı isə icazə xətası ilə
  dayanır.
- `public/_redirects` faylı **olmamalıdır**. Workers onu oxuyur və
  `/*  /index.html  200` qaydasını sonsuz dövrə sayıb deploy-u rədd edir. SPA
  fallback-ı `wrangler.jsonc`-dakı `not_found_handling: "single-page-application"`
  verir.
- Bu fallback **hər** naməlum yola 200 + HTML qaytarır — yəni "fayl canlıdadırmı?"
  sualını status koduna görə yoxlamaq olmaz, `Content-Type`-a baxmaq lazımdır
  (`application/json` gəlirsə fayl realdır, `text/html` gəlirsə SPA fallback-dır).
- `EXPO_PUBLIC_*` dəyişənləri **build zamanı** kodun içinə yazılır. Production-da
  `EXPO_PUBLIC_API_BASE_URL` boş olsa, [src/api/config.ts](src/api/config.ts)
  import anında xəta atır — build "uğurlu" görünür, sayt isə ağ açılır.
  Cloudflare-də bu üç dəyişən qoyulmalıdır: `EXPO_PUBLIC_API_BASE_URL`,
  `EXPO_PUBLIC_DEFAULT_LOCALE=az`, `NODE_VERSION=20`.
- `app.json`-dakı `display: standalone` təkbaşına heç nə etmir — Expo bunu
  ixrac olunan HTML-ə yazmır. PWA teqlərini (manifest, Apple meta teqləri)
  [scripts/inject-pwa-head.mjs](scripts/inject-pwa-head.mjs) `expo export`-dan
  sonra əlavə edir. `app/+html.tsx` işləmir — o yalnız statik render
  rejimində oxunur, bu proyekt SPA rejimindədir.

## Deploy — Backend

**Canlı ünvan:** https://holbertonfinalproject-backend.onrender.com (API kökü: `/api/v1`)

Render (Docker, `render.yaml`) — `main`-ə push avtomatik deploy edir. Baza —
Neon Postgres (pulsuz, müddətsiz). Render-in öz pulsuz Postgres-i **yoxdur**,
30 gündə silinir, ona görə Neon seçilib.

Pulsuz Render 15 dəqiqə trafiksiz qalanda yatır, növbəti sorğu ~30-50 saniyə
gözləyir. Demoya birinci açılış üçün bir-iki dəqiqə əvvəl saytı aç.

**Tələ:** `CORS_ORIGINS` Render-də dəqiq frontend origin-ini daşımalıdır
(`https://holbertonfinalproject0.mamishovrasul028.workers.dev`). Backend rədd
edən origin-i `Error` ilə qaytarır — bu, CORS mesajı yox, **500** kimi görünür.
Simptom: brauzerdə "Network request failed", backend log-larında isə
`CORS: origin refused` sətri (rədd edilən origin adı ilə).

**Demo hesab:** `leyla@kitabdostu.az` / `password123` (həmçinin `publisher@`,
`admin@`). Backend detalları üçün `kitabdostu-backend/CLAUDE.md`-ə bax.

## Mobil (Android / iOS)

EAS proyekti `@rasul028/kitabdostu`, Expo hesabı `mamishovrasul028@gmail.com`.

- **Android:** `npx eas-cli build --platform android --profile preview` → APK,
  backend olaraq canlı Render ünvanı bağlıdır, istənilən telefonda işləyir.
  Play Store üçün `--profile production` (`.aab` verir).
- **iOS:** Apple sideload-a icazə vermir, real build üçün Apple Developer
  hesabı ($99/il) lazımdır. Pulsuz yol: saytı **Safari**-də aç → Paylaş →
  **Ana ekrana əlavə et**. PWA teqləri sayəsində tətbiq kimi açılır (yuxarı
  bax). Alternativ: Expo Go + `npx expo start --tunnel` (kompüter işlək
  qalmalıdır).
- `eas.json`-un içindəki profillərdə `"//"` şərh açarları **olmamalıdır** —
  cari eas-cli sxemi onları rədd edir, hər `eas` komandası "eas.json is not
  valid" ilə dayanır. Şərhlərin məzmunu [MOBILE.md](MOBILE.md)-dədir.

## Git təmizliyi

`e2e/audit-*`, `e2e/palettes/`, `e2e/screenshots/` — QA screenshot çıxışları,
`.gitignore`-dadır, **repoya əlavə etmə**. Bir dəfə səhvən 32 MB commit
olunmuşdu, çıxarıldı (tarixçədə hələ qalır, praktiki təsiri yoxdur).

## Sənədlər

- [MOBILE.md](MOBILE.md) — telefonda işə salma, EAS build, alternativ host-lar.
- [README.md](README.md) — layihəyə ümumi baxış.

## Son iş (2026-08-18)

Amin-in QA hesabatındakı 4 defekt düzəldildi və canlıya çıxarıldı:
1. Sitat kartının fon qradienti künclərdə boşluq qoyurdu — `QuoteCard.tsx`.
2. Rəyə şərh yazma ekranı yox idi — `app/review/[id].tsx` yaradıldı.
3. Checkout xülasəsi "Özün götür" seçimini "Kuryer" kimi göstərirdi —
   `app/checkout/payment.tsx`.
4. Birgə oxu (buddy-read) səhifələri nailiyyətlərə/profil statistikasına
   sayılmırdı — backend tərəfdə düzəldildi, bax `kitabdostu-backend/CLAUDE.md`.

Backend-dəki dəyişiklik canlı API-də `leyla` hesabı ilə test edilib və
təsdiqlənib (rəf statusu, kitab/səhifə sayğacı, illik hədəf, `reading_marathon`
nişanı — hamısı gözlənilən kimi dəyişdi).
