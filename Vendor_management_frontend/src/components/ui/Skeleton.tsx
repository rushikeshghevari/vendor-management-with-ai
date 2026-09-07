import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable high-performance shimmer/pulse skeleton loader.
 * Uses react-native-reanimated for fluid 60fps animations.
 */
export function Skeleton({
  width,
  height,
  borderRadius,
  className = '',
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 650 }),
        withTiming(0.35, { duration: 650 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const customStyle: ViewStyle = {};
  if (width !== undefined) customStyle.width = typeof width === 'number' ? width : undefined;
  if (height !== undefined) customStyle.height = typeof height === 'number' ? height : undefined;
  if (borderRadius !== undefined) customStyle.borderRadius = borderRadius;

  // Determine standard classes if width/height are string classnames like "w-full" or "h-4"
  const widthClass = typeof width === 'string' ? width : '';
  const heightClass = typeof height === 'string' ? height : '';

  return (
    <Animated.View
      style={[customStyle, style, animatedStyle]}
      className={`bg-slate-200 dark:bg-slate-800 ${widthClass} ${heightClass} ${
        borderRadius === undefined && !className.includes('rounded') ? 'rounded-lg' : ''
      } ${className}`}
    />
  );
}
