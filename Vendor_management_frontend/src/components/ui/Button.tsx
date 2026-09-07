import { ActivityIndicator, Text, type PressableProps } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: { container: 'bg-primary-600 dark:bg-primary-500 shadow-sm shadow-primary-500/20', text: 'text-white' },
  secondary: {
    container: 'bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50',
    text: 'text-slate-900 dark:text-white',
  },
  danger: { container: 'bg-red-600 dark:bg-red-500 shadow-sm shadow-red-500/20', text: 'text-white' },
  dangerOutline: {
    container: 'border border-red-200 bg-transparent dark:border-red-900/60',
    text: 'text-red-600 dark:text-red-400',
  },
  ghost: { container: 'bg-transparent', text: 'text-primary-600 dark:text-primary-400' },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const styles = variantStyles[variant];

  // Helper to determine loader color based on button variant
  const getLoaderColor = () => {
    if (variant === 'primary' || variant === 'danger') return '#ffffff';
    if (variant === 'dangerOutline') return '#dc2626';
    return '#1e88e5';
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-2xl px-4 py-3.5 ${styles.container} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      {...pressableProps}
    >
      {loading && <ActivityIndicator size="small" className="mr-2" color={getLoaderColor()} />}
      <Text className={`text-base font-semibold ${styles.text}`}>{label}</Text>
    </AnimatedPressable>
  );
}
