import { Pressable, Text, View } from 'react-native';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

/** Section title row with an optional right-aligned text action (e.g. "View all"). */
export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-base font-bold text-ink dark:text-white">{title}</Text>
      {actionLabel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onActionPress} hitSlop={8}>
          <Text className="text-sm font-semibold text-primary-600">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
