import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { NOTIFICATION_CARD_HEIGHT } from '@/features/notifications/components/NotificationCard';

function Bone({ className }: { className: string }) {
  return <View className={`rounded-full bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

function SkeletonCard() {
  return (
    <View
      className="mx-4 my-1.5 flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
      style={{ height: NOTIFICATION_CARD_HEIGHT }}
    >
      <View className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />
      <View className="flex-1 gap-2">
        <Bone className="h-3.5 w-2/3" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-1/3" />
      </View>
    </View>
  );
}

/** Pulsing skeleton list shown during the initial notifications load — plain RN Animated,
 *  no extra dependency. */
export function NotificationSkeletonList({ count = 6 }: { count?: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }} className="pt-2">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </Animated.View>
  );
}
