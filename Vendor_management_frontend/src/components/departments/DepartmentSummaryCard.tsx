import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface DepartmentSummaryCardProps {
  icon: ReactNode;
  value: number;
  label: string;
}

/** Small KPI tile used on the Department Details screen (Total Users / Total Vendors). */
export function DepartmentSummaryCard({ icon, value, label }: DepartmentSummaryCardProps) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      {icon}
      <Text className="mt-2 text-2xl font-bold text-ink dark:text-white">{value}</Text>
      <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">{label}</Text>
    </View>
  );
}
