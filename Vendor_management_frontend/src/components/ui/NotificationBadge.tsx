import { Text, View } from 'react-native';

interface NotificationBadgeProps {
  count: number;
}

/** Small red count bubble, positioned absolute over a bell icon. */
export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <View className="absolute -right-1.5 -top-1.5 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1">
      <Text className="text-[11px] font-bold text-white">{count > 99 ? '99+' : count}</Text>
    </View>
  );
}
