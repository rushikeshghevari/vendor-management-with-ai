/**
 * FCM push notification lifecycle hook.
 *
 * Responsibilities:
 *  1. Request Android 13+ / iOS notification permissions
 *  2. Create 5 Android notification channels
 *  3. Register Notification Action Categories (Approve/Reject/Open, Confirm/Open)
 *  4. Get native FCM device token → register with backend
 *  5. Register background task for silent (data-only) pushes
 *  6. Handle killed-app launch via getLastNotificationResponseAsync
 *  7. Foreground + background notification responses (deep link routing + badge management)
 *  8. Token refresh auto re-registration
 *
 * Mount once inside AuthenticatedNavigator (inside NavigationContainer).
 *
 * Device unregistration on logout deliberately does NOT live here: RootNavigator unmounts
 * AuthenticatedNavigator (and this hook) in the same render pass that flips isAuthenticated
 * to false, so an effect keyed on isAuthenticated never gets a chance to run its "now
 * logged out" branch — it's dead code that looks like it works. See authApi.ts's logout
 * mutation, which unregisters the device explicitly before clearing tokens instead.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { Subscription } from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  useRecordNotificationDeliveryMutation,
  useRegisterDeviceMutation,
} from '@/features/notifications/api/notificationsApi';
import {
  registerBackgroundNotificationTask,
} from '@/features/notifications/services/backgroundNotificationTask';
import {
  resolveDeepLinkTarget,
  getNotificationData,
  DEFAULT_ACTION_IDENTIFIER,
  resolveInAppTarget,
} from '@/features/notifications/services/notificationDeepLink';
import { getDeviceId } from '@/features/notifications/utils/deviceId';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAuth } from '@/hooks/useAuth';
import { baseApi } from '@/store/baseApi';
import type { RootStackParamList } from '@/navigation/types';

/** Modules whose RTK Query cache should refresh the instant a push arrives in the foreground —
 *  e.g. so a Director's bill list updates the moment a bill finishes AI verification, without
 *  waiting for the next poll tick or requiring the screen to be reopened. No websocket layer
 *  exists in this app (see AGENTS.md/architecture) — push notifications are already the
 *  real-time channel, this just closes the "arrived but nothing refetched" gap. */
const CACHE_INVALIDATION_TAGS: Record<string, { type: 'Bill' | 'Quotation' | 'PurchaseOrder' | 'Payment'; id: string }[]> = {
  // Every Bill-lifecycle notification (submitted, AI verified, Director approved/rejected,
  // Accounts verified) is dispatched with `module: 'bill'`, including the "ready for payment"
  // one Accounts' decide() sends to Payment Department users — so the Payment tags belong here
  // too, not only under the (separately-used) 'payment' module below.
  bill: [
    { type: 'Bill', id: 'LIST' },
    { type: 'Bill', id: 'DIRECTOR_STATS' },
    { type: 'Bill', id: 'ACCOUNTS_STATS' },
    { type: 'Bill', id: 'PAYMENT_STATS' },
    { type: 'Payment', id: 'PAYMENT_DEPT_STATS' },
    { type: 'Payment', id: 'ACCOUNTS_STATS' },
  ],
  quotation: [
    { type: 'Quotation', id: 'LIST' },
    { type: 'Quotation', id: 'DIRECTOR_STATS' },
    { type: 'Quotation', id: 'CEO_STATS' },
  ],
  purchase_order: [{ type: 'PurchaseOrder', id: 'LIST' }],
  payment: [
    { type: 'Payment', id: 'PAYMENT_DEPT_STATS' },
    { type: 'Payment', id: 'ACCOUNTS_STATS' },
  ],
};

// Global handler: show alert banner when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ── Channel definitions ───────────────────────────────────────────────────────

async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('vms_default', {
    name: 'VMS General',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('vms_approvals', {
    name: 'VMS Approvals',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#D97706',
    enableVibrate: true,
    showBadge: true,
    description: 'Quotation and bill approval requests',
  });

  await Notifications.setNotificationChannelAsync('vms_critical', {
    name: 'VMS Critical Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    lightColor: '#DC2626',
    enableVibrate: true,
    showBadge: true,
    bypassDnd: true,
    description: 'Critical system alerts that bypass Do Not Disturb',
  });

  await Notifications.setNotificationChannelAsync('vms_payments', {
    name: 'VMS Payments',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 150, 300],
    lightColor: '#16A34A',
    enableVibrate: true,
    showBadge: true,
    description: 'Payment status updates',
  });

  await Notifications.setNotificationChannelAsync('vms_silent', {
    name: 'VMS Silent Updates',
    importance: Notifications.AndroidImportance.MIN,
    enableVibrate: false,
    showBadge: false,
    description: 'Silent background sync notifications',
  });
}

// ── Action categories ─────────────────────────────────────────────────────────

async function registerNotificationCategories(): Promise<void> {
  // Approval action buttons (Quotation / Bill)
  await Notifications.setNotificationCategoryAsync('vms_approval_action', [
    {
      identifier: 'approve',
      buttonTitle: 'Approve',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'reject',
      buttonTitle: 'Reject',
      options: { opensAppToForeground: true, isDestructive: true },
    },
    {
      identifier: 'open',
      buttonTitle: 'View Details',
      options: { opensAppToForeground: true },
    },
  ]);

  // Payment action buttons
  await Notifications.setNotificationCategoryAsync('vms_payment_action', [
    {
      identifier: 'open',
      buttonTitle: 'View Payment',
      options: { opensAppToForeground: true },
    },
  ]);

  // Generic info action
  await Notifications.setNotificationCategoryAsync('vms_info_action', [
    {
      identifier: 'open',
      buttonTitle: 'Open',
      options: { opensAppToForeground: true },
    },
  ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDeviceName(): string {
  return Device.deviceName ?? Device.modelName ?? 'Unknown Device';
}

function getPlatform(): 'android' | 'ios' | 'web' {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'web';
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const { isAuthenticated, user } = useAuth();
  const dispatch = useAppDispatch();
  const [registerDevice] = useRegisterDeviceMutation();
  const [recordDelivery] = useRecordNotificationDeliveryMutation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const notificationListener = useRef<Subscription | null>(null);
  const responseListener     = useRef<Subscription | null>(null);
  const registeredTokenRef   = useRef<string | null>(null);
  const deviceIdRef          = useRef<string>(getDeviceId());

  /** Navigate to the resource the notification refers to */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = getNotificationData(response);
      const target = resolveDeepLinkTarget(data);
      if (!target) return;

      // A tap always means the user has now seen this notification — mark it read/delivered
      // so the bell badge reflects it immediately, instead of only after separately opening it
      // from the in-app Notification list.
      if (data.notificationId) recordDelivery(data.notificationId).catch(() => null);

      if (target.rootScreen === 'QuotationApproval') {
        // Director/CEO approval notifications bypass the notification list entirely and open
        // the dedicated approval screen in one tap.
        navigation.navigate('QuotationApproval', {
          quotationId: target.params.quotationId ?? '',
          notificationId: target.params.notificationId,
        });
        return;
      }

      if (target.rootScreen === 'BillFinancialApproval') {
        // Director Financial Approval notifications open the dedicated approval screen directly.
        navigation.navigate('BillFinancialApproval', {
          billId: target.params.billId ?? '',
          notificationId: target.params.notificationId,
        });
        return;
      }

      // Try routing directly to Details screen based on module, referenceId, and user's role
      const mod = data.module;
      const refId = data.referenceId;
      const role = user?.role;

      if (mod && refId && role) {
        const inAppTarget = resolveInAppTarget(mod, refId, role, data.notificationType);
        if (inAppTarget) {
          if (inAppTarget.tab === null) {
            (navigation as any).navigate(inAppTarget.screen, inAppTarget.params);
          } else {
            (navigation as any).navigate('Main', {
              screen: inAppTarget.tab,
              params: {
                screen: inAppTarget.screen,
                params: inAppTarget.params,
              },
            });
          }
          return;
        }
      }

      // Fallback: open Notification Center
      navigation.navigate('NotificationCenter', { screen: 'NotificationList', params: undefined });
    },
    [navigation, user],
  );

  const requestPermissionsAndRegister = useCallback(async () => {
    if (!Device.isDevice) {
      console.info('[push] Skipping FCM registration — not a physical device');
      return;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.info('[push] Push notification permission not granted');
      return;
    }

    // Create channels and action categories
    await createNotificationChannels().catch(() => null);
    await registerNotificationCategories().catch(() => null);

    // Register background task for silent (data-only) pushes
    await registerBackgroundNotificationTask().catch(() => null);

    // Get native FCM token
    let token: string | undefined;
    try {
      const result = await Notifications.getDevicePushTokenAsync();
      token = result.data as string;
    } catch (err) {
      console.warn('[push] getDevicePushTokenAsync failed — FCM push will not work on this device:', err);
      return;
    }

    if (!token) return;
    registeredTokenRef.current = token;

    await registerDevice({
      token,
      deviceId:   deviceIdRef.current,
      platform:   getPlatform(),
      deviceName: getDeviceName(),
    }).unwrap().catch((err) =>
      console.error('[push] registerDevice failed:', err),
    );
  }, [registerDevice]);

  // Register on auth state change (unregistration happens in authApi.ts's logout
  // mutation instead — see the hook's docstring for why it can't live here).
  useEffect(() => {
    if (isAuthenticated) {
      requestPermissionsAndRegister();
    }
  }, [isAuthenticated, requestPermissionsAndRegister]);

  // Killed-app launch: check for the notification that opened the app
  useEffect(() => {
    if (!isAuthenticated) return;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    }).catch(() => null);
  }, [isAuthenticated, handleNotificationResponse]);

  // Foreground notification received
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.info('[push] Foreground notification:', notification.request.content.title);
      // Badge is managed by shouldSetBadge: true in the global handler

      // Instant cache refresh — e.g. a Director's Bill list picks up a just-AI-verified bill
      // immediately, without waiting for the next poll tick or the screen being reopened.
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      const mod = typeof data?.module === 'string' ? data.module : undefined;
      const tags = mod ? CACHE_INVALIDATION_TAGS[mod] : undefined;
      if (tags) dispatch(baseApi.util.invalidateTags(tags));

      // Every push implies a new (unread) Notification row exists, regardless of module — the
      // bell badge previously only picked this up on its next 60s poll tick.
      dispatch(baseApi.util.invalidateTags([{ type: 'Notification', id: 'UNREAD_COUNT' }, { type: 'Notification', id: 'LIST' }]));
    });

    // User tapped a notification or an action button
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier;
      if (actionId === DEFAULT_ACTION_IDENTIFIER || actionId === 'open') {
        handleNotificationResponse(response);
      } else if (actionId === 'approve' || actionId === 'reject') {
        // For approval action buttons: navigate to the detail screen
        // where the user can confirm the action in-app
        handleNotificationResponse(response);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [handleNotificationResponse, dispatch]);

  // Token refresh — FCM rotates tokens; re-register automatically.
  // Guard: skip if the incoming token equals the one already registered this session.
  // Without this check, getDevicePushTokenAsync() (Path A) and addPushTokenListener
  // (Path B) both fire on first launch with the same token, producing a duplicate POST.
  useEffect(() => {
    const sub = Notifications.addPushTokenListener((pushToken) => {
      if (!isAuthenticated || !pushToken.data) return;
      const newToken = pushToken.data as string;
      if (newToken === registeredTokenRef.current) return;
      registeredTokenRef.current = newToken;
      registerDevice({
        token:      newToken,
        deviceId:   deviceIdRef.current,
        platform:   getPlatform(),
        deviceName: getDeviceName(),
      }).catch((err) => console.error('[push] Token refresh registration failed:', err));
    });
    return () => sub.remove();
  }, [isAuthenticated, registerDevice]);
}
