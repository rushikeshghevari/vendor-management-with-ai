import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: any) => {
    if (!disabled) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 220 });
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 220 });
    }
    onPressOut?.(event);
  };

  const getStyle = (state: any) => {
    const resolvedStyle = typeof style === 'function' ? style(state) : style;
    return [resolvedStyle, animatedStyle];
  };

  return (
    <AnimatedPressableBase
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={getStyle as any}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
}
