import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}

/** Collapsible "Today / Yesterday / Earlier" section header — LayoutAnimation is built into
 *  RN core, no extra dependency needed for the collapse animation. */
export function NotificationGroupHeader({ title, count, collapsed, onToggle }: Props) {
  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title} section, ${collapsed ? 'collapsed' : 'expanded'}`}
      className="mx-4 mb-1 mt-3 flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-1.5">
        <Text className="text-xs font-bold uppercase tracking-wide text-ink-muted dark:text-slate-400">{title}</Text>
        <View className="rounded-full bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
          <Text className="text-[10px] font-semibold text-ink-muted dark:text-slate-400">{count}</Text>
        </View>
      </View>
      <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color="#94A3B8" />
    </Pressable>
  );
}
