import { Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-8">
      <Text className="text-center text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </Text>
      {description ? (
        <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
