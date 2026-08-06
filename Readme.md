<div align="center">

# 📚 KitabDostu / Reader

**Azərbaycanın kitabsevərləri üçün sosial şəbəkə və kitab marketplace-i**
*Azerbaijan's social network and marketplace for book lovers*

React Native · Expo · TypeScript · TanStack Query

</div>

---

## Layihə haqqında / About

KitabDostu birləşdirir: **Goodreads**-in sosial təcrübəsini, **1000Kitap**-ın sitat
mədəniyyətini, **StoryGraph**-ın oxu analitikasını və yerli kitab marketplace-ini —
bir tətbiqdə.

KitabDostu combines the social experience of Goodreads, the quote culture of
1000Kitap, the reading analytics of StoryGraph and a local book marketplace into
a single mobile app.

This repository contains the **mobile frontend**. The backend is developed in a
separate repository against the contract in [`backend-guide/`](./backend-guide/).

---

## ✨ Nə hazırdır / What's built

Bütün ekranlar işlək vəziyyətdədir və real məlumatla doludur (mock API).
Every screen below is implemented and running against the built-in mock API.

| Sahə / Area | Xüsusiyyətlər / Features |
|---|---|
| 🔐 **Auth** | E-poçt ilə giriş/qeydiyyat, Google/Apple/Facebook, şifrə bərpası, 2FA, onboarding kviz |
| 📖 **Rəflər / Shelves** | Oxuyuram · Oxudum · Oxumaq istəyirəm · Yarımçıq qoydum + öz rəflərin, səhifə tərəqqisi |
| 💬 **Sosial / Social** | Sitatlar (8 fon şablonu, OCR), rəylər (1–10, spoyler tag), bəyənmə, şərh, izləmə |
| 🔍 **Kəşf / Discovery** | Yazı səhvinə dözümlü axtarış, janr/dil/reytinq/qiymət filtri, "Bunu nəzərdə tuturdun?" |
| 🛒 **Marketplace** | Çoxsatıcılı səbət, kuryer/məntəqə/Azərpoçt, kart/nağd/POS/balans, hədiyyə kartı |
| 📦 **Sifarişlər / Orders** | Status izləmə xətti, elektron qəbz, ləğv etmə |
| 🎮 **Gamification** | Oxu seriyası, 10 nişan, həftəlik/aylıq reytinq cədvəli |
| 👥 **Birgə oxu / Buddy reads** | Qrup yaratma, hər üzvün tərəqqisi, fəsil üzrə müzakirə |
| 📊 **Profil** | Janr bölgüsü (pie chart), həftəlik oxu, illik hədəf halqası |
| 🏢 **Nəşriyyat / Publisher** | Satış paneli, kitab əlavə/redaktə, anbar, sifariş idarəetməsi, analitika |
| 🛡️ **Moderasiya** | Şikayət növbəsi, rəy/sitat silmə, audit |
| 🌗 **UX** | Qaranlıq/işıqlı mövzu, **AZ ⇄ EN** dil dəyişimi, oflayn rejim, skeleton yükləmə |

---

## 🛠 Texnologiyalar / Tech stack

| Layer | Choice | Niyə / Why |
|---|---|---|
| Runtime | **Expo SDK 54** · React Native 0.81 · React 19 | iOS + Android + Web, tək kod bazası |
| Routing | **expo-router** | Fayl əsaslı, tipli marşrutlar |
| Server state | **TanStack Query v5** | Keşləmə, sinxronizasiya, optimistik yeniləmə |
| Client state | **Zustand** + AsyncStorage | Səbət, tənzimləmələr, oflayn növbə |
| Styling | Token əsaslı dizayn sistemi (`src/theme`) | RN üçün Tailwind/shadcn mövcud deyil |
| Charts | `react-native-svg` (əl ilə) | 3 qrafik üçün kitabxana artıqdır |
| Icons | `lucide-react-native` | |
| Storage | `expo-secure-store` (token) · AsyncStorage (keş) | |

---

## 🚀 Quraşdırma / Installation

**Tələblər:** Node.js 20+, npm 10+

```bash
git clone <repo-url>
cd holbertonfinalproject
npm install
cp .env.example .env.local     # istəyə bağlı — defolt olaraq mock API işləyir
```

### İşə salınma / Running

```bash
npm run web        # brauzerdə aç → http://localhost:8081
npm run android    # Android emulator / cihaz
npm run ios        # iOS simulator (macOS)
npm start          # QR kod — Expo Go ilə telefonda aç
```

> **Demo girişi:** istənilən e-poçt və şifrə ilə daxil ola bilərsən.
> E-poçtda `publisher` sözü olsa → nəşriyyat paneli, `admin` olsa → moderasiya
> paneli açılır. Rolu `Tənzimləmələr → DEMO` bölməsindən də dəyişmək olar.

### Digər əmrlər / Other commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run e2e         # başsız Chrome ilə uçdan-uca test (əvvəlcə `npm run web`)
npm run build:web   # statik web build → dist/
```

---

## 🔌 Backend qoşulması / Connecting the backend

Tətbiq **hazır API müqaviləsi** ilə yazılıb. Backend hazır olanda `.env.local`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
EXPO_PUBLIC_USE_MOCK_API=false
```

Bundan sonra Metro-nu yenidən başlat (`npm run web -- --clear`).
**Heç bir kod dəyişikliyi tələb olunmur** — bütün ekranlar eyni hook-lardan
istifadə edir.

Backend komandası üçün tam sənədləşmə: [`backend-guide/`](./backend-guide/)

| Fayl | Nə var |
|---|---|
| [`ENDPOINTS.md`](./backend-guide/ENDPOINTS.md) | Bütün endpoint-lər — metod, yol, body, cavab, xəta |
| [`DATABASE.md`](./backend-guide/DATABASE.md) | PostgreSQL sxemi (26 cədvəl), indekslər, trigger-lər |
| [`AUTH.md`](./backend-guide/AUTH.md) | JWT, OAuth, 2FA, rollar |
| [`INTEGRATIONS.md`](./backend-guide/INTEGRATIONS.md) | Google Books, Payriff, SMS, push, OCR |
| [`ROADMAP.md`](./backend-guide/ROADMAP.md) | Sprint üzrə tikinti ardıcıllığı |
| [`openapi.yaml`](./backend-guide/openapi.yaml) | Swagger / codegen üçün |
| [`seed-data/`](./backend-guide/seed-data/) | Mock məlumatın JSON ixracı — eyni ilə seed et |

---

## 📁 Struktur / Project structure

```
holbertonfinalproject/
├─ app/                      # Ekranlar (expo-router)
│  ├─ (auth)/                #   login · register · forgot-password · onboarding
│  ├─ (tabs)/                #   index · explore · quotes · shelves · profile
│  ├─ book/[id]/             #   kitab detalı + rəylər
│  ├─ quote/ · review/       #   sitat & rəy yaratma
│  ├─ cart · checkout/       #   səbət → ünvan → ödəniş → uğur
│  ├─ orders/                #   sifariş siyahısı + izləmə
│  ├─ buddy-reads/           #   birgə oxu
│  ├─ publisher/ · admin/    #   nəşriyyat & moderasiya panelləri
│  └─ settings/              #   profil · təhlükəsizlik · görünüş
├─ src/
│  ├─ api/                   # ⚠️ frontend ↔ backend sərhədi
│  │  ├─ endpoints.ts        #   bütün yollar bir yerdə
│  │  ├─ client.ts           #   fetch, token yeniləmə, xəta normallaşdırma
│  │  ├─ mock/               #   işlək mock backend (58 kitab, 14 istifadəçi…)
│  │  └─ hooks/              #   ekranların istifadə etdiyi yeganə API səthi
│  ├─ components/            # ui · book · quote · review · profile · charts
│  ├─ theme/                 # rəng tokenləri, tipoqrafiya, dark/light
│  ├─ i18n/                  # az.ts · en.ts (tip təhlükəsiz açarlar)
│  ├─ store/                 # auth · cart · prefs · offline · checkout
│  └─ types/                 # domen modeli (API müqaviləsi ilə eyni)
├─ backend-guide/            # 👉 digər repo üçün spesifikasiya
├─ docs/PRODUCT_SPEC.md      # ilkin məhsul brifi
└─ e2e/smoke.mjs             # uçdan-uca test
```

### Memarlıq qərarı / Key architectural decision

Ekranlar **heç vaxt** birbaşa HTTP çağırmır — yalnız `src/api/hooks/*` istifadə
edir. Mock və real backend eyni müqaviləni yerinə yetirir, ona görə keçid bir
env dəyişəni ilə baş verir.

```
Screen  →  useBook(id)  →  api.get(Endpoints.books.detail(id))
                                      ↓
                    USE_MOCK_API ?  mock/handlers.ts  :  fetch(API_BASE_URL)
```

---

## ✅ Test / Verification

`npm run e2e` başsız Chrome-da tətbiqi idarə edərək spesifikasiyadakı hər iki
istifadəçi axınını yoxlayır:

```
PASS  login screen renders          PASS  book added to shelf
PASS  sign in navigates to onboarding   PASS  cart shows the added book
PASS  genre chips load              PASS  checkout address step
PASS  onboarding reaches goal step  PASS  checkout payment step
PASS  home screen loads             PASS  order placed
PASS  explore tab opens             PASS  profile renders stats
PASS  search returns results        PASS  quotes feed renders
PASS  book detail opens             PASS  leaderboard renders
PASS  shelf picker opens
                                    17/17 steps passed · 0 console errors
```

---

## 👥 Komanda / Team

<!-- Komanda üzvlərinin adlarını buraya əlavə edin -->

| Ad / Name | Rol / Role | GitHub |
|---|---|---|
| _(doldurulacaq)_ | Frontend | [@…](https://github.com/) |
| _(doldurulacaq)_ | Backend | [@…](https://github.com/) |

---

## 🤝 Töhfə / Contributing

Branch strukturu, commit qaydaları və PR prosesi:
[`CONTRIBUTING.md`](./CONTRIBUTING.md)

```
main       ← stabil, release-ə hazır
├─ frontend  ← bu repo üçün əsas iş branch-i
└─ backend   ← API inteqrasiyası
```

---

## 📄 Lisenziya / License

MIT — Holberton School final project.
