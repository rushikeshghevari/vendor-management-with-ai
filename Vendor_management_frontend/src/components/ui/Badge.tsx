import { Text, View } from 'react-native';

type BadgeVariant = 'primary' | 'success' | 'danger' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  primary: { container: 'bg-primary-100 dark:bg-primary-900/40', text: 'text-primary-700 dark:text-primary-300' },
  success: { container: 'bg-success-50 dark:bg-success-900/30', text: 'text-success-600 dark:text-success-400' },
  danger: { container: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  neutral: { container: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' },
};

export function Badge({ label, variant = 'primary' }: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <View className={`self-start rounded-full px-3 py-1 ${styles.container}`}>
      <Text className={`text-xs font-semibold ${styles.text}`}>{label}</Text>
    </View>
  );
}
