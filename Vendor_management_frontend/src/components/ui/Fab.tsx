import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FabProps {
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress?: () => void;
}

/** Circular floating action button, anchored bottom-right by the caller. */
export function Fab({ icon = 'add', accessibilityLabel, onPress }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}
      className="h-14 w-14 items-center justify-center rounded-full bg-primary-600 shadow-lg shadow-primary-900/30 active:bg-primary-700"
    >
      <Ionicons name={icon} size={26} color="#ffffff" />
    </Pressable>
  );
}
