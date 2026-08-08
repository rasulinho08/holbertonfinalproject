/**
 * API configuration.
 *
 * The app talks to one place: the KitabDostu backend. There is no bundled mock
 * any more — the catalogue, the users and the social graph all live in the
 * database, and the backend is the only source of them.
 *
 * `EXPO_PUBLIC_API_BASE_URL` is therefore required. It is read at bundle time,
 * not at runtime, so changing it means restarting Metro with `--clear`.
 */

const rawBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

/**
 * Fails loudly at import time rather than as a confusing network error on the
 * first screen. A missing base URL sends every request to a relative path,
 * which on web silently hits the Metro dev server and returns HTML.
 */
if (!API_BASE_URL) {
  const message =
    'EXPO_PUBLIC_API_BASE_URL is not set.\n\n' +
    'Copy .env.example to .env.local and point it at the backend:\n' +
    '  EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1\n\n' +
    'On a phone use your computer\'s LAN IP, not localhost — see MOBILE.md.\n' +
    'Then restart Metro with: npx expo start --clear';

  if (__DEV__) {
    console.error(message);
  } else {
    throw new Error(message);
  }
}

/** Requests give up after this long so a dead backend cannot hang a screen. */
export const REQUEST_TIMEOUT_MS = 15_000;

export const DEFAULT_PAGE_SIZE = 20;

export const API_VERSION = 'v1';
