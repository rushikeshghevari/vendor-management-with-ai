import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import {
  useDeactivateRecurringExpenseMutation,
  useGetRecurringExpensesQuery,
} from '@/features/recurringExpenses/api/recurringExpensesApi';
import type { RecurringExpense } from '@/features/recurringExpenses/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { BillsStackParamList } from '@/navigation/types';

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Every 6 Months',
  yearly: 'Yearly',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isDue(nextDueDate: string): boolean {
  return new Date(nextDueDate).getTime() <= Date.now();
}

type Props = NativeStackScreenProps<BillsStackParamList, 'RecurringExpenseList'>;

export function RecurringExpenseListScreen({ navigation }: Props) {
  const { data: expenses, isLoading } = useGetRecurringExpensesQuery({ isActive: true });
  const [deactivate] = useDeactivateRecurringExpenseMutation();

  const handleDeactivate = (item: RecurringExpense) => {
    Alert.alert('Stop Recurring Expense', `Stop reminders for "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          try {
            await deactivate(item.id).unwrap();
          } catch (error) {
            Alert.alert('Could Not Stop', getErrorMessage(error));
          }
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <AppHeader
        title="Recurring Expenses"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add recurring expense"
            onPress={() => navigation.navigate('CreateRecurringExpense')}
            hitSlop={8}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </Pressable>
        }
      />
      {isLoading ? (
        <Loader fullscreen />
      ) : (
        <ScrollView
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {(expenses ?? []).length === 0 ? (
            <Text className="mt-8 text-center text-sm text-ink-muted dark:text-slate-400">
              No recurring expenses yet. Tap + to set one up from an already Director-approved bill.
            </Text>
          ) : (
            (expenses ?? []).map((item) => {
              const due = isDue(item.nextDueDate);
              return (
                <DashboardCard key={item.id} className="mb-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-semibold text-ink dark:text-white">{item.title}</Text>
                      <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">
                        {item.mode === 'vendor_bill' ? `Vendor: ${item.vendorName ?? '—'}` : `Reimburse: ${item.reimbursedToName ?? '—'}`}
                      </Text>
                    </View>
                    {due ? (
                      <View className="rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-900/40">
                        <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">Due</Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="mt-3 flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="repeat" size={13} color="#5f5f5f" />
                      <Text className="text-xs text-ink-muted dark:text-slate-500">{FREQUENCY_LABEL[item.frequency]}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
                      <Text className="text-xs text-ink-muted dark:text-slate-500">Next: {formatDate(item.nextDueDate)}</Text>
                    </View>
                  </View>
                  <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">
                    Baseline ₹{item.baselineAmount.toLocaleString('en-IN')} · {item.thresholdPercent}% threshold
                  </Text>

                  <View className="mt-3 flex-row gap-2">
                    <Button
                      label="Generate This Cycle"
                      variant={due ? 'primary' : 'secondary'}
                      className="flex-1"
                      onPress={() => navigation.navigate('GenerateRecurringCycle', { recurringExpenseId: item.id, title: item.title })}
                    />
                  </View>
                  <Button
                    label="Stop This Recurring Expense"
                    variant="dangerOutline"
                    className="mt-2"
                    onPress={() => handleDeactivate(item)}
                  />
                </DashboardCard>
              );
            })
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
