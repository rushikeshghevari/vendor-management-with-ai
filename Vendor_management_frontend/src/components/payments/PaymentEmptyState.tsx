import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function PaymentEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
        <Ionicons name="card-outline" size={36} color="#1e88e5" />
      </View>
      <Text className="mt-4 text-center text-base font-bold text-ink dark:text-white">No Payments Found</Text>
      <Text className="mt-1 text-center text-sm text-ink-muted dark:text-slate-400">
        A Payment can only be created from a Verified Bill.
      </Text>
    </View>
  );
}
