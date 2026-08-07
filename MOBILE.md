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

| Profile | Output | API |
|---|---|---|
| `preview` | `.apk` | bundled mock data — works offline, no backend needed |
| `preview-live` | `.apk` | your deployed backend — edit the URL in `eas.json` first |
| `production` | `.aab` (for Play Store) | your deployed backend |

Start with `preview`. It contains the full 1000-book catalogue and every screen
works without a server, which is what you want for a demo.

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
EXPO_PUBLIC_USE_MOCK_API=false
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
