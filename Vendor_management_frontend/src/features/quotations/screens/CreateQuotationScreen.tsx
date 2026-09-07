import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { QuotationForm } from '@/components/quotations/QuotationForm';
import { QuotationPdfUploadCard, type StagedPdfFile } from '@/components/quotations/QuotationPdfUploadCard';
import { VendorPickerSheet } from '@/components/quotations/VendorPickerSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useGetDepartmentsQuery } from '@/features/departments/api/departmentsApi';
import {
  useCreateQuotationMutation,
  useSubmitQuotationMutation,
  useUploadQuotationPdfMutation,
} from '@/features/quotations/api/quotationsApi';
import { quotationSchema, type QuotationFormValues } from '@/features/quotations/quotationSchema';
import { useGetVendorsQuery } from '@/features/vendors/api/vendorsApi';
import type { Vendor } from '@/features/vendors/types';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { DepartmentUserTabParamList, QuotationsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<QuotationsStackParamList, 'CreateQuotation'>;

export function CreateQuotationScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { data: departments } = useGetDepartmentsQuery();
  const { data: vendors, refetch: refetchVendors } = useGetVendorsQuery();
  const [createQuotation, { isLoading: isSavingDraft }] = useCreateQuotationMutation();
  const [submitQuotation, { isLoading: isSubmitting }] = useSubmitQuotationMutation();
  const [uploadPdf, { isLoading: isUploadingPdf }] = useUploadQuotationPdfMutation();

  const department = departments?.find((item) => item.id === user?.department);

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [pdfFile, setPdfFile] = useState<StagedPdfFile | null>(null);
  const [pdfError, setPdfError] = useState<string | undefined>(undefined);

  const { control, handleSubmit, setValue, reset } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    // `amount`/`gst` are zod-coerced numbers, but the field only ever renders a string —
    // seed them as strings here so the default actually shows up, not just the placeholder.
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
    if (selectedVendor) setValue('vendor', selectedVendor.id);
  }, [selectedVendor, setValue]);

  // Hand-off from Vendor registration: re-fetch so the brand-new vendor is in the cache,
  // then auto-select it — navigation params + a refetch, no global state.
  useEffect(() => {
    const autoSelectVendorId = route.params?.autoSelectVendorId;
    if (!autoSelectVendorId) return;

    (async () => {
      const result = await refetchVendors();
      const newVendor = result.data?.find((item) => item.id === autoSelectVendorId);
      if (newVendor) setSelectedVendor(newVendor);
      navigation.setParams({ autoSelectVendorId: undefined });
    })();
  }, [route.params?.autoSelectVendorId, refetchVendors, navigation]);

  const handleRegisterVendor = () => {
    setIsPickerVisible(false);
    navigation
      .getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>()
      ?.navigate('Vendors', { screen: 'AddVendor', params: { returnTo: 'quotation' } });
  };

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

  const createAndUpload = async (values: QuotationFormValues) => {
    const quotation = await createQuotation(buildPayload(values)).unwrap();
    if (pdfFile) {
      const formData = new FormData();
      formData.append('file', { uri: pdfFile.uri, name: pdfFile.name, type: pdfFile.mimeType ?? 'application/pdf' } as unknown as Blob);
      await uploadPdf({ id: quotation.id, formData }).unwrap();
    }
    return quotation;
  };

  const handleSaveDraft = handleSubmit(async (values) => {
    try {
      const quotation = await createAndUpload(values);
      reset();
      setPdfFile(null);
      setSelectedVendor(null);
      navigation.replace('QuotationDetails', { quotationId: quotation.id });
    } catch (error) {
      Alert.alert('Could Not Save Quotation', getErrorMessage(error));
    }
  });

  const handleSubmitToDirector = handleSubmit(async (values) => {
    if (!pdfFile) {
      setPdfError('A PDF is required before submitting to the Director.');
      return;
    }
    setPdfError(undefined);

    try {
      const quotation = await createAndUpload(values);
      await submitQuotation(quotation.id).unwrap();
      reset();
      setPdfFile(null);
      setSelectedVendor(null);
      navigation.replace('QuotationDetails', { quotationId: quotation.id });
    } catch (error) {
      Alert.alert('Could Not Submit Quotation', getErrorMessage(error));
    }
  });

  const isSaving = isSavingDraft || isSubmitting || isUploadingPdf;

  return (
    <Screen padded={false}>
      <AppHeader title="Create Quotation" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {!department ? (
            <Text className="mb-3 text-sm text-red-600 dark:text-red-400">
              Your account has no department assigned — contact your Super Admin before creating a quotation.
            </Text>
          ) : null}

          <QuotationForm
            control={control}
            departmentName={department?.name ?? 'No department'}
            selectedVendor={selectedVendor ? { id: selectedVendor.id, name: selectedVendor.name, code: selectedVendor.code } : null}
            onChangeVendor={() => setIsPickerVisible(true)}
            pdfSection={
              <QuotationPdfUploadCard
                value={pdfFile}
                onChange={(file) => {
                  setPdfFile(file);
                  if (file) setPdfError(undefined);
                }}
                errorMessage={pdfError}
              />
            }
          />
        </ScrollView>

        {/* Sticky footer — kept outside the ScrollView so it stays pinned regardless of scroll position. */}
        <View className="border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Button label="Save as Draft" loading={isSavingDraft || isUploadingPdf} disabled={isSaving} onPress={handleSaveDraft} />
          <Button
            label="Submit to Director"
            variant="secondary"
            loading={isSubmitting || isUploadingPdf}
            disabled={isSaving}
            onPress={handleSubmitToDirector}
            className="mt-3"
          />
        </View>
      </KeyboardAvoidingView>

      <VendorPickerSheet
        visible={isPickerVisible}
        vendors={vendors ?? []}
        onSelect={(vendor) => {
          setSelectedVendor(vendor);
          setIsPickerVisible(false);
        }}
        onRegisterVendor={handleRegisterVendor}
        onClose={() => setIsPickerVisible(false)}
      />
    </Screen>
  );
}
