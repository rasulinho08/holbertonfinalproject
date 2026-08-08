# Running KitabDostu on a phone

The web build is only a development convenience — the app is a React Native app
and should be tested on a real device. There are three ways to do that, in
increasing order of effort.

| | Setup | Rebuild after a code change | Shareable | Needs the backend |
|---|---|---|---|---|
| **1. Expo Go** | scan a QR code | instant (hot reload) | no | optional |
| **2. EAS preview APK** | Expo account | ~10 min cloud build | yes, one `.apk` link | optional |
| **3. Local `run:android`** | Android Studio + JDK | ~2 min | yes | optional |

For day-to-day work use **Expo Go**. For handing something to a teacher or a
teammate, build the **preview APK**.

---

## 1. Expo Go — fastest

This project uses no custom native modules; every dependency
(`expo-image`, `expo-router`, `expo-secure-store`, `expo-haptics`,
`expo-image-picker`, `react-native-reanimated`, `react-native-svg`, …) ships
inside Expo Go for SDK 54. So there is nothing to compile.

1. Install **Expo Go** from Google Play (Android) or the App Store (iOS).
2. On your computer, in the project folder:

```bash
npx expo start
```

3. Scan the QR code from the terminal with Expo Go (Android) or the Camera app
   (iOS).

The phone and the computer must be on the **same Wi-Fi**. If your network blocks
device-to-device traffic (common on university and café Wi-Fi), use a tunnel:

```bash
npx expo start --tunnel
```

That routes through Expo's servers, so it works on any network — just slower.

---

## 2. EAS preview APK — a real installable file

Produces a single `.apk` you can send over Telegram/WhatsApp and install on any
Android phone. No Android Studio required; the build runs in Expo's cloud.

```bash
npm i -g eas-cli
```

```bash
eas login
```

```bash
eas init
```

`eas init` creates the project on Expo's side and writes the real `projectId`
into `app.json`. **Commit that change** — the placeholder that used to be there
was removed precisely because it was not a real id.

Then build:

```bash
eas build --platform android --profile preview
```

When it finishes (usually 5–15 minutes, longer on the free tier's queue) the CLI
prints a download link. Open it on the phone and install. Android will warn
about installing outside the Play Store — that is expected for a `.apk`.

The build profiles are in [`eas.json`](./eas.json):

| Profile | Output | Talks to |
|---|---|---|
| `preview` | `.apk` | the deployed API on Render — **use this one** |
| `preview-lan` | `.apk` | a backend on your own machine, over Wi-Fi |
| `development` | `.apk` + dev client | `10.0.2.2:4000` (Android emulator) |
| `production` | `.aab` (Play Store) | the deployed API |

`preview` is the one to send people. There is no offline mode: the mock was
removed when the API was finished, so **the APK needs a reachable backend**.
That is what makes `preview` the right default — it points at the deployed
service, so it works on any phone, on any network, without your laptop being
switched on.

Two things worth knowing before you share the link:

**Render's free tier sleeps** after 15 minutes of no traffic, and the next
request waits about 50 seconds while it wakes. The first person to open the app
after a quiet night will think it is broken. Open the API URL in a browser a
minute before a demo.

**The API address is baked into the APK** at build time. Moving the backend to a
different host means a new build — the installed app cannot be repointed.

---

## 3. Local build — no Expo account

Needs Android Studio, the Android SDK and JDK 17 installed.

```bash
npx expo run:android
```

This compiles a debug build and installs it on the connected device or running
emulator. The resulting `.apk` is at
`android/app/build/outputs/apk/debug/app-debug.apk`.

> Running this generates a native `android/` folder. It is git-ignored on
> purpose — once it exists, `app.json` stops being the single source of truth
> for native config. Delete it with `rm -rf android` to go back to the managed
> workflow.

---

## Connecting to the backend from a phone

This is the part that trips people up. `localhost` on your phone means *the
phone*, not your computer — so a backend on your laptop is unreachable at
`http://localhost:4000`.

Create `.env.local` in the project root (it is git-ignored):

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:4000/api/v1
```

Use your computer's **LAN IP**, not `localhost`:

| Target | Value |
|---|---|
| Physical phone (Expo Go or APK) | `http://<your-LAN-IP>:4000/api/v1` |
| Android emulator | `http://10.0.2.2:4000/api/v1` |
| iOS simulator | `http://localhost:4000/api/v1` |
| Web on the same machine | `http://localhost:4000/api/v1` |

Find your LAN IP:

```bash
ipconfig
```

Look for "IPv4 Address" under your Wi-Fi adapter — something like `192.168.1.42`.

Then restart Metro so the new environment variables are baked into the bundle:

```bash
npx expo start --clear
```

Three more things that commonly go wrong:

- **The backend must listen on `0.0.0.0`, not `127.0.0.1`.** Otherwise it only
  accepts connections from the computer itself. In Express:
  `app.listen(4000, '0.0.0.0')`.
- **Windows Firewall** will silently block the port the first time. Allow Node.js
  on private networks when prompted, or add an inbound rule for port 4000.
- **Android blocks plaintext HTTP by default** on API 28+. Expo's default
  `usesCleartextTraffic` allows it in development builds; if you build a
  `production` profile against an `http://` URL it will fail. Use `https://` for
  anything you deploy.

For an APK built with `preview-live`, the URL is baked in at build time from
`eas.json` — `.env.local` is not read by a cloud build. Either edit `eas.json`
before building, or deploy the backend somewhere with a stable URL.

---

## Verifying which API the app is talking to

Open **Tənzimləmələr → Haqqında**. The "API rejimi" row reads either
*Demo (mock) məlumat* or *Canlı backend*. If you set `.env.local` and it still
says demo, Metro cached the old bundle — restart with `--clear`.

---

## Sharing a build with other people

### Android — a real installable APK

```bash
eas build --platform android --profile preview
```

The CLI prints a URL when it finishes. Anyone can open that URL on an Android
phone and install from it; Android warns about installing outside the Play
Store, which is expected for a `.apk`.

The link stays valid for 30 days on the free plan. `eas build:list` reprints it,
and the same builds are on your Expo dashboard.

The `preview` profile already points at the deployed API, so the APK works on
any phone, on any network, with your computer switched off.

### Keeping it working — the one thing that will bite you

Render's free tier stops the container after 15 minutes with no traffic, and
the next request waits ~50 seconds for a cold start. Someone opening the app for
the first time will see it hang and conclude it is broken.

Two ways to avoid that:

**Free.** Ping the health endpoint on a schedule. Sign up at
[cron-job.org](https://cron-job.org), create a job hitting

```
https://holbertonfinalproject-backend.onrender.com/health
```

every 10 minutes. That is enough to keep the container awake. It burns free
instance-hours — 750/month, and continuous pinging uses roughly all of them, so
one always-on service is the practical limit.

**$7/month.** Render's Starter plan does not sleep. If this is being marked or
demoed on someone else's schedule, it is the more reliable answer.

### iOS — harder, and mostly not free

Apple does not allow installing an app from a link. There are three routes:

**TestFlight** — the real one. Needs an Apple Developer account at **$99/year**.

```bash
eas build --platform ios --profile preview
```

```bash
eas submit --platform ios
```

Testers install TestFlight from the App Store and accept an invite. Up to 100
internal testers, and builds expire after 90 days.

**Expo Go** — free, but the tester needs Expo Go installed.

```bash
eas update --branch preview
```

They open Expo Go and scan the QR code. This runs your JavaScript inside Expo
Go rather than as a standalone app, so anything requiring a custom native module
will not work — for this project that is fine.

**The web build — free, and closest to "an app" without paying.**

The site is already configured as a progressive web app (`display: standalone`
in `app.json`), so on an iPhone:

1. Open the Netlify URL in **Safari** (not Chrome — only Safari can do this)
2. Share button → **Add to Home Screen**

It gets an icon on the home screen, opens without browser chrome, and behaves
like an installed app. No developer account, no review, no expiry.

For a student project being shown to a marker, this is usually the right answer
for iPhone users and the APK for Android ones.

### What is baked in at build time

`EXPO_PUBLIC_*` values are inlined into the bundle, so the API address and the
Google client id are fixed when the build runs. Moving the backend to a
different host means a new build — an installed APK cannot be repointed.

`eas update` can push new **JavaScript** to an existing build on the same
channel, which covers screen and logic changes without redistributing the file.
It cannot change native configuration or those inlined environment values.
