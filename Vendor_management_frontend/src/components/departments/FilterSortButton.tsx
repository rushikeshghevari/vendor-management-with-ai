import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterSortButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}

/** Small bordered chip used for the Filter and Sort triggers above the departments list. */
export function FilterSortButton({ icon, label, onPress }: FilterSortButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
    >
      <Ionicons name={icon} size={16} color="#1e88e5" />
      <Text className="text-sm font-semibold text-ink dark:text-white">{label}</Text>
    </Pressable>
  );
}
