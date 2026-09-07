import * as Device from 'expo-device';

/** Shared with authApi.ts's logout flow, which must unregister this device's push
 *  token using the same id usePushNotifications registered it under. */
export function getDeviceId(): string {
  return Device.osBuildFingerprint ?? Device.modelId ?? 'unknown-device';
}
