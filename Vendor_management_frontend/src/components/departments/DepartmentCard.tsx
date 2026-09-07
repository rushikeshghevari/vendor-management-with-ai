import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DepartmentBadge } from '@/components/departments/DepartmentBadge';
import type { Department } from '@/features/departments/types';

interface DepartmentCardProps {
  department: Department;
  onPress?: (department: Department) => void;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DepartmentCard({ department, onPress }: DepartmentCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={department.name}
      onPress={() => onPress?.(department)}
      android_ripple={{ color: '#e2e8f0' }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-start gap-3 pr-2">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <Ionicons name="business" size={20} color="#1e88e5" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink dark:text-white">{department.name}</Text>
            <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">{department.code}</Text>
          </View>
        </View>
        <DepartmentBadge isActive={department.isActive} />
      </View>

      <Text className="mt-3 text-sm text-ink-muted dark:text-slate-400" numberOfLines={2}>
        {department.description}
      </Text>

      <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500">{formatDate(department.createdAt)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </View>
    </Pressable>
  );
}
