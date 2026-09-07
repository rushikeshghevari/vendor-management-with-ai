import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS: 'vms_access_token',
  REFRESH: 'vms_refresh_token',
} as const;

// AsyncStorage fallback keys — different prefix so they never collide with SecureStore entries.
const AS_KEYS = {
  ACCESS: 'vms_as_access_token',
  REFRESH: 'vms_as_refresh_token',
} as const;

/**
 * Reads a token — tries SecureStore first, falls back to AsyncStorage.
 * Android Keystore can be unavailable on certain devices/conditions; the
 * fallback ensures a stored token is always readable regardless.
 */
async function secureGet(key: string, asKey: string): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(key);
    if (val !== null) return val;
  } catch (err) {
    console.warn('[secureStorage] SecureStore.getItemAsync failed, trying AsyncStorage:', err);
  }
  return AsyncStorage.getItem(asKey);
}

/**
 * Writes a token — tries SecureStore first, falls back to AsyncStorage.
 * Never throws: callers (especially authApi.onQueryStarted) must not have
 * token storage silently block the authentication flow.
 */
async function secureSet(key: string, asKey: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
    // Clean up any stale AsyncStorage fallback value for this key.
    await AsyncStorage.removeItem(asKey).catch(() => undefined);
    return;
  } catch (err) {
    console.warn('[secureStorage] SecureStore.setItemAsync failed, falling back to AsyncStorage:', err);
  }
  await AsyncStorage.setItem(asKey, value);
}

/**
 * Deletes a token from both stores.
 * Uses Promise.allSettled so a missing key in either store does not throw.
 */
async function secureDelete(key: string, asKey: string): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(key),
    AsyncStorage.removeItem(asKey),
  ]);
}

export const secureStorage = {
  getAccessToken(): Promise<string | null> {
    return secureGet(KEYS.ACCESS, AS_KEYS.ACCESS);
  },
  getRefreshToken(): Promise<string | null> {
    return secureGet(KEYS.REFRESH, AS_KEYS.REFRESH);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      secureSet(KEYS.ACCESS, AS_KEYS.ACCESS, accessToken),
      secureSet(KEYS.REFRESH, AS_KEYS.REFRESH, refreshToken),
    ]);
  },
  async clearTokens(): Promise<void> {
    await Promise.all([
      secureDelete(KEYS.ACCESS, AS_KEYS.ACCESS),
      secureDelete(KEYS.REFRESH, AS_KEYS.REFRESH),
    ]);
  },
};
