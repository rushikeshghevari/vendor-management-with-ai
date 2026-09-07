import { useState } from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import {
  useBroadcastNotificationMutation,
  useDeleteAllNotificationsMutation,
  useGetMyDevicesQuery,
  useGetNotificationAnalyticsQuery,
  useRemoveDeviceMutation,
} from '@/features/notifications/api/notificationsApi';
import type { NotificationsStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/constants/roles';
import { getErrorMessage } from '@/utils/getErrorMessage';

type Props = NativeStackScreenProps<NotificationsStackParamList, 'NotificationSettings'>;

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mt-5 px-4 pb-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted dark:text-slate-400">
      {title}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="mx-4 rounded-2xl border border-slate-100 bg-white py-1 dark:border-slate-800 dark:bg-slate-900"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}
    >
      {children}
    </View>
  );
}

function SettingRow({
  label, description, icon, value, onToggle,
}: {
  label: string; description: string; icon: keyof typeof Ionicons.glyphMap;
  value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 dark:border-slate-800/60">
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
        <Ionicons name={icon} size={18} color="#2563EB" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink dark:text-white">{label}</Text>
        <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">{description}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: '#2563EB' }} />
    </View>
  );
}

function AnalyticRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-slate-50 px-4 py-2.5 last:border-b-0 dark:border-slate-800/60">
      <Text className="text-xs text-ink-muted dark:text-slate-400">{label}</Text>
      <Text className="text-xs font-bold text-ink dark:text-white">{value}</Text>
    </View>
  );
}

export function NotificationSettingsScreen({ navigation }: Props) {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const { data: devices = [] } = useGetMyDevicesQuery();
  const { data: analytics } = useGetNotificationAnalyticsQuery(undefined, { skip: !isSuperAdmin });
  const [removeDevice] = useRemoveDeviceMutation();
  const [broadcast, { isLoading: isBroadcasting }] = useBroadcastNotificationMutation();
  const [deleteAll] = useDeleteAllNotificationsMutation();

  const handleRemoveDevice = (deviceId: string, deviceName: string) => {
    Alert.alert('Remove Device', `Remove notifications for "${deviceName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeDevice({ deviceId }).catch(() => null) },
    ]);
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Error', 'Title and message are required');
      return;
    }
    try {
      const result = await broadcast({ title: broadcastTitle.trim(), message: broadcastMessage.trim() }).unwrap();
      Alert.alert('Broadcast Sent', `Sent to ${result.sent} users`);
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (error) {
      Alert.alert('Could Not Send Broadcast', getErrorMessage(error));
    }
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Notifications', 'Delete all your notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => deleteAll().catch(() => null) },
    ]);
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Notification Settings" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView className="flex-1 bg-surface-muted dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 40 }}>

        <SectionHeader title="Preferences" />
        <Card>
          <SettingRow label="Push Notifications" description="Receive push alerts on this device" icon="notifications-outline" value={pushEnabled} onToggle={setPushEnabled} />
          <SettingRow label="Sound" description="Play sound for notifications" icon="volume-medium-outline" value={soundEnabled} onToggle={setSoundEnabled} />
          <SettingRow label="Vibration" description="Vibrate on notification" icon="phone-portrait-outline" value={vibrationEnabled} onToggle={setVibrationEnabled} />
        </Card>

        <SectionHeader title={`Registered Devices (${devices.length})`} />
        <Card>
          {devices.length === 0 ? (
            <Text className="p-4 text-center text-xs text-ink-muted dark:text-slate-400">No devices registered</Text>
          ) : (
            devices.map((device, idx) => (
              <View key={idx} className="flex-row items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 dark:border-slate-800/60">
                <Ionicons
                  name={device.platform === 'ios' ? 'logo-apple' : device.platform === 'android' ? 'logo-android' : 'globe-outline'}
                  size={20}
                  color="#6B7280"
                />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-ink dark:text-white">{device.deviceName ?? device.deviceId}</Text>
                  <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">
                    {device.platform.toUpperCase()} · Last used {new Date(device.lastUsed).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDevice(device.deviceId, device.deviceName ?? device.deviceId)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        {isSuperAdmin && analytics ? (
          <>
            <SectionHeader title="Analytics" />
            <Card>
              <AnalyticRow label="Total Sent" value={analytics.total.toString()} />
              <AnalyticRow label="Delivered" value={analytics.delivered.toString()} />
              <AnalyticRow label="Read" value={analytics.read.toString()} />
              <AnalyticRow label="Unread" value={analytics.unread.toString()} />
              <AnalyticRow label="Read Rate" value={`${analytics.readPercentage}%`} />
            </Card>
          </>
        ) : null}

        {isSuperAdmin ? (
          <>
            <SectionHeader title="Broadcast to All Users" />
            <View className="mx-4">
              <TextField label="Title" placeholder="Announcement title..." value={broadcastTitle} onChangeText={setBroadcastTitle} />
              <TextField
                label="Message"
                placeholder="Write your announcement..."
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
                multiline
                numberOfLines={3}
                className="h-20"
                textAlignVertical="top"
              />
              <Button label={isBroadcasting ? 'Sending...' : 'Send Broadcast'} loading={isBroadcasting} onPress={handleBroadcast} className="mt-1" />
            </View>
          </>
        ) : null}

        <SectionHeader title="Danger Zone" />
        <Card>
          <TouchableOpacity className="flex-row items-center gap-2.5 p-4" onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text className="text-sm font-semibold text-red-600 dark:text-red-400">Clear All Notifications</Text>
          </TouchableOpacity>
        </Card>

      </ScrollView>
    </Screen>
  );
}
