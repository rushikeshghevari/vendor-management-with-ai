import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import { authEvents } from '@/utils/authEvents';
import { secureStorage } from '@/utils/secureStorage';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeout,
  headers: { 'Content-Type': 'application/json' },
});

// Separate instance for the token refresh call so it never recurses into
// the interceptor below (which would attempt to refresh on its own 401).
const refreshClient = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeout,
});

apiClient.interceptors.request.use(async (config) => {
  const accessToken = await secureStorage.getAccessToken();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const fullUrl = (config.baseURL ?? '') + (config.url ?? '');
  console.log(`[http] → ${config.method?.toUpperCase()} ${fullUrl}`);
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

/** Reads the `exp` claim out of a JWT without verifying it — for diagnostic logging only. */
function decodeExpiry(token: string): string {
  try {
    const segment = token.split('.')[1] ?? '';
    const payload = JSON.parse(atob(segment));
    return typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : 'no exp claim';
  } catch {
    return 'undecodable';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await secureStorage.getRefreshToken();

  if (!refreshToken) {
    console.warn('[auth-refresh] no refresh token in secure storage — cannot refresh');
    return null;
  }

  console.log(`[auth-refresh] attempting refresh, refresh token expires at ${decodeExpiry(refreshToken)}`);

  try {
    // Every backend response is wrapped as { success, message, data } (see
    // backend/src/utils/ApiResponse.ts) — unwrap it, same as axiosBaseQuery does for
    // every other endpoint. This was previously read one level too shallow, so the new
    // tokens were always undefined and every refresh silently failed.
    const { data: envelope } = await refreshClient.post<{
      data: { accessToken: string; refreshToken: string };
    }>('/auth/refresh', { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = envelope.data;
    await secureStorage.setTokens(accessToken, newRefreshToken);
    console.log(
      `[auth-refresh] success — new access token expires at ${decodeExpiry(accessToken)}, ` +
        `new refresh token expires at ${decodeExpiry(newRefreshToken)}`,
    );
    return accessToken;
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    const message = axios.isAxiosError(err) ? err.response?.data : (err as Error).message;
    console.warn(`[auth-refresh] failed — backend responded ${status ?? 'no response'}:`, message);
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    // A 401 on the login route means wrong credentials, not an expired token —
    // skip the refresh cycle entirely and let the error surface to the component.
    const isAuthRoute = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried || isAuthRoute) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;
    console.log(`[auth-refresh] 401 on ${originalRequest.method?.toUpperCase()} ${originalRequest.url} — refreshing`);

    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      console.warn('[auth-refresh] refresh unavailable — clearing session and logging out');
      await secureStorage.clearTokens();
      authEvents.emit('unauthorized');
      return Promise.reject(error);
    }

    console.log(`[auth-refresh] retrying ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`);
    originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
    return apiClient(originalRequest);
  },
);
