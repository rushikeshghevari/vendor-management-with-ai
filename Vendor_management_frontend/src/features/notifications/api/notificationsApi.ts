import { baseApi } from '@/store/baseApi';
import type {
  DeviceInfo,
  Notification,
  NotificationAnalytics,
  NotificationCategory,
  NotificationModule,
  NotificationPriority,
  NotificationType,
} from '@/features/notifications/types';

interface RawNotification {
  _id: string;
  title: string;
  message: string;
  module: NotificationModule;
  relatedRecord: string;
  notificationType: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  isRead: boolean;
  isArchived: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;
  clickedAt?: string;
}

function toNotification(raw: RawNotification): Notification {
  return {
    id:             raw._id,
    title:          raw.title,
    message:        raw.message,
    module:         raw.module,
    relatedRecordId: raw.relatedRecord,
    notificationType: raw.notificationType,
    priority:       raw.priority ?? 'medium',
    category:       raw.category ?? 'information',
    isRead:         raw.isRead,
    isArchived:     raw.isArchived ?? false,
    isPinned:       raw.isPinned ?? false,
    isDeleted:      raw.isDeleted ?? false,
    createdAt:      raw.createdAt,
    clickedAt:      raw.clickedAt,
  };
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  module?: NotificationModule;
  isRead?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  priority?: NotificationPriority;
  search?: string;
  since?: string;
}

interface BroadcastInput {
  title: string;
  message: string;
  targetRoles?: string[];
  targetUserIds?: string[];
}

export const notificationsApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    // Infinite-scroll pagination: the cache key deliberately excludes `page` (via
    // serializeQueryArgs) so every page for the same filter set accumulates into one
    // cached list instead of each page overwriting the last. Screens drive this by calling
    // the query again with an incremented `page` once the previous page has loaded.
    getNotifications: builder.query<Notification[], NotificationListQuery | void>({
      query: (params) => ({ url: '/notifications', method: 'GET', params: { limit: 20, ...params } }),
      transformResponse: (raw: RawNotification[]) => raw.map(toNotification),
      serializeQueryArgs: ({ queryArgs }) => {
        const { page: _page, ...filters } = queryArgs ?? {};
        return filters;
      },
      merge: (cache, newItems, { arg }) => {
        if (!arg || !arg.page || arg.page <= 1) {
          cache.splice(0, cache.length, ...newItems);
          return;
        }
        cache.push(...newItems);
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.page !== previousArg?.page,
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: 'Notification' as const, id: item.id })),
        { type: 'Notification' as const, id: 'LIST' },
      ],
    }),

    getUnreadNotificationCount: builder.query<number, void>({
      query: () => ({ url: '/notifications/unread-count', method: 'GET' }),
      transformResponse: (raw: { count: number }) => raw.count,
      providesTags: [{ type: 'Notification', id: 'UNREAD_COUNT' }],
    }),

    getNotificationAnalytics: builder.query<NotificationAnalytics, void>({
      query: () => ({ url: '/notifications/analytics', method: 'GET' }),
      providesTags: [{ type: 'Notification', id: 'ANALYTICS' }],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    archiveNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/archive`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    pinNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/pin`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    unpinNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/unpin`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    deleteAllNotifications: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/all', method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    broadcastNotification: builder.mutation<{ sent: number }, BroadcastInput>({
      query: (body) => ({ url: '/notifications/broadcast', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Notification', id: 'ANALYTICS' }],
    }),

    // ── Device token management ──────────────────────────────────────────────

    registerDevice: builder.mutation<void, {
      token: string;
      deviceId: string;
      platform: 'android' | 'ios' | 'web';
      deviceName?: string;
    }>({
      query: (body) => ({ url: '/users/me/register-device', method: 'POST', data: body }),
    }),

    removeDevice: builder.mutation<void, { deviceId: string }>({
      query: (body) => ({ url: '/users/me/remove-device', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Notification', id: 'DEVICES' }],
    }),

    getMyDevices: builder.query<DeviceInfo[], void>({
      query: () => ({ url: '/users/me/devices', method: 'GET' }),
      providesTags: [{ type: 'Notification', id: 'DEVICES' }],
    }),

    /** Called when user opens a notification from the system tray — marks as delivered+read. */
    recordNotificationDelivery: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/delivered`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery: useGetUnreadNotificationCountQueryBase,
  useGetNotificationAnalyticsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useArchiveNotificationMutation,
  usePinNotificationMutation,
  useUnpinNotificationMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useBroadcastNotificationMutation,
  useRegisterDeviceMutation,
  useRemoveDeviceMutation,
  useGetMyDevicesQuery,
  useRecordNotificationDeliveryMutation,
} = notificationsApi;

// Polled as a fallback for when FCM is unavailable. FCM keeps the badge accurate in
// real-time via tag invalidation (markNotificationRead / recordNotificationDelivery).
// 60s interval halves the polling load vs the previous 30s: 15 req/15min instead of 30.
export function useGetUnreadNotificationCountQuery() {
  return useGetUnreadNotificationCountQueryBase(undefined, { pollingInterval: 60000 });
}
