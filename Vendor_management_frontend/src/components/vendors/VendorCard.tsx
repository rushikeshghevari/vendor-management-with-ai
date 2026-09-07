import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge, AnimatedPressable } from '@/components/ui';
import type { Vendor, VendorStatus } from '@/features/vendors/types';

interface VendorCardProps {
  vendor: Vendor;
  onPress?: (vendor: Vendor) => void;
}

const STATUS_LABEL: Record<VendorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blacklisted: 'Blacklisted',
};

const STATUS_VARIANT: Record<VendorStatus, 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  inactive: 'neutral',
  blacklisted: 'danger',
};

export function VendorCard({ vendor, onPress }: VendorCardProps) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={vendor.name}
      onPress={() => onPress?.(vendor)}
      android_ripple={{ color: '#f1f5f9' }}
      className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-bold text-ink dark:text-white">{vendor.name}</Text>
          <Text className="mt-0.5 text-xs font-semibold text-primary-600">{vendor.code}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Badge label={STATUS_LABEL[vendor.status]} variant={STATUS_VARIANT[vendor.status]} />
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-1.5">
        <Ionicons name="pricetag-outline" size={13} color="#5f5f5f" />
        <Text className="text-xs text-ink-muted dark:text-slate-500">{vendor.category}</Text>
      </View>

      <View className="mt-2 flex-row items-center gap-1.5">
        <Ionicons name="person-outline" size={13} color="#5f5f5f" />
        <Text className="text-xs text-ink-muted dark:text-slate-500">{vendor.contactPerson}</Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="call-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500">{vendor.phone}</Text>
        </View>
        {vendor.gstNumber ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="document-text-outline" size={13} color="#5f5f5f" />
            <Text className="text-xs text-ink-muted dark:text-slate-500">{vendor.gstNumber}</Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}
