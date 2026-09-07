import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-8">
      <Text className="mb-4 text-center text-base text-slate-600 dark:text-slate-300">
        {message}
      </Text>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
