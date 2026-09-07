import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  count: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onCancel: () => void;
}

function ActionButton({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="items-center gap-1 px-3" hitSlop={8}>
      <Ionicons name={icon} size={20} color={color} />
      <Text className="text-[11px] font-semibold" style={{ color }}>{label}</Text>
    </Pressable>
  );
}

/** Appears above the list once multi-select is active (long-press a card to enter). */
export function UserBulkActionBar({ count, onActivate, onDeactivate, onCancel }: Props) {
  return (
    <View className="mx-4 mb-2 flex-row items-center justify-between rounded-2xl border border-primary-200 bg-primary-50 px-3 py-2 dark:border-primary-800 dark:bg-primary-950/40">
      <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel selection" hitSlop={8}>
        <Ionicons name="close" size={20} color="#2563EB" />
      </Pressable>
      <Text className="text-sm font-semibold text-primary-700 dark:text-primary-300">{count} selected</Text>
      <View className="flex-row items-center">
        <ActionButton icon="checkmark-circle-outline" label="Activate" color="#16A34A" onPress={onActivate} />
        <ActionButton icon="pause-circle-outline" label="Deactivate" color="#DC2626" onPress={onDeactivate} />
      </View>
    </View>
  );
}
