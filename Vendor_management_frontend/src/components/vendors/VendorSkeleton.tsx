import { View } from 'react-native';
import { Skeleton } from '@/components/ui';

/** Pulsing placeholder shaped like a VendorCard, shown while the list is loading. */
export function VendorSkeleton() {
  return (
    <View className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <View className="flex-row items-start justify-between">
        <View className="gap-2">
          <Skeleton className="h-3.5 w-36 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </View>
        <Skeleton className="h-5 w-14 rounded-full" />
      </View>

      <Skeleton className="mt-3 h-3 w-32 rounded" />
      <Skeleton className="mt-2 h-3 w-28 rounded" />

      <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <Skeleton className="h-3 w-24 rounded" />
      </View>
    </View>
  );
}
