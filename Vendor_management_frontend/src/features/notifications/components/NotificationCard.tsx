import { memo, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

import { CATEGORY_COLOR, PRIORITY_COLOR, TYPE_ICON, type Notification } from '@/features/notifications/types';
import { formatTimeAgo } from '@/features/notifications/utils/notificationHelpers';

interface Props {
  notification: Notification;
  selected?: boolean;
  selectionMode?: boolean;
  onPress: (n: Notification) => void;
  onLongPress?: (n: Notification) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (n: Notification) => void;
  onTogglePin: (n: Notification) => void;
}

/** Fixed row height (matches the card's padding/content) so SectionList can use getItemLayout. */
export const NOTIFICATION_CARD_HEIGHT = 104;

function SwipeAction({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        backgroundColor: color,
        width: 80,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={{ marginTop: 4, fontSize: 10, fontWeight: '600', color: '#fff' }}>{label}</Text>
    </Pressable>
  );
}

function NotificationCardBase({
  notification: n,
  selected = false,
  selectionMode = false,
  onPress,
  onLongPress,
  onMarkRead,
  onDelete,
  onOpen,
  onTogglePin,
}: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const iconColor = CATEGORY_COLOR[n.category] ?? '#2563EB';
  const priorityColor = PRIORITY_COLOR[n.priority];
  const isUnread = !n.isRead;

  const close = () => swipeableRef.current?.close();

  const renderLeftActions = () => {
    return (
      <View style={{ width: 160, flexDirection: 'row', height: '100%' }}>
        <SwipeAction icon="checkmark-done-outline" label="Read" color="#16A34A" onPress={() => { onMarkRead(n.id); close(); }} />
        <SwipeAction icon="trash-outline" label="Delete" color="#DC2626" onPress={() => { onDelete(n.id); close(); }} />
      </View>
    );
  };

  const renderRightActions = () => {
    return (
      <View style={{ width: 160, flexDirection: 'row', height: '100%' }}>
        <SwipeAction icon="open-outline" label="Open" color="#2563EB" onPress={() => { onOpen(n); close(); }} />
        <SwipeAction icon={n.isPinned ? 'bookmark' : 'bookmark-outline'} label={n.isPinned ? 'Unpin' : 'Pin'} color="#D97706" onPress={() => { onTogglePin(n); close(); }} />
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      containerStyle={{
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => onPress(n)}
        onLongPress={() => onLongPress?.(n)}
        accessibilityRole="button"
        accessibilityLabel={n.title}
        style={({ pressed }) => ({
          opacity: pressed ? 0.85 : 1,
          height: NOTIFICATION_CARD_HEIGHT,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        })}
        className={`flex-row gap-3 border p-3.5 shadow-sm ${
          selected
            ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/30'
            : isUnread
            ? 'border-primary-100 bg-primary-50/60 dark:border-primary-900/50 dark:bg-primary-950/30'
            : 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        {selectionMode ? (
          <View className="items-center justify-center">
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selected ? '#2563EB' : '#CBD5E1'}
            />
          </View>
        ) : (
          <View
            className="h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${iconColor}18` }}
          >
            <Ionicons name={TYPE_ICON[n.notificationType] ?? 'notifications-outline'} size={20} color={iconColor} />
          </View>
        )}

        <View className="flex-1 justify-center">
          <View className="flex-row items-start justify-between gap-2">
            <Text
              numberOfLines={1}
              className={`flex-1 text-sm ${isUnread ? 'font-bold text-ink dark:text-white' : 'font-semibold text-ink dark:text-slate-100'}`}
            >
              {n.title}
            </Text>
            {n.isPinned ? <Ionicons name="bookmark" size={13} color="#D97706" /> : null}
            {isUnread ? <View className="mt-1 h-2 w-2 rounded-full bg-primary-600" /> : null}
          </View>

          <Text numberOfLines={2} className="mt-0.5 text-xs leading-4 text-ink-muted dark:text-slate-400">
            {n.message}
          </Text>

          <View className="mt-1.5 flex-row items-center gap-2">
            <Text className="text-[11px] text-ink-muted dark:text-slate-500">{formatTimeAgo(n.createdAt)}</Text>
            {n.priority !== 'medium' ? (
              <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: priorityColor.bg }}>
                <Text className="text-[10px] font-semibold" style={{ color: priorityColor.text }}>
                  {n.priority.charAt(0).toUpperCase() + n.priority.slice(1)}
                </Text>
              </View>
            ) : null}
            {isUnread ? (
              <View className="rounded bg-primary-100 px-1.5 py-0.5 dark:bg-primary-900/40">
                <Text className="text-[10px] font-semibold text-primary-700 dark:text-primary-300">Unread</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

export const NotificationCard = memo(NotificationCardBase);
