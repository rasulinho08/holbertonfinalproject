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
| ⏱️ **Oxu seansı / Sessions** | Taymer, seans tarixçəsi, saatda səhifə sürəti, avtomatik tərəqqi yeniləməsi |
| 🗂️ **Siyahılar / Lists** | Redaksiya və istifadəçi siyahıları, izləmə, kitab əlavə/çıxarma |
| 🎮 **Gamification** | Oxu seriyası, 10 nişan, həftəlik/aylıq reytinq cədvəli |
| 👥 **Birgə oxu / Buddy reads** | Qrup yaratma, hər üzvün tərəqqisi, fəsil üzrə müzakirə |
| 📊 **Profil** | Janr bölgüsü (pie chart), həftəlik oxu, illik hədəf halqası, oxu statistikası |
| 🏢 **Nəşriyyat / Publisher** | Satış paneli, kitab əlavə/redaktə, anbar, sifariş idarəetməsi, analitika |
| 🛡️ **Moderasiya** | Şikayət növbəsi, rəy/sitat silmə, audit |
| 🌗 **UX** | 3 rəng paleti × qaranlıq/işıqlı, **AZ ⇄ EN**, animasiyalar, oflayn rejim, skeleton |

### 📚 Kataloq / Catalogue

**1000 real kitab, 618 müəllif** — [Open Library](https://openlibrary.org)-dən
`scripts/build-catalog.mjs` ilə yığılıb və repoya yazılıb. 981 kitabın real üzlük
şəkli, 455 müəllifin real fotosu var. Qiymət, anbar və Azərbaycan dilində təsvirlər
sabit PRNG toxumu ilə real biblioqrafik məlumatın üzərində yaradılır — hər maşında
eyni görünür və internet olmadan da açılır.

```bash
node scripts/build-catalog.mjs --target 1000   # kataloqu yenilə (Open Library)
```

```bash
node scripts/export-seed.mjs                   # backend-guide/seed-data/ üçün ixrac
```

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

> 📱 **Telefonda test və APK üçün:** [`MOBILE.md`](./MOBILE.md) — Expo Go,
> EAS ilə `.apk` build və telefondan backend-ə qoşulma (`localhost` işləmir,
> LAN IP lazımdır).

> **Demo girişi:** istənilən e-poçt və şifrə ilə daxil ola bilərsən.
> E-poçtda `publisher` sözü olsa → nəşriyyat paneli, `admin` olsa → moderasiya
> paneli açılır. Rolu `Tənzimləmələr → DEMO` bölməsindən də dəyişmək olar.

### Digər əmrlər / Other commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run build:web   # statik web build → dist/
```

---

## 🔌 Backend qoşulması / Connecting the backend

Tətbiq bütün datanı backend-dən alır — daxili mock yoxdur. `.env.local`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Dəyər **build zamanı** bundle-a yazılır, ona görə dəyişəndən sonra Metro-nu
`--clear` ilə yenidən başlatmaq lazımdır.

Backend: [holbertonfinalproject-backend](https://github.com/rasulinho08/holbertonfinalproject-backend)

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
| [`MOBILE.md`](./MOBILE.md) | Telefonda test, APK build, cihazdan backend-ə qoşulma |

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
│  │  ├─ mock/               #   işlək mock backend (1000 kitab, 14 istifadəçi…)
│  │  └─ hooks/              #   ekranların istifadə etdiyi yeganə API səthi
│  ├─ components/            # ui · book · quote · review · profile · charts
│  ├─ theme/                 # rəng tokenləri, tipoqrafiya, dark/light
│  ├─ i18n/                  # az.ts · en.ts (tip təhlükəsiz açarlar)
│  ├─ store/                 # auth · cart · prefs · offline · checkout
│  └─ types/                 # domen modeli (API müqaviləsi ilə eyni)
├─ backend-guide/            # 👉 digər repo üçün spesifikasiya
├─ docs/PRODUCT_SPEC.md      # ilkin məhsul brifi
└─ app/                      # Expo-router ekranları
```

### Memarlıq qərarı / Key architectural decision

Ekranlar **heç vaxt** birbaşa HTTP çağırmır — yalnız `src/api/hooks/*` istifadə
edir. Mock və real backend eyni müqaviləni yerinə yetirir, ona görə keçid bir
env dəyişəni ilə baş verir.

```
Screen  →  useBook(id)  →  api.get(Endpoints.books.detail(id))
                                      ↓
                            fetch(API_BASE_URL + path)
```

---

## ✅ Test / Verification

App verification is handled through the regular project checks and manual flow testing, without the browser-driven smoke suite.

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
