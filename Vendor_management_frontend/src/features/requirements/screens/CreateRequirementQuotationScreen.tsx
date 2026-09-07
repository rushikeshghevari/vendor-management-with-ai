import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, type Control } from 'react-hook-form';
import { z } from 'zod';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { ChipSelect } from '@/components/users/ChipSelect';
import { Button } from '@/components/ui/Button';
import { FormDateField } from '@/components/ui/FormDateField';
import { FormSearchableDropdown } from '@/components/ui/FormSearchableDropdown';
import { FormTextField } from '@/components/ui/FormTextField';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import {
  useCreateRequirementQuotationMutation,
  useDeleteQuotationMutation,
  useGetQuotationByIdQuery,
  useGetRequirementQuotationsQuery,
  useRetryQuotationOcrMutation,
  useUploadRequirementQuotationAttachmentMutation,
} from '@/features/quotations/api/quotationsApi';
import { QUOTATION_PRIORITIES } from '@/features/quotations/types';
import { useGetRequirementByIdQuery, useSetPreparedQuotationMutation } from '@/features/requirements/api/requirementsApi';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/constants/roles';
import type { RequirementsStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/utils/getErrorMessage';

const requirementQuotationSchema = z.object({
  vendorName: z.string().trim().min(2, 'Vendor name is required'),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  quotationDate: z.string().min(1, 'Quotation date is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  gst: z.coerce.number().min(0).max(100),
  paymentTerms: z.string().trim().min(1, 'Payment terms are required'),
  deliveryTerms: z.string().trim().min(1, 'Delivery terms are required'),
  creditPeriod: z.coerce.number().min(0, 'Credit period is required'),
  // Optional — most quotations have no advance requirement (0). Left as an empty string in
  // the form until touched, same idiom as amount/gst above.
  advanceAmount: z.coerce.number().min(0).optional(),
  expectedDeliveryDate: z.string().optional(),
  // When the department expects to raise the PO — the real deadline for advanceAmount above.
  expectedPODate: z.string().optional(),
  priority: z.enum(QUOTATION_PRIORITIES),
  remarks: z.string().trim().optional(),
});

type RequirementQuotationFormValues = z.infer<typeof requirementQuotationSchema>;
type Props = NativeStackScreenProps<RequirementsStackParamList, 'CreateRequirementQuotation'>;

const PRIORITY_OPTIONS = QUOTATION_PRIORITIES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

// Same term set BillForm.tsx uses, for consistency across the app.
const PAYMENT_TERMS_OPTIONS = [
  { value: 'Net 30', label: 'Net 30' },
  { value: 'Net 45', label: 'Net 45' },
  { value: 'Net 60', label: 'Net 60' },
  { value: 'Immediate Payment', label: 'Immediate Payment' },
  { value: '50% Advance / 50% Delivery', label: '50% Advance / 50% Delivery' },
];

const DELIVERY_TERMS_OPTIONS = [
  { value: 'Within 1 Week', label: 'Within 1 Week' },
  { value: 'Within 2 Weeks', label: 'Within 2 Weeks' },
  { value: 'Within 3 Weeks', label: 'Within 3 Weeks' },
  { value: 'Within 1 Month', label: 'Within 1 Month' },
  { value: 'FOB Destination', label: 'FOB Destination' },
  { value: 'Ex-Works', label: 'Ex-Works' },
];

/** Placeholder values used only to create a throwaway quotation record so OCR has something
 *  to run against — the record's `temporaryVendor.name`/terms are never shown to the user and
 *  are always replaced by the real, user-approved values before Save (see `onAiSubmit`), since
 *  the backend has no endpoint to edit `temporaryVendor` on an existing quotation. */
const AI_PLACEHOLDER_VENDOR_NAME = 'Vendor (pending AI review)';

/** Common shape for an attachment picked via Camera, Gallery, or File — DocumentPicker and
 *  ImagePicker each return a differently-shaped asset, normalized to this on selection. */
interface PickedAttachment {
  uri: string;
  name: string;
  mimeType: string;
}

type EntryMode = 'choice' | 'manual' | 'ai';

function toDateInputValue(raw?: string): string | undefined {
  if (!raw) return undefined;
  // OCR-extracted dates are DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY (see quotationOcrParser.ts's
  // quotationDate regex) — parsed explicitly rather than via `new Date(raw)`, which treats
  // non-ISO dash/slash strings in an engine-dependent way and can silently produce the wrong date.
  const match = raw.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match as [string, string, string, string];
    const year = yyyy.length === 2 ? `20${yyyy}` : yyyy;
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

/** The one full quotation form, shared verbatim by Manual entry and by the AI-review step —
 *  editing a prefilled AI value goes through the exact same fields as typing one manually. */
function RequirementQuotationFormFields({ control }: { control: Control<RequirementQuotationFormValues> }) {
  // Contact Person/Phone are rarely filled in for a temporary vendor — collapsed behind a
  // toggle by default so the far more common path (just a name) doesn't scroll past them.
  const [showContactDetails, setShowContactDetails] = useState(false);

  return (
    <>
      <DashboardCard className="mb-4">
        <Text className="mb-3 text-base font-semibold text-ink dark:text-white">Temporary Vendor Information</Text>
        <FormTextField control={control} name="vendorName" label="Vendor Name" placeholder="Enter vendor name" />
        {showContactDetails ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormTextField control={control} name="contactPerson" label="Contact Person" placeholder="Optional" />
            </View>
            <View className="flex-1">
              <FormTextField control={control} name="phone" label="Phone" placeholder="Optional" keyboardType="phone-pad" />
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add contact details"
            onPress={() => setShowContactDetails(true)}
            className="mb-1 flex-row items-center gap-1.5"
          >
            <Ionicons name="add-circle-outline" size={16} color="#1e88e5" />
            <Text className="text-xs font-semibold text-primary-600">Add contact details (optional)</Text>
          </Pressable>
        )}
      </DashboardCard>

      <DashboardCard className="mb-4">
        <Text className="mb-3 text-base font-semibold text-ink dark:text-white">Quotation Information</Text>
        <FormDateField control={control} name="quotationDate" label="Quotation Date" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormTextField control={control} name="amount" label="Amount" placeholder="e.g. 50000" keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <FormTextField control={control} name="gst" label="GST (%)" placeholder="e.g. 18" keyboardType="numeric" />
          </View>
        </View>
        <FormTextField control={control} name="creditPeriod" label="Credit Period (days)" placeholder="e.g. 30" keyboardType="numeric" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormTextField
              control={control}
              name="advanceAmount"
              label="Advance Amount"
              placeholder="0 if none"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <FormDateField control={control} name="expectedPODate" label="PO Expected By" />
          </View>
        </View>
        <FormDateField control={control} name="expectedDeliveryDate" label="Expected Delivery" />
        <Controller
          control={control}
          name="priority"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <ChipSelect label="Priority" value={value} options={PRIORITY_OPTIONS} onChange={onChange} errorMessage={error?.message} />
          )}
        />
        <FormSearchableDropdown control={control} name="paymentTerms" label="Payment Terms" placeholder="Select payment terms..." options={PAYMENT_TERMS_OPTIONS} />
        <FormSearchableDropdown control={control} name="deliveryTerms" label="Delivery Terms" placeholder="Select delivery terms..." options={DELIVERY_TERMS_OPTIONS} />
        <FormTextField control={control} name="remarks" label="Remarks" placeholder="Optional" multiline numberOfLines={3} className="h-20" textAlignVertical="top" />
      </DashboardCard>
    </>
  );
}

/** Lets the department mark this quotation as their own recommended pick right at creation
 *  time, instead of only afterwards via the toggle on the requirement's quotation list —
 *  purely informational for the Director, never restricts what they can approve. */
function PreparedToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? 'Unmark as prepared' : 'Mark as your prepared quotation'}
      onPress={() => onChange(!value)}
      className={`mb-4 flex-row items-center gap-2 rounded-2xl border p-4 ${
        value
          ? 'border-success-500 bg-success-50 dark:bg-success-900/10'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <Ionicons name={value ? 'star' : 'star-outline'} size={20} color={value ? '#16a34a' : '#94a3b8'} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink dark:text-white">Mark as Prepared</Text>
        <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">
          Your own recommended pick among the collected quotations — shown to the Director as a badge only.
        </Text>
      </View>
    </Pressable>
  );
}

/** The Camera/Gallery/File picker row plus preview — reused by Manual's optional attachment
 *  card and by AI Upload's mandatory, first-and-only step. */
function AttachmentCard({
  description,
  attachment,
  isBusy,
  busyLabel,
  onPickCamera,
  onPickGallery,
  onPickDocument,
}: {
  description: string;
  attachment: PickedAttachment | null;
  isBusy: boolean;
  busyLabel: string;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onPickDocument: () => void;
}) {
  return (
    <DashboardCard className="mb-4">
      <Text className="text-sm font-semibold text-ink dark:text-white">Attachment</Text>
      <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">{description}</Text>
      <View className="mt-3 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a photo of the quotation"
          onPress={onPickCamera}
          className="flex-1 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-4 dark:border-slate-600"
        >
          <Ionicons name="camera-outline" size={20} color="#1e88e5" />
          <Text className="text-xs font-semibold text-primary-600">Camera</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose an image from the gallery"
          onPress={onPickGallery}
          className="flex-1 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-4 dark:border-slate-600"
        >
          <Ionicons name="images-outline" size={20} color="#1e88e5" />
          <Text className="text-xs font-semibold text-primary-600">Gallery</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select a file"
          onPress={onPickDocument}
          className="flex-1 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-4 dark:border-slate-600"
        >
          <Ionicons name="document-attach-outline" size={20} color="#1e88e5" />
          <Text className="text-xs font-semibold text-primary-600">File</Text>
        </Pressable>
      </View>
      {attachment ? (
        <View className="mt-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
          <Text className="text-sm font-semibold text-ink dark:text-white">{attachment.name}</Text>
          <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">{attachment.mimeType}</Text>
        </View>
      ) : null}
      {isBusy ? (
        <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-primary-50 p-3 dark:bg-primary-900/20">
          <ActivityIndicator size="small" />
          <Text className="text-xs font-medium text-primary-700 dark:text-primary-300">{busyLabel}</Text>
        </View>
      ) : null}
    </DashboardCard>
  );
}

export function CreateRequirementQuotationScreen({ navigation, route }: Props) {
  const { requirementId } = route.params;
  const { hasRole } = useAuth();
  const canMarkPrepared = hasRole(ROLES.DEPARTMENT_USER) || hasRole(ROLES.HOD) || hasRole(ROLES.SUPER_ADMIN);
  const { data: requirement } = useGetRequirementByIdQuery(requirementId);
  const { data: requirementQuotations } = useGetRequirementQuotationsQuery(requirementId);
  const [createRequirementQuotation, { isLoading: isSaving }] = useCreateRequirementQuotationMutation();
  const [uploadAttachment, { isLoading: isUploading }] = useUploadRequirementQuotationAttachmentMutation();
  const [retryOcr, { isLoading: isRetryingPreviewOcr }] = useRetryQuotationOcrMutation();
  const [deleteQuotation] = useDeleteQuotationMutation();
  const [setPreparedQuotation] = useSetPreparedQuotationMutation();

  const [mode, setMode] = useState<EntryMode>('choice');
  const [attachment, setAttachment] = useState<PickedAttachment | null>(null);
  const [markPrepared, setMarkPrepared] = useState(false);

  // AI Upload mode needs an existing quotationId before an attachment/OCR can happen at all
  // (the upload endpoint is scoped to `/requirements/:id/quotations/:quotationId/attachments`),
  // so a throwaway "preview" quotation is created purely to extract structured data. It's
  // discarded once the real, user-approved quotation is created at Save — see `onAiSubmit`.
  const [previewQuotationId, setPreviewQuotationId] = useState<string | null>(null);
  const [previewPollingInterval, setPreviewPollingInterval] = useState(0);
  const { data: previewQuotation } = useGetQuotationByIdQuery(previewQuotationId ?? '', {
    skip: !previewQuotationId,
    pollingInterval: previewPollingInterval,
  });
  const previewOcr = previewQuotation?.ocr;
  const previewOcrStatus = previewOcr?.status ?? 'not_started';

  useEffect(() => {
    setPreviewPollingInterval(previewQuotationId && previewOcrStatus !== 'completed' && previewOcrStatus !== 'failed' ? 3000 : 0);
  }, [previewQuotationId, previewOcrStatus]);

  const nextQuotationCount = useMemo(() => (requirementQuotations?.length ?? 0) + 1, [requirementQuotations]);

  const { control, handleSubmit, reset } = useForm<RequirementQuotationFormValues>({
    resolver: zodResolver(requirementQuotationSchema),
    defaultValues: {
      vendorName: '',
      contactPerson: '',
      phone: '',
      quotationDate: new Date().toISOString().slice(0, 10),
      amount: '' as unknown as number,
      gst: '18' as unknown as number,
      paymentTerms: '',
      deliveryTerms: '',
      creditPeriod: '' as unknown as number,
      advanceAmount: '' as unknown as number,
      expectedDeliveryDate: '',
      expectedPODate: '',
      priority: requirement?.priority ?? 'medium',
      remarks: '',
    },
  });

  // Once OCR completes on the preview record, prefill the same form Manual mode uses.
  // paymentTerms/deliveryTerms are deliberately left blank — OCR never extracts them (see
  // Phase 3 docs), so the required-field validation forces the user to confirm those, same
  // as it always has in Manual mode.
  useEffect(() => {
    if (previewOcrStatus === 'completed' && previewOcr?.structuredData) {
      const sd = previewOcr.structuredData;
      reset({
        vendorName: sd.vendorName?.trim() || AI_PLACEHOLDER_VENDOR_NAME,
        contactPerson: '',
        phone: '',
        quotationDate: toDateInputValue(sd.quotationDate) ?? new Date().toISOString().slice(0, 10),
        amount: String(sd.grandTotal ?? sd.subtotal ?? '') as unknown as number,
        gst: '18' as unknown as number,
        paymentTerms: '',
        deliveryTerms: '',
        creditPeriod: '' as unknown as number,
        advanceAmount: '' as unknown as number,
        expectedDeliveryDate: '',
        expectedPODate: '',
        priority: requirement?.priority ?? 'medium',
        remarks: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOcrStatus, previewOcr?.completedAt]);

  const pickFromDocuments = async (onPicked: (asset: PickedAttachment) => void) => {
    const result = await DocumentPicker.getDocumentAsync({ type: [...ATTACHMENT_TYPES] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    onPicked({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
  };

  const pickFromGallery = async (onPicked: (asset: PickedAttachment) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Allow photo library access to select an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    onPicked({
      uri: asset.uri,
      name: asset.fileName ?? `gallery-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const pickFromCamera = async (onPicked: (asset: PickedAttachment) => void) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Allow camera access to photograph the quotation.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    onPicked({
      uri: asset.uri,
      name: asset.fileName ?? `camera-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const buildQuotationBody = (values: RequirementQuotationFormValues) => ({
    temporaryVendor: {
      name: values.vendorName,
      contactPerson: values.contactPerson || undefined,
      phone: values.phone || undefined,
    },
    quotationDate: values.quotationDate,
    amount: values.amount,
    gst: values.gst,
    paymentTerms: values.paymentTerms,
    deliveryTerms: values.deliveryTerms,
    creditPeriod: values.creditPeriod,
    advanceAmount: values.advanceAmount || undefined,
    expectedDeliveryDate: values.expectedDeliveryDate || undefined,
    expectedPODate: values.expectedPODate || undefined,
    priority: values.priority,
    remarks: values.remarks || undefined,
  });

  const createAndUploadQuotation = async (values: RequirementQuotationFormValues, file: PickedAttachment) => {
    const quotation = await createRequirementQuotation({ requirementId, body: buildQuotationBody(values) }).unwrap();
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    await uploadAttachment({ requirementId, quotationId: quotation.id, formData }).unwrap();
    return quotation;
  };

  const discardPreview = () => {
    if (previewQuotationId) {
      deleteQuotation(previewQuotationId).catch(() => {});
    }
    setPreviewQuotationId(null);
  };

  const handleAiAttachmentPicked = async (picked: PickedAttachment) => {
    setAttachment(picked);
    try {
      const placeholder = await createRequirementQuotation({
        requirementId,
        body: {
          temporaryVendor: { name: AI_PLACEHOLDER_VENDOR_NAME },
          quotationDate: new Date().toISOString().slice(0, 10),
          amount: 1,
          gst: 0,
          paymentTerms: 'Pending review',
          deliveryTerms: 'Pending review',
          creditPeriod: 0,
          priority: requirement?.priority ?? 'medium',
        },
      }).unwrap();

      const formData = new FormData();
      formData.append('file', { uri: picked.uri, name: picked.name, type: picked.mimeType } as unknown as Blob);
      await uploadAttachment({ requirementId, quotationId: placeholder.id, formData }).unwrap();

      setPreviewQuotationId(placeholder.id);
    } catch (error) {
      Alert.alert('Could Not Start AI Upload', getErrorMessage(error));
      setAttachment(null);
    }
  };

  const handleRetryPreviewOcr = async () => {
    if (!previewQuotationId) return;
    try {
      await retryOcr({ requirementId, quotationId: previewQuotationId }).unwrap();
    } catch (error) {
      Alert.alert('Could Not Retry OCR', getErrorMessage(error));
    }
  };

  const handleStartOver = () => {
    discardPreview();
    setAttachment(null);
  };

  const handleBack = () => {
    if (mode === 'choice') {
      navigation.goBack();
      return;
    }
    if (mode === 'ai') {
      discardPreview();
      setAttachment(null);
    }
    setMode('choice');
  };

  const onManualSubmit = handleSubmit(async (values) => {
    if (!attachment) {
      Alert.alert('Attachment Required', 'Attach a PDF or image before saving this quotation.');
      return;
    }
    try {
      const quotation = await createAndUploadQuotation(values, attachment);
      if (markPrepared) {
        await setPreparedQuotation({ requirementId, quotationId: quotation.id, prepared: true }).catch(() => null);
      }
      // OCR starts automatically in the background as soon as the upload lands — jump
      // straight to the result screen so the user sees it settle instead of an extra tap.
      navigation.replace('QuotationOcrResult', { requirementId, quotationId: quotation.id });
    } catch (error) {
      Alert.alert('Could Not Save Quotation', getErrorMessage(error));
    }
  });

  // Commits the real quotation with the user's reviewed/edited values (mirrors Manual mode's
  // onSubmit exactly), then best-effort deletes the throwaway preview record — the backend
  // has no endpoint to edit temporaryVendor on the preview record in place, so a fresh
  // create is the only way to persist a corrected vendor name.
  const onAiSubmit = handleSubmit(async (values) => {
    if (!attachment) return;
    try {
      const quotation = await createAndUploadQuotation(values, attachment);
      if (previewQuotationId) {
        deleteQuotation(previewQuotationId).catch(() => {});
      }
      if (markPrepared) {
        await setPreparedQuotation({ requirementId, quotationId: quotation.id, prepared: true }).catch(() => null);
      }
      navigation.replace('QuotationOcrResult', { requirementId, quotationId: quotation.id });
    } catch (error) {
      Alert.alert('Could Not Save Quotation', getErrorMessage(error));
    }
  });

  const aiStage: 'pick' | 'processing' | 'failed' | 'review' = !previewQuotationId
    ? 'pick'
    : previewOcrStatus === 'completed'
      ? 'review'
      : previewOcrStatus === 'failed'
        ? 'failed'
        : 'processing';

  return (
    <Screen padded={false}>
      <AppHeader title="Add Quotation" leftIcon="arrow-back" onLeftPress={handleBack} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 24 }}>
          <DashboardCard className="mb-4">
            <Text className="text-base font-semibold text-ink dark:text-white">Requirement</Text>
            <Text className="mt-1 text-sm text-ink-muted dark:text-slate-400">{requirement?.requirementNumber ?? 'Loading...'}</Text>
            <Text className="mt-1 text-base text-ink dark:text-slate-200">{requirement?.title ?? 'Preparing form...'}</Text>
            {requirement?.items?.length ? (
              <View className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                {requirement.items.map((item, index) => (
                  <Text key={`${item.itemName}-${index}`} className="text-sm text-ink-muted dark:text-slate-400">
                    {item.itemName} — Qty: {item.quantity} {item.unit}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text className="mt-3 text-sm text-ink-muted dark:text-slate-400">Quotation #{nextQuotationCount} for this requirement</Text>
          </DashboardCard>

          {mode === 'choice' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manual Entry"
                onPress={() => setMode('manual')}
                className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-primary-50 p-3 dark:bg-primary-900/30">
                    <Ionicons name="create-outline" size={22} color="#1e88e5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-ink dark:text-white">Manual Entry</Text>
                    <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
                      Type in vendor and item details yourself
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="AI Upload"
                onPress={() => setMode('ai')}
                className="mb-4 rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900/50 dark:bg-primary-900/10"
              >
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-primary-100 p-3 dark:bg-primary-900/40">
                    <Ionicons name="sparkles-outline" size={22} color="#1e88e5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-ink dark:text-white">AI Upload</Text>
                    <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
                      Just upload the quotation document — AI reads the details for you
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
              </Pressable>
            </>
          ) : null}

          {mode === 'manual' ? (
            <>
              <RequirementQuotationFormFields control={control} />
              {canMarkPrepared ? <PreparedToggle value={markPrepared} onChange={setMarkPrepared} /> : null}
              <AttachmentCard
                description="Capture a photo, pick from your gallery, or attach a PDF, PNG, or JPG file."
                attachment={attachment}
                isBusy={isUploading}
                busyLabel="Uploading attachment..."
                onPickCamera={() => pickFromCamera(setAttachment)}
                onPickGallery={() => pickFromGallery(setAttachment)}
                onPickDocument={() => pickFromDocuments(setAttachment)}
              />
            </>
          ) : null}

          {mode === 'ai' && aiStage === 'pick' ? (
            <AttachmentCard
              description="Upload the quotation document — AI will read the vendor and item details for you."
              attachment={attachment}
              isBusy={isSaving || isUploading}
              busyLabel="Preparing AI upload..."
              onPickCamera={() => pickFromCamera(handleAiAttachmentPicked)}
              onPickGallery={() => pickFromGallery(handleAiAttachmentPicked)}
              onPickDocument={() => pickFromDocuments(handleAiAttachmentPicked)}
            />
          ) : null}

          {mode === 'ai' && aiStage === 'processing' ? (
            <DashboardCard className="mb-4 items-center py-8">
              <Badge label="OCR Processing…" variant="primary" />
              <View className="mt-4">
                <Loader label="Extracting quotation data — this can take up to a minute..." />
              </View>
            </DashboardCard>
          ) : null}

          {mode === 'ai' && aiStage === 'failed' ? (
            <DashboardCard className="mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
                <Text className="text-sm font-semibold text-red-600 dark:text-red-400">OCR Failed</Text>
              </View>
              <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
                {previewOcr?.error ?? 'Something went wrong while extracting data from this attachment.'}
              </Text>
              <Button label="Retry OCR" loading={isRetryingPreviewOcr} onPress={handleRetryPreviewOcr} className="mt-4" />
              <Button label="Start Over With A Different File" variant="secondary" onPress={handleStartOver} className="mt-2" />
            </DashboardCard>
          ) : null}

          {mode === 'ai' && aiStage === 'review' ? (
            <>
              <DashboardCard className="mb-4 border border-primary-100 dark:border-primary-900/40">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="sparkles-outline" size={18} color="#1e88e5" />
                  <Text className="text-sm font-semibold text-ink dark:text-slate-200">AI read this — please verify</Text>
                </View>
                <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">
                  Fields below were pre-filled from the uploaded document. Review and correct anything before saving.
                </Text>
                {previewOcr?.provider ? (
                  <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">
                    Provider: {previewOcr.provider} {previewOcr.confidence !== undefined ? `· Confidence: ${previewOcr.confidence}%` : ''}
                  </Text>
                ) : null}
              </DashboardCard>
              <RequirementQuotationFormFields control={control} />
              {canMarkPrepared ? <PreparedToggle value={markPrepared} onChange={setMarkPrepared} /> : null}
              <Pressable accessibilityRole="button" onPress={handleStartOver} className="mb-4 items-center">
                <Text className="text-xs font-semibold text-primary-600">Start Over With A Different File</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>

        {mode === 'manual' || (mode === 'ai' && aiStage === 'review') ? (
          <View className="border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <Button
              label={isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Save Quotation'}
              loading={isSaving || isUploading}
              onPress={mode === 'manual' ? onManualSubmit : onAiSubmit}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}
