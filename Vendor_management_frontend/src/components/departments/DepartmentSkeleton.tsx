import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

/** Pulsing placeholder shaped like a DepartmentCard, shown while the list is "loading". */
export function DepartmentSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <View className="gap-2">
            <View className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            <View className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          </View>
        </View>
        <View className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
      </View>

      <View className="mt-3 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
      <View className="mt-2 h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />

      <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <View className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      </View>
    </Animated.View>
  );
}
