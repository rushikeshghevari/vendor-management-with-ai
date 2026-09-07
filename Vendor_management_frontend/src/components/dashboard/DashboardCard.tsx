import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

interface DashboardCardProps extends PropsWithChildren {
  className?: string;
}

/** Generic white rounded card with a soft enterprise shadow, used to wrap dashboard sections. */
export function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <View
      className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none ${className}`}
    >
      {children}
    </View>
  );
}
