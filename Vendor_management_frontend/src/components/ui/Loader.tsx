import { ActivityIndicator, Text, View } from 'react-native';

interface LoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export function Loader({ label, fullscreen = false }: LoaderProps) {
  return (
    <View
      className={
        fullscreen
          ? 'absolute inset-0 z-50 items-center justify-center bg-white/80 dark:bg-surface-dark/80'
          : 'items-center justify-center py-8'
      }
    >
      <ActivityIndicator size="large" />
      {label ? (
        <Text className="mt-3 text-sm text-slate-600 dark:text-slate-300">{label}</Text>
      ) : null}
    </View>
  );
}
