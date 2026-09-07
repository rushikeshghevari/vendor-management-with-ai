import * as DocumentPicker from 'expo-document-picker';
import { Alert, ScrollView, Text, KeyboardAvoidingView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BillForm } from '@/components/bills/BillForm';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import {
  useGetBillsQuery,
  useResubmitBillMutation,
  useSubmitBillMutation,
  useUpdateBillMutation,
  useUploadBillInvoiceMutation,
  useUploadBillSupportingDocumentMutation,
} from '@/features/bills/api/billsApi';
import type { BillFormValues } from '@/features/bills/billSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { BillsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<BillsStackParamList, 'EditBill'>;

export function EditBillScreen({ navigation, route }: Props) {
  const { billId } = route.params;
  const { data: bills = [], refetch } = useGetBillsQuery();
  const [updateBill, { isLoading: isSaving }] = useUpdateBillMutation();
  const [submitBill, { isLoading: isSubmitting }] = useSubmitBillMutation();
  const [resubmitBill, { isLoading: isResubmitting }] = useResubmitBillMutation();
  const [uploadInvoice, { isLoading: isUploadingInvoice }] = useUploadBillInvoiceMutation();
  const [uploadSupporting, { isLoading: isUploadingSupporting }] = useUploadBillSupportingDocumentMutation();

  const bill = bills.find((b) => b.id === billId);

  const isCorrectionRequested = bill?.status === 'director_correction' || bill?.status === 'correction_requested';

  if (!bill) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Bill" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  const handleUploadInvoice = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/pdf' } as unknown as Blob);
        await uploadInvoice({ id: bill.id, formData }).unwrap();
        refetch();
        Alert.alert('Invoice Uploaded', 'Revised invoice PDF has been uploaded successfully.');
      }
    } catch {
      Alert.alert('Could Not Select File', 'An error occurred while uploading.');
    }
  };

  const handleUploadSupportingDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/pdf' } as unknown as Blob);
        await uploadSupporting({ id: bill.id, formData }).unwrap();
        refetch();
        Alert.alert('Document Uploaded', 'Supporting document has been uploaded successfully.');
      }
    } catch {
      Alert.alert('Could Not Select File', 'An error occurred while uploading.');
    }
  };

  const handleSave = async (values: BillFormValues) => {
    try {
      await updateBill({
        id: bill.id,
        body: {
          invoiceNumber: values.invoiceNumber,
          invoiceDate: new Date(values.invoiceDate).toISOString(),
          invoiceAmount: Number(values.invoiceAmount),
          taxableAmount: Number(values.taxableAmount),
          gstAmount: Number(values.gstAmount),
          paymentTerms: values.paymentTerms,
          creditPeriod: values.creditPeriod,
          dueDate: new Date(values.dueDate).toISOString(),
          remarks: values.remarks || undefined,
        },
      }).unwrap();
      refetch();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Update Bill', getErrorMessage(error));
    }
  };

  const handleSubmitOrResubmit = async (values: BillFormValues) => {
    try {
      await updateBill({
        id: bill.id,
        body: {
          invoiceNumber: values.invoiceNumber,
          invoiceDate: new Date(values.invoiceDate).toISOString(),
          invoiceAmount: Number(values.invoiceAmount),
          taxableAmount: Number(values.taxableAmount),
          gstAmount: Number(values.gstAmount),
          paymentTerms: values.paymentTerms,
          creditPeriod: values.creditPeriod,
          dueDate: new Date(values.dueDate).toISOString(),
          remarks: values.remarks || undefined,
        },
      }).unwrap();

      if (isCorrectionRequested) {
        await resubmitBill(bill.id).unwrap();
      } else {
        await submitBill(bill.id).unwrap();
      }
      refetch();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Submit Bill', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Edit Bill" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {isCorrectionRequested && bill.accountsRemarks ? (
            <DashboardCard className="mb-4 border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400">Accounts Remarks</Text>
              <Text className="mt-1 text-sm text-amber-900 dark:text-amber-200">{bill.accountsRemarks}</Text>
            </DashboardCard>
          ) : null}

          <DashboardCard className="mb-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Invoice PDF</Text>
            <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
              {bill.invoiceFiles.length > 0
                ? `${bill.invoiceFiles.length} version(s) uploaded — latest: ${bill.invoiceFiles[bill.invoiceFiles.length - 1]?.fileName}`
                : 'No invoice PDF uploaded yet.'}
            </Text>
            <Button
              label={bill.invoiceFiles.length > 0 ? 'Upload Revised Invoice PDF' : 'Upload Invoice PDF'}
              variant="secondary"
              loading={isUploadingInvoice}
              onPress={handleUploadInvoice}
              className="mt-3"
            />
          </DashboardCard>

          <DashboardCard className="mb-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Supporting Documents (Optional)</Text>
            <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
              {bill.supportingDocuments.length > 0 ? `${bill.supportingDocuments.length} document(s) uploaded.` : 'No supporting documents uploaded.'}
            </Text>
            <Button
              label="Upload Supporting Document"
              variant="secondary"
              loading={isUploadingSupporting}
              onPress={handleUploadSupportingDocument}
              className="mt-3"
            />
          </DashboardCard>

          <BillForm
            billCode={bill.billCode}
            quotationCode={bill.quotationCode}
            vendorName={`${bill.vendorName} (${bill.vendorCode})`}
            departmentName={bill.departmentName}
            defaultValues={{
              invoiceNumber: bill.invoiceNumber,
              invoiceDate: bill.invoiceDate.slice(0, 10),
              invoiceAmount: String(bill.invoiceAmount) as unknown as number,
              taxableAmount: String(bill.taxableAmount) as unknown as number,
              gstAmount: String(bill.gstAmount) as unknown as number,
              paymentTerms: bill.paymentTerms,
              creditPeriod: String(bill.creditPeriod ?? 0) as unknown as number,
              dueDate: bill.dueDate.slice(0, 10),
              remarks: bill.remarks ?? '',
            }}
            primaryLabel="Save Changes"
            secondaryLabel={isCorrectionRequested ? 'Resubmit' : 'Submit to Accounts'}
            isPrimarySubmitting={isSaving}
            isSecondarySubmitting={isSubmitting || isResubmitting}
            onPrimarySubmit={handleSave}
            onSecondarySubmit={handleSubmitOrResubmit}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
