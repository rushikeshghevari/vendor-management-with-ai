import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';

interface RequirementEmptyStateProps {
  onAddPress?: () => void;
}

export function RequirementEmptyState({ onAddPress }: RequirementEmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
        <Ionicons name="list-outline" size={36} color="#1e88e5" />
      </View>
      <Text className="mt-4 text-center text-base font-bold text-ink dark:text-white">No Requirements Found</Text>
      <Text className="mt-1 text-center text-sm text-ink-muted dark:text-slate-400">
        {onAddPress ? 'Try adjusting your search or filters, or raise your first requirement.' : 'Try adjusting your search or filters.'}
      </Text>
      {onAddPress ? <Button label="Create Requirement" onPress={onAddPress} className="mt-5 w-full" /> : null}
    </View>
  );
}
