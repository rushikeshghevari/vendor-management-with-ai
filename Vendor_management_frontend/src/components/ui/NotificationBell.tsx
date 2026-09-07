import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useGetUnreadNotificationCountQuery } from '@/features/notifications/api/notificationsApi';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

/**
 * Reused across every role's Dashboard/list screens, nested at varying depths (directly in
 * a tab, or inside a tab's own stack, e.g. QuotationList). NotificationCenter lives at the
 * true root (a sibling of "Main" in RootNavigator.tsx, deliberately outside every tab's own
 * stack — see that file's comment for why), so this climbs `getParent()` all the way up
 * rather than stopping one level, to reach it regardless of how deep this bell is rendered.
 */
export function NotificationBell({ size = 22, color = '#ffffff' }: NotificationBellProps) {
  const navigation = useNavigation();
  const { data: unreadCount } = useGetUnreadNotificationCountQuery();
  const scale = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount !== undefined && prevCountRef.current !== undefined && unreadCount > prevCountRef.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 150, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount, scale]);

  const handlePress = () => {
    let target = navigation as unknown as { getParent: () => unknown; navigate: (name: string, params?: object) => void };
    while (target.getParent()) {
      target = target.getParent() as typeof target;
    }
    target.navigate('NotificationCenter');
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Notifications" className="relative" hitSlop={8} onPress={handlePress}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name="notifications-outline" size={size} color={color} />
        <NotificationBadge count={unreadCount ?? 0} />
      </Animated.View>
    </Pressable>
  );
}
