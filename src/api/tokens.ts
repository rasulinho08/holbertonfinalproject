import { secureStorage, StorageKeys } from '@/lib/storage';

/**
 * Token vault, deliberately separate from the auth store.
 *
 * The HTTP client needs tokens, and the auth store needs the HTTP client — if
 * they imported each other the module graph would cycle. Both depend on this
 * leaf module instead.
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;
let loaded = false;

/** Called once at startup, before the first authenticated request. */
export async function loadTokens(): Promise<{ access: string | null; refresh: string | null }> {
  if (!loaded) {
    [accessToken, refreshToken] = await Promise.all([
      secureStorage.get(StorageKeys.accessToken),
      secureStorage.get(StorageKeys.refreshToken),
    ]);
    loaded = true;
  }
  return { access: accessToken, refresh: refreshToken };
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  loaded = true;
  await Promise.all([
    secureStorage.set(StorageKeys.accessToken, access),
    secureStorage.set(StorageKeys.refreshToken, refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    secureStorage.remove(StorageKeys.accessToken),
    secureStorage.remove(StorageKeys.refreshToken),
  ]);
}

/** Notified when a refresh fails, so the app can drop to the sign-in screen. */
type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export function emitSessionExpired(): void {
  sessionExpiredListeners.forEach((l) => l());
}
