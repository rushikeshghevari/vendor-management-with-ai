import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface AnalyticsBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

/** Percentage-fill bar row with loading animations. */
export function AnalyticsBar({ label, value, max, color }: AnalyticsBarProps) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 800 });
  }, [pct, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%` as `${number}%`,
  }));

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</Text>
        <Text style={{ color }} className="text-xs font-bold">{value}</Text>
      </View>
      <View className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <Animated.View
          style={[{ backgroundColor: color }, animatedStyle]}
          className="h-2 rounded-full"
        />
      </View>
    </View>
  );
}
