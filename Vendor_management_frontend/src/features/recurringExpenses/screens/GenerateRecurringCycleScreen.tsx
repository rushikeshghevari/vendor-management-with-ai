import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, ScrollView, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { FormDateField } from '@/components/ui/FormDateField';
import { FormSearchableDropdown } from '@/components/ui/FormSearchableDropdown';
import { FormTextField } from '@/components/ui/FormTextField';
import { Screen } from '@/components/ui/Screen';
import { useUploadBillInvoiceMutation } from '@/features/bills/api/billsApi';
import {
  useGenerateRecurringCycleMutation,
  useGetRecurringExpenseByIdQuery,
} from '@/features/recurringExpenses/api/recurringExpensesApi';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { BillsStackParamList } from '@/navigation/types';

// Same term set BillForm.tsx uses, for consistency across the app — plus 100% Advance, since
// full-upfront-payment services (subscriptions, licenses) are common enough to warrant a preset
// rather than always falling back to the free-typed "Use ..." row below.
const PAYMENT_TERMS_OPTIONS = [
  { value: 'Net 30', label: 'Net 30' },
  { value: 'Net 45', label: 'Net 45' },
  { value: 'Net 60', label: 'Net 60' },
  { value: 'Immediate Payment', label: 'Immediate Payment' },
  { value: '50% Advance / 50% Delivery', label: '50% Advance / 50% Delivery' },
  { value: '100% Advance', label: '100% Advance' },
];

type PickedFile = { uri: string; name: string; mimeType?: string | null };

interface FormValues {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: string;
  taxableAmount: string;
  gstAmount: string;
  paymentTerms: string;
}

type Props = NativeStackScreenProps<BillsStackParamList, 'GenerateRecurringCycle'>;

/** Just enough to create the draft Bill for this cycle — the department user then lands on
 *  the existing (unmodified) EditBill screen to attach the real invoice/receipt file and
 *  submit, exactly the same as any other bill. */
export function GenerateRecurringCycleScreen({ navigation, route }: Props) {
  const { recurringExpenseId, title } = route.params;
  const { data: series } = useGetRecurringExpenseByIdQuery(recurringExpenseId);
  const [generateCycle, { isLoading }] = useGenerateRecurringCycleMutation();
  const [uploadInvoice, { isLoading: isUploading }] = useUploadBillInvoiceMutation();
  const [invoiceFile, setInvoiceFile] = useState<PickedFile | null>(null);

  const handlePickInvoice = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setInvoiceFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  };

  const { control, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      invoiceAmount: '',
      taxableAmount: '',
      gstAmount: '',
      paymentTerms: '',
    },
  });

  // Most cycles land right at the approved baseline — prefill it so the common case is just
  // "confirm and attach the invoice", rather than retyping the same amount every time.
  useEffect(() => {
    if (series) setValue('invoiceAmount', String(series.baselineAmount));
  }, [series, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (!values.invoiceNumber.trim()) {
      Alert.alert('Invoice/Reference Number Required', 'Enter the invoice or receipt number for this cycle.');
      return;
    }
    const invoiceAmount = Number(values.invoiceAmount);
    if (!invoiceAmount || invoiceAmount <= 0) {
      Alert.alert('Amount Required', 'Enter a valid amount greater than 0.');
      return;
    }

    try {
      const bill = await generateCycle({
        id: recurringExpenseId,
        body: {
          invoiceNumber: values.invoiceNumber.trim(),
          invoiceDate: values.invoiceDate,
          invoiceAmount,
          taxableAmount: values.taxableAmount ? Number(values.taxableAmount) : undefined,
          gstAmount: values.gstAmount ? Number(values.gstAmount) : undefined,
          paymentTerms: values.paymentTerms.trim() || undefined,
        },
      }).unwrap();

      if (invoiceFile) {
        const formData = new FormData();
        formData.append('file', { uri: invoiceFile.uri, name: invoiceFile.name, type: invoiceFile.mimeType ?? 'application/pdf' } as unknown as Blob);
        await uploadInvoice({ id: bill.id, formData }).unwrap();
      }

      navigation.replace('EditBill', { billId: bill.id });
    } catch (error) {
      Alert.alert('Could Not Generate This Cycle', getErrorMessage(error));
    }
  });

  return (
    <Screen padded={false}>
      <AppHeader title="Generate This Cycle" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="mb-4 text-sm text-ink-muted dark:text-slate-400">
          {title} — enter this cycle's amount and attach the invoice/receipt.
        </Text>

        <FormTextField control={control} name="invoiceNumber" label="Invoice / Reference Number" placeholder="e.g. INV-2026-045" />
        <FormDateField control={control} name="invoiceDate" label="Invoice Date" />
        <FormTextField control={control} name="invoiceAmount" label="Amount" placeholder="e.g. 2200" keyboardType="numeric" />
        <FormTextField control={control} name="taxableAmount" label="Taxable Amount (optional)" placeholder="e.g. 2000" keyboardType="numeric" />
        <FormTextField control={control} name="gstAmount" label="GST Amount (optional)" placeholder="e.g. 200" keyboardType="numeric" />
        <FormSearchableDropdown
          control={control}
          name="paymentTerms"
          label="Payment Terms (optional)"
          placeholder="Select or type payment terms..."
          options={PAYMENT_TERMS_OPTIONS}
          allowCustom
        />

        <DashboardCard className="mb-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Invoice / Receipt PDF</Text>
          <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
            {invoiceFile ? invoiceFile.name : 'Optional here — you can also attach it on the next screen.'}
          </Text>
          <Button label={invoiceFile ? 'Change PDF' : 'Select PDF'} variant="secondary" onPress={handlePickInvoice} className="mt-3" />
        </DashboardCard>

        <Button label="Continue" loading={isLoading || isUploading} onPress={onSubmit} className="mt-2" />
      </ScrollView>
    </Screen>
  );
}
