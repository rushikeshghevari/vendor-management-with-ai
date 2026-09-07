import { Platform } from 'react-native';
import Constants from 'expo-constants';

type AppEnv = 'development' | 'staging' | 'production';

function isIpAddress(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function resolveApiUrl(rawUrl: string): string {
  if (!rawUrl || !__DEV__ || Platform.OS !== 'android') {
    return rawUrl;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const isLoopbackHost =
      parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';

    if (!isLoopbackHost) {
      return rawUrl;
    }

    const expoHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? '';

    // Keep localhost for USB + adb reverse and for tunnel sessions.
    if (!expoHost || expoHost.endsWith('.ngrok.io') || expoHost.endsWith('.exp.direct')) {
      return rawUrl;
    }

    if (isIpAddress(expoHost)) {
      parsedUrl.hostname = expoHost;
      return parsedUrl.toString();
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

// EXPO_PUBLIC_* vars are inlined by Metro at build time from .env.
// If the build ran without a .env (e.g. EAS without env secrets configured),
// the value is undefined and the app must not crash — it will show API errors
// instead, which is the correct UX for a misconfigured build.
export const env = {
  apiUrl: resolveApiUrl(process.env.EXPO_PUBLIC_API_URL ?? ''),
  apiTimeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT ?? 15000),
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnv,
} as const;

// Startup diagnostic: confirms the URL baked into this build at Metro bundle time.
console.log('[env] API URL:', env.apiUrl || '(empty — EXPO_PUBLIC_API_URL was not set at build time)');

export const isDevelopment = env.appEnv === 'development';
export const isProduction = env.appEnv === 'production';
