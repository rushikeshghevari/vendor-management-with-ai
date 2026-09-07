import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { CATEGORY_BG, CATEGORY_COLOR, TYPE_ICON, type Notification } from '@/features/notifications/types';
import { formatFullDate } from '@/features/notifications/utils/notificationHelpers';
import { resolveInAppTarget } from '@/features/notifications/services/notificationDeepLink';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  useArchiveNotificationMutation,
  useDeleteNotificationMutation,
  useMarkNotificationReadMutation,
  usePinNotificationMutation,
  useUnpinNotificationMutation,
} from '@/features/notifications/api/notificationsApi';

interface Props {
  notification: Notification | null;
  onDismiss: () => void;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-slate-50 py-2 dark:border-slate-800/60">
      <Text className="text-xs text-ink-muted dark:text-slate-400">{label}</Text>
      <Text className="text-xs font-medium capitalize text-ink dark:text-slate-200">{value}</Text>
    </View>
  );
}

function ActionButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 dark:border-slate-700"
    >
      <Ionicons name={icon} size={16} color="#475569" />
      <Text className="text-xs font-semibold text-ink dark:text-slate-200">{label}</Text>
    </Pressable>
  );
}

export const NotificationDetailsSheet = forwardRef<BottomSheetModal, Props>(function NotificationDetailsSheet(
  { notification, onDismiss },
  ref,
) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const snapPoints = useMemo(() => ['50%', '90%'], []);
  const sheetRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal, []);

  const [markRead] = useMarkNotificationReadMutation();
  const [archive] = useArchiveNotificationMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [pin] = usePinNotificationMutation();
  const [unpin] = useUnpinNotificationMutation();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
    [],
  );

  if (!notification) {
    return (
      <BottomSheetModal ref={sheetRef} snapPoints={snapPoints} backdropComponent={renderBackdrop} onDismiss={onDismiss}>
        <BottomSheetView style={{ flex: 1 }}>
          <View />
        </BottomSheetView>
      </BottomSheetModal>
    );
  }

  const color = CATEGORY_COLOR[notification.category] ?? '#2563EB';
  const bg = CATEGORY_BG[notification.category] ?? '#EFF6FF';
  const icon = TYPE_ICON[notification.notificationType] ?? 'notifications-outline';
  const target = user?.role ? resolveInAppTarget(notification.module, notification.relatedRecordId, user.role, notification.notificationType) : null;

  const handleOpenRelatedRecord = () => {
    if (!target) return;
    if (!notification.isRead) markRead(notification.id).catch(() => null);
    const nav = navigation as unknown as { navigate: (name: string, params?: object) => void };
    if (target.tab === null) {
      nav.navigate(target.screen, target.params);
    } else {
      nav.navigate('Main', { screen: target.tab, params: { screen: target.screen, params: target.params } });
    }
    sheetRef.current?.dismiss();
  };

  const handleDelete = () => {
    Alert.alert('Delete Notification', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteNotification(notification.id).catch((error) => Alert.alert('Could Not Delete', getErrorMessage(error)));
          sheetRef.current?.dismiss();
        },
      },
    ]);
  };

  return (
    <BottomSheetModal ref={sheetRef} snapPoints={snapPoints} backdropComponent={renderBackdrop} onDismiss={onDismiss}>
      <BottomSheetView className="flex-1 px-5 pb-8">
        <View className="items-center gap-3 py-4">
          <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: bg }}>
            <Ionicons name={icon} size={30} color={color} />
          </View>
          <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>
            {notification.notificationType.replace(/_/g, ' ')}
          </Text>
        </View>

        <Text className="text-lg font-bold text-ink dark:text-white">{notification.title}</Text>
        <Text className="mt-2 text-sm leading-6 text-ink-muted dark:text-slate-300">{notification.message}</Text>

        <View className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-800/40">
          <MetaRow label="Module" value={notification.module.replace(/_/g, ' ')} />
          <MetaRow label="Priority" value={notification.priority} />
          <MetaRow label="Status" value={notification.isRead ? 'Read' : 'Unread'} />
          <MetaRow label="Received" value={formatFullDate(notification.createdAt)} />
          {notification.clickedAt ? <MetaRow label="Opened" value={formatFullDate(notification.clickedAt)} /> : null}
        </View>

        {target ? (
          <Pressable
            onPress={handleOpenRelatedRecord}
            accessibilityRole="button"
            accessibilityLabel="Open related record"
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
            style={{ backgroundColor: color }}
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text className="text-sm font-bold text-white">Open Related Record</Text>
          </Pressable>
        ) : null}

        <View className="mt-3 flex-row gap-2">
          {!notification.isRead ? (
            <ActionButton icon="checkmark-circle-outline" label="Mark Read" onPress={() => markRead(notification.id).catch(() => null)} />
          ) : null}
          <ActionButton
            icon={notification.isPinned ? 'bookmark' : 'bookmark-outline'}
            label={notification.isPinned ? 'Unpin' : 'Pin'}
            onPress={() => (notification.isPinned ? unpin(notification.id) : pin(notification.id)).catch(() => null)}
          />
          <ActionButton icon="archive-outline" label="Archive" onPress={() => archive(notification.id).catch(() => null)} />
          <ActionButton icon="trash-outline" label="Delete" onPress={handleDelete} />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
