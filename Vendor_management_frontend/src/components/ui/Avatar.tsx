import { Pressable, Text, View } from 'react-native';

interface AvatarProps {
  initials: string;
  size?: number;
  online?: boolean;
  onPress?: () => void;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

/** Circular initials avatar, optionally showing a green online-status dot.
 *  Pass `onPress` to make it tappable (e.g. the header profile icon that opens the drawer). */
export function Avatar({
  initials,
  size = 36,
  online = false,
  onPress,
  bgColor = '#0F172A',
  textColor = '#FFFFFF',
  borderColor = '#FFFFFF',
}: AvatarProps) {
  const content = (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 1.5,
      }}
      className="items-center justify-center rounded-full"
    >
      <Text style={{ color: textColor }} className="text-sm font-bold">
        {initials}
      </Text>
      {online ? (
        <View
          className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-emerald-500"
          style={{ width: size * 0.32, height: size * 0.32 }}
        />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={onPress} hitSlop={8}>
      {content}
    </Pressable>
  );
}
