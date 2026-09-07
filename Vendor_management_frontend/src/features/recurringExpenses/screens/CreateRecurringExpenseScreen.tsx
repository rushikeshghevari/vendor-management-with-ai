import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChipSelect } from '@/components/departments/ChipSelect';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { FormDateField } from '@/components/ui/FormDateField';
import { FormTextField } from '@/components/ui/FormTextField';
import { Screen } from '@/components/ui/Screen';
import { useCreateRecurringExpenseMutation } from '@/features/recurringExpenses/api/recurringExpensesApi';
import { recurringExpenseSchema, type RecurringExpenseFormValues } from '@/features/recurringExpenses/recurringExpenseSchema';
import { useGetUsersQuery } from '@/features/users/api/usersApi';
import { useGetVendorsQuery } from '@/features/vendors/api/vendorsApi';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { BillsStackParamList } from '@/navigation/types';

const MODE_OPTIONS = [
  { value: 'vendor_bill' as const, label: 'Vendor Bill' },
  { value: 'reimbursement' as const, label: 'Reimbursement' },
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'quarterly' as const, label: 'Quarterly' },
  { value: 'half_yearly' as const, label: 'Every 6 Months' },
  { value: 'yearly' as const, label: 'Yearly' },
];

type Props = NativeStackScreenProps<BillsStackParamList, 'CreateRecurringExpense'>;

export function CreateRecurringExpenseScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { data: vendors } = useGetVendorsQuery();
  const { data: users } = useGetUsersQuery();
  const [createRecurringExpense, { isLoading }] = useCreateRecurringExpenseMutation();

  const { control, handleSubmit, watch } = useForm<RecurringExpenseFormValues>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: {
      title: '',
      mode: 'vendor_bill',
      frequency: 'monthly',
      thresholdPercent: 20,
      nextDueDate: new Date().toISOString().slice(0, 10),
    },
  });

  const mode = watch('mode');
  const employees = (users ?? []).filter((item) => item.departmentId === user?.department);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createRecurringExpense({
        title: values.title,
        mode: values.mode,
        vendor: values.mode === 'vendor_bill' ? values.vendorId : undefined,
        reimbursedTo: values.mode === 'reimbursement' ? values.reimbursedToId : undefined,
        reimbursementBankDetails:
          values.mode === 'reimbursement'
            ? {
                bankName: values.bankName!,
                accountHolderName: values.accountHolderName!,
                accountNumber: values.accountNumber!,
                ifscCode: values.ifscCode!,
                upiId: values.upiId || undefined,
              }
            : undefined,
        frequency: values.frequency,
        baselineAmount: values.baselineAmount,
        thresholdPercent: values.thresholdPercent,
        nextDueDate: values.nextDueDate,
      }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Save Recurring Expense', getErrorMessage(error));
    }
  });

  return (
    <Screen padded={false}>
      <AppHeader title="Make Recurring" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <FormTextField control={control} name="title" label="Title" placeholder="e.g. Claude AI Subscription" />

        <Controller
          control={control}
          name="mode"
          render={({ field: { value, onChange } }) => (
            <ChipSelect label="Type" value={value} options={MODE_OPTIONS} onChange={onChange} />
          )}
        />
        <Text className="-mt-3 mb-4 text-xs text-ink-muted dark:text-slate-400">
          {mode === 'vendor_bill'
            ? 'Company pays the vendor directly each cycle (server hosting, software licenses, AMC).'
            : 'An employee pays out-of-pocket each cycle and is paid back by the company.'}
        </Text>

        {mode === 'vendor_bill' ? (
          <Controller
            control={control}
            name="vendorId"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View className="mb-4">
                <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-200">Vendor</Text>
                <FilterChipRow
                  value={value ?? ''}
                  options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))}
                  onChange={onChange}
                />
                {error ? <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{error.message}</Text> : null}
              </View>
            )}
          />
        ) : (
          <>
            <Controller
              control={control}
              name="reimbursedToId"
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <View className="mb-4">
                  <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-200">Reimburse To</Text>
                  <FilterChipRow
                    value={value ?? ''}
                    options={employees.map((emp) => ({ value: emp.id, label: emp.name }))}
                    onChange={onChange}
                  />
                  {employees.length === 0 ? (
                    <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">No department users found.</Text>
                  ) : null}
                  {error ? <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{error.message}</Text> : null}
                </View>
              )}
            />

            <Text className="mb-1.5 text-sm font-semibold text-ink dark:text-slate-200">Bank Details (for reimbursement payout)</Text>
            <FormTextField control={control} name="bankName" label="Bank Name" placeholder="e.g. HDFC Bank" />
            <FormTextField control={control} name="accountHolderName" label="Account Holder Name" placeholder="As per bank records" />
            <FormTextField control={control} name="accountNumber" label="Account Number" placeholder="e.g. 123456789012" keyboardType="numeric" />
            <FormTextField control={control} name="ifscCode" label="IFSC Code" placeholder="e.g. HDFC0001234" autoCapitalize="characters" />
            <FormTextField control={control} name="upiId" label="UPI ID (optional)" placeholder="e.g. name@okhdfcbank" />
          </>
        )}

        <Controller
          control={control}
          name="frequency"
          render={({ field: { value, onChange } }) => (
            <ChipSelect label="Frequency" value={value} options={FREQUENCY_OPTIONS} onChange={onChange} />
          )}
        />

        <FormTextField
          control={control}
          name="baselineAmount"
          label="Baseline Amount (Director-Approved)"
          placeholder="e.g. 2000"
          keyboardType="numeric"
        />
        <FormTextField
          control={control}
          name="thresholdPercent"
          label="Threshold % (Director re-approval above this)"
          placeholder="20"
          keyboardType="numeric"
        />
        <FormDateField control={control} name="nextDueDate" label="Next Due Date" />

        <Button label="Save Recurring Expense" loading={isLoading} onPress={onSubmit} className="mt-2" />
        <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} className="mt-3" />
      </ScrollView>
    </Screen>
  );
}
