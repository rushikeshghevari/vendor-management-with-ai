import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { QuotationForm } from '@/components/quotations/QuotationForm';
import { QuotationPdfUploadCard, type StagedPdfFile } from '@/components/quotations/QuotationPdfUploadCard';
import { VendorPickerSheet } from '@/components/quotations/VendorPickerSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import {
  useGetQuotationsQuery,
  useResubmitQuotationMutation,
  useSubmitQuotationMutation,
  useUpdateQuotationMutation,
  useUploadQuotationPdfMutation,
} from '@/features/quotations/api/quotationsApi';
import { quotationSchema, type QuotationFormValues } from '@/features/quotations/quotationSchema';
import { useGetVendorsQuery } from '@/features/vendors/api/vendorsApi';
import type { Vendor } from '@/features/vendors/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { QuotationsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<QuotationsStackParamList, 'EditQuotation'>;

export function EditQuotationScreen({ navigation, route }: Props) {
  const { quotationId } = route.params;
  const { data: quotations, isLoading } = useGetQuotationsQuery();
  const { data: vendors } = useGetVendorsQuery();
  const [updateQuotation, { isLoading: isSaving }] = useUpdateQuotationMutation();
  const [submitQuotation, { isLoading: isSubmitting }] = useSubmitQuotationMutation();
  const [resubmitQuotation, { isLoading: isResubmitting }] = useResubmitQuotationMutation();
  const [uploadPdf, { isLoading: isUploadingPdf }] = useUploadQuotationPdfMutation();

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pendingVendor, setPendingVendor] = useState<Vendor | null>(null);
  const [pdfFile, setPdfFile] = useState<StagedPdfFile | null>(null);
  const [pdfError, setPdfError] = useState<string | undefined>(undefined);

  const quotation = quotations?.find((item) => item.id === quotationId);

  // All hooks run unconditionally on every render — the isLoading/not-found states below
  // only gate what gets rendered, never which hooks get called.
  const { control, handleSubmit, setValue, reset } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      vendor: '',
      quotationDate: '',
      requiredDate: '',
      amount: '' as unknown as number,
      gst: '18' as unknown as number,
      currency: 'INR',
      paymentTerms: '',
      deliveryTerms: '',
      creditPeriod: '' as unknown as number,
      priority: 'medium',
      description: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (!quotation) return;
    reset({
      vendor: quotation.vendorId ?? '',
      quotationDate: quotation.quotationDate.slice(0, 10),
      requiredDate: quotation.requiredDate.slice(0, 10),
      amount: String(quotation.amount) as unknown as number,
      gst: String(quotation.gst) as unknown as number,
      currency: quotation.currency,
      paymentTerms: quotation.paymentTerms,
      deliveryTerms: quotation.deliveryTerms,
      creditPeriod: String(quotation.creditPeriod ?? 0) as unknown as number,
      priority: quotation.priority,
      description: quotation.description ?? '',
      remarks: quotation.remarks ?? '',
    });
    // Only seed the form once when the quotation first loads — not on every cache refresh,
    // or in-progress edits would get clobbered by a background refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation?.id]);

  useEffect(() => {
    if (pendingVendor) setValue('vendor', pendingVendor.id);
  }, [pendingVendor, setValue]);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Quotation" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!quotation) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Quotation" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Quotation not found.</Text>
      </Screen>
    );
  }

  const selectedVendor = pendingVendor ?? (
    quotation.vendorId
      ? {
          id: quotation.vendorId,
          name: quotation.vendorName,
          code: quotation.vendorCode,
        }
      : null
  );

  const buildPayload = (values: QuotationFormValues) => ({
    vendor: values.vendor,
    quotationDate: values.quotationDate,
    requiredDate: values.requiredDate,
    amount: values.amount,
    gst: values.gst,
    currency: values.currency,
    paymentTerms: values.paymentTerms,
    deliveryTerms: values.deliveryTerms,
    creditPeriod: values.creditPeriod,
    priority: values.priority,
    description: values.description || undefined,
    remarks: values.remarks || undefined,
  });

  const uploadStagedPdfIfAny = async () => {
    if (!pdfFile) return;
    const formData = new FormData();
    formData.append('file', { uri: pdfFile.uri, name: pdfFile.name, type: pdfFile.mimeType ?? 'application/pdf' } as unknown as Blob);
    await uploadPdf({ id: quotation.id, formData }).unwrap();
    setPdfFile(null);
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      await updateQuotation({ id: quotation.id, body: buildPayload(values) }).unwrap();
      await uploadStagedPdfIfAny();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Save Quotation', getErrorMessage(error));
    }
  });

  const handleSubmitOrResubmit = handleSubmit(async (values) => {
    if (!pdfFile && quotation.pdfFiles.length === 0) {
      setPdfError('A PDF is required before submitting to the Director.');
      return;
    }
    setPdfError(undefined);

    try {
      await updateQuotation({ id: quotation.id, body: buildPayload(values) }).unwrap();
      await uploadStagedPdfIfAny();
      if (quotation.status === 'negotiation') {
        await resubmitQuotation(quotation.id).unwrap();
      } else {
        await submitQuotation(quotation.id).unwrap();
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Submit Quotation', getErrorMessage(error));
    }
  });

  const isNegotiation = quotation.status === 'negotiation';
  const isSaveBusy = isSaving || isUploadingPdf;
  const isSubmitBusy = isSubmitting || isResubmitting || isUploadingPdf;

  return (
    <Screen padded={false}>
      <AppHeader title="Edit Quotation" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {isNegotiation && quotation.directorRemarks ? (
            <DashboardCard className="mb-4 border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400">Director's Remarks</Text>
              <Text className="mt-1 text-sm text-amber-900 dark:text-amber-200">{quotation.directorRemarks}</Text>
            </DashboardCard>
          ) : null}

          <QuotationForm
            control={control}
            quotationCode={quotation.quotationCode}
            departmentName={quotation.departmentName}
            selectedVendor={selectedVendor}
            onChangeVendor={() => setIsPickerVisible(true)}
            pdfSection={
              <QuotationPdfUploadCard
                value={pdfFile}
                onChange={(file) => {
                  setPdfFile(file);
                  if (file) setPdfError(undefined);
                }}
                errorMessage={pdfError}
                existingFileName={quotation.pdfFiles[quotation.pdfFiles.length - 1]?.fileName}
                existingVersionCount={quotation.pdfFiles.length}
              />
            }
          />
        </ScrollView>

        {/* Sticky footer — kept outside the ScrollView so it stays pinned regardless of scroll position. */}
        <View className="border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Button label="Save Changes" loading={isSaveBusy} disabled={isSaveBusy || isSubmitBusy} onPress={handleSave} />
          <Button
            label={isNegotiation ? 'Resubmit' : 'Submit to Director'}
            variant="secondary"
            loading={isSubmitBusy}
            disabled={isSaveBusy || isSubmitBusy}
            onPress={handleSubmitOrResubmit}
            className="mt-3"
          />
        </View>
      </KeyboardAvoidingView>

      <VendorPickerSheet
        visible={isPickerVisible}
        vendors={vendors ?? []}
        onSelect={(vendor) => {
          setPendingVendor(vendor);
          setIsPickerVisible(false);
        }}
        onRegisterVendor={() => setIsPickerVisible(false)}
        onClose={() => setIsPickerVisible(false)}
      />
    </Screen>
  );
}
