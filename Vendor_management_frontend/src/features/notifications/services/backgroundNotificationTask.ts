/**
 * Background Task for silent (data-only) push notifications.
 *
 * Silent FCM messages arrive even when the app is in the background or killed.
 * This task is triggered by expo-task-manager when such a message is received.
 * It can be used to sync unread count, pre-cache data, etc.
 *
 * NOTE: This file must be imported at the root of the app BEFORE any navigation
 * renders, so the task is defined before it's triggered. It's imported by
 * usePushNotifications which is called inside AuthenticatedNavigator.
 */

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_NOTIFICATION_TASK = 'vms-background-notification';

// Define the task — must be at module level (not inside a component or function)
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[bg-task] Background notification error:', error);
    return;
  }
  // data.notification contains the Notification object from expo-notifications — on Android,
  // a data-only FCM message can reach this task without the full `.request` wrapper populated,
  // so this must not assume that shape.
  const { notification } = (data ?? {}) as { notification?: Notifications.Notification };
  const { module: mod, notificationType } = (notification?.request?.content?.data ?? {}) as Record<string, string>;
  console.info(`[bg-task] Silent notification received: ${mod}/${notificationType}`);
});

/**
 * Register the background task so the system calls it on silent push.
 * Safe to call multiple times (expo-task-manager deduplicates).
 */
export async function registerBackgroundNotificationTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (!isRegistered) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.info('[bg-task] Background notification task registered');
    }
  } catch (err) {
    console.warn('[bg-task] Failed to register background notification task:', err);
  }
}

export async function unregisterBackgroundNotificationTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) {
      await Notifications.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    }
  } catch {
    // best-effort
  }
}
