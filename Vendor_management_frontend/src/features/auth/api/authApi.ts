import { Alert } from 'react-native';

import { notificationsApi } from '@/features/notifications/api/notificationsApi';
import { getDeviceId } from '@/features/notifications/utils/deviceId';
import { baseApi } from '@/store/baseApi';
import { secureStorage } from '@/utils/secureStorage';
import { setCredentials, loggedOut } from '@/features/auth/authSlice';
import type { LoginRequest, LoginResponse, User } from '@/types/auth';

export const authApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        data: credentials,
      }),
      onQueryStarted: async (_arg, { queryFulfilled, dispatch, getState }) => {
        try {
          const { data } = await queryFulfilled;

          // Token storage is best-effort — a SecureStore failure (Android Keystore
          // unavailability, first-boot timing, etc.) must never block the user from
          // reaching the dashboard. secureStorage already falls back to AsyncStorage
          // internally, so this catch only fires if both stores fail.
          try {
            await secureStorage.setTokens(data.accessToken, data.refreshToken);
          } catch (storageErr) {
            const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
            console.error('[authApi] token storage failed — session will not persist across restarts:', msg);
            Alert.alert(
              'Session Warning',
              'Your session could not be saved. You will need to log in again when the app restarts.',
            );
          }

          // Read the previously authenticated user ID before overwriting credentials.
          const prevUserId = (getState() as unknown as { auth: { user: User | null } }).auth.user?.id;

          // Always dispatch credentials after a successful HTTP 200, regardless of
          // whether token storage succeeded — isAuthenticated drives navigation.
          dispatch(setCredentials(data.user));

          // Wipe the RTK Query cache only when a *different* user logs in on this device.
          // A different user's role-scoped data (e.g. Super Admin seeing all Vendors)
          // must never be visible to the next user, even briefly.
          // Same-user re-login keeps the cache warm: the dashboard then serves cached
          // data immediately instead of firing 10+ simultaneous requests, which was the
          // primary cause of HTTP 429 errors during development.
          if (!prevUserId || prevUserId !== data.user.id) {
            dispatch(baseApi.util.resetApiState());
          }
        } catch (err) {
          // Invalid credentials / validation error — surfaced via the mutation's
          // `error` state in the component; nothing to clean up here.
          console.error('[authApi] login failed:', JSON.stringify(err));
        }
      },
      invalidatesTags: ['Auth', 'User'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      onQueryStarted: async (_arg, { queryFulfilled, dispatch }) => {
        // Unregister this device's push token FIRST, while the access token is still valid.
        // This can't be left to usePushNotifications' isAuthenticated effect — RootNavigator
        // unmounts that hook in the same render pass that flips isAuthenticated to false, so
        // it never gets to run its "now logged out" branch. Without this, a logged-out phone
        // kept receiving pushes indefinitely because its fcmTokens entry was never removed.
        await dispatch(notificationsApi.endpoints.removeDevice.initiate({ deviceId: getDeviceId() }))
          .unwrap()
          .catch(() => null);

        try {
          await queryFulfilled;
        } catch {
          // Server logout failed or is unreachable — still clear the local session below.
        } finally {
          await secureStorage.clearTokens();
          dispatch(loggedOut());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
    // Not consumed via its `useGetProfileQuery` hook anywhere (that's why an earlier pass
    // nearly removed this as "dead") — it's dispatched directly via
    // `authApi.endpoints.getProfile.initiate()` in useAuthBootstrap.ts to restore the session
    // from a stored token on app launch.
    getProfile: builder.query<User, void>({
      query: () => ({ url: '/auth/me', method: 'GET' }),
      providesTags: ['User'],
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useGetProfileQuery } = authApi;
