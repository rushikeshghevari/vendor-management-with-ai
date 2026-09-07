import { Text, View } from 'react-native';

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View
      accessibilityRole="alert"
      className="mb-4 flex-row items-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950"
    >
      <Text className="mr-2 text-base">⚠️</Text>
      <Text className="flex-1 text-sm font-medium text-red-700 dark:text-red-300">{message}</Text>
    </View>
  );
}
