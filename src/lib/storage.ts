import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage wrappers used by the whole app.
 *
 * `storage`       — ordinary persistence (prefs, cached lists, offline queue).
 * `secureStorage` — auth tokens. Keychain/Keystore on device; SecureStore has
 *                   no web implementation, so the web target falls back to
 *                   AsyncStorage (localStorage under the hood). That is fine
 *                   for the browser demo but must not be relied on in a real
 *                   production web deployment.
 */

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable — non-fatal */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const canUseSecureStore = Platform.OS !== 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      if (canUseSecureStore) return await SecureStore.getItemAsync(key);
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (canUseSecureStore) await SecureStore.setItemAsync(key, value);
      else await AsyncStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (canUseSecureStore) await SecureStore.deleteItemAsync(key);
      else await AsyncStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/** Namespaced keys, collected here so nothing collides. */
export const StorageKeys = {
  prefs: 'kd.prefs',
  cart: 'kd.cart',
  accessToken: 'kd.auth.access',
  refreshToken: 'kd.auth.refresh',
  session: 'kd.auth.session',
  mockDb: 'kd.mock.db',
  offlineQueue: 'kd.offline.queue',
  queryCache: 'kd.query.cache',
  onboarded: 'kd.onboarded',
} as const;
