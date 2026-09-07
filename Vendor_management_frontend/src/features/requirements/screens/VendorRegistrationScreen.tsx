import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { VendorForm } from '@/components/vendors/VendorForm';
import { VendorDocumentPicker, type StagedDocument } from '@/components/requirements/VendorDocumentPicker';
import { ROLES } from '@/constants/roles';
import { useGetDirectorReviewQuery } from '@/features/directorReview/api/directorReviewApi';
import { useGetRegisteredVendorQuery, useRegisterVendorMutation } from '@/features/vendorRegistration/api/vendorRegistrationApi';
import type { VendorFormValues } from '@/features/vendors/vendorSchema';
import { useAuth } from '@/hooks/useAuth';
import type { RequirementsStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/utils/getErrorMessage';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'VendorRegistration'>;

// Phase 6 spec calls these out as five named screens (Vendor Registration Screen / Vendor
// Details Form / Document Upload / Review Screen / Registration Success Screen). This
// codebase's convention for a linear create flow is one screen with a form (see
// CreateRequirementScreen/CreateQuotationScreen) rather than a chain of stack routes for a
// single action, so all five are steps of one screen here — same information, one navigator
// entry, consistent with every other "create X" flow in the app.
type Step = 'details' | 'documents' | 'review' | 'success';
const STEPS: { key: Step; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'documents', label: 'Documents' },
  { key: 'review', label: 'Review' },
  { key: 'success', label: 'Done' },
];

interface StagedDocuments {
  gstCertificate: StagedDocument | null;
  panCard: StagedDocument | null;
  cancelledCheque: StagedDocument | null;
  msmeCertificate: StagedDocument | null;
}

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <View className="flex-row items-center gap-2 px-4 pb-3 pt-1">
      {STEPS.map((s, index) => (
        <View key={s.key} className="flex-1 flex-row items-center gap-2">
          <View
            className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        </View>
      ))}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-t border-slate-100 py-2.5 dark:border-slate-800">
      <Text className="text-sm text-ink-muted dark:text-slate-400">{label}</Text>
      <Text className="max-w-[58%] text-right text-sm font-medium text-ink dark:text-slate-200">{value}</Text>
    </View>
  );
}

export function VendorRegistrationScreen({ navigation, route }: Props) {
  const { requirementId } = route.params;
  const { hasRole } = useAuth();
  const isDepartmentUser = hasRole(ROLES.DEPARTMENT_USER);
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const canRegister = isDepartmentUser || isSuperAdmin;

  const [step, setStep] = useState<Step>('details');
  const [formValues, setFormValues] = useState<VendorFormValues | null>(null);
  const [documents, setDocuments] = useState<StagedDocuments>({
    gstCertificate: null,
    panCard: null,
    cancelledCheque: null,
    msmeCertificate: null,
  });

  const { data: reviewPackage, isLoading: isLoadingPackage } = useGetDirectorReviewQuery(requirementId);
  const { data: existingVendor, isLoading: isLoadingVendor, error: vendorError } = useGetRegisteredVendorQuery(requirementId);
  const [registerVendor, { isLoading: isRegistering }] = useRegisterVendorMutation();

  // A 404 here just means "nothing registered yet" — the normal starting state, not a
  // broken query.
  const vendorNotFound = (vendorError as { status?: number } | undefined)?.status === 404;

  const winningQuotation = useMemo(() => {
    if (!reviewPackage) return undefined;
    const winningId = reviewPackage.comparison?.recommendation.quotationId;
    return reviewPackage.quotations.find((q) => q.id === winningId) ?? reviewPackage.quotations[0];
  }, [reviewPackage]);

  const prefill = useMemo((): Partial<VendorFormValues> | undefined => {
    if (!winningQuotation) return undefined;
    const temp = winningQuotation.temporaryVendor;
    return {
      name: temp?.name ?? winningQuotation.vendorName ?? '',
      contactPerson: temp?.contactPerson ?? '',
      phone: temp?.phone ?? '',
      email: temp?.email ?? '',
      address: temp?.address ?? '',
    };
  }, [winningQuotation]);

  const handleRegister = async () => {
    if (!formValues) return;
    const formData = new FormData();
    const textFields: Record<string, string | undefined> = {
      name: formValues.name,
      contactPerson: formValues.contactPerson,
      phone: formValues.phone,
      email: formValues.email,
      gstNumber: formValues.gstNumber || undefined,
      panNumber: formValues.panNumber || undefined,
      address: formValues.address,
      state: formValues.state,
      district: formValues.district,
      city: formValues.city,
      pincode: formValues.pincode,
      bankName: formValues.bankName,
      accountHolderName: formValues.accountHolderName,
      accountNumber: formValues.accountNumber,
      ifscCode: formValues.ifscCode,
      upiId: formValues.upiId || undefined,
      category: formValues.category,
    };
    for (const [key, value] of Object.entries(textFields)) {
      if (value) formData.append(key, value);
    }

    const fileFields: Array<[string, StagedDocument | null]> = [
      ['gstCertificate', documents.gstCertificate],
      ['panCard', documents.panCard],
      ['cancelledCheque', documents.cancelledCheque],
      ['msmeCertificate', documents.msmeCertificate],
    ];
    for (const [field, file] of fileFields) {
      if (file) {
        formData.append(field, { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
      }
    }

    try {
      await registerVendor({ requirementId, formData }).unwrap();
      setStep('success');
    } catch (error) {
      Alert.alert('Could Not Register Vendor', getErrorMessage(error));
    }
  };

  if (isLoadingPackage || isLoadingVendor) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Registration" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!reviewPackage) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Registration" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="business-outline" size={48} color="#94a3b8" />
          <Text className="mt-3 text-center text-base font-medium text-ink-muted dark:text-slate-400">
            Vendor registration isn't available yet.
          </Text>
        </View>
      </Screen>
    );
  }

  const { requirement } = reviewPackage;
  const isApproved = requirement.status === 'approved';
  const isFinalized = requirement.status === 'vendor_finalized';

  // Already registered — show the result regardless of local wizard state (e.g. revisiting
  // this screen after a previous successful registration).
  const showSuccess = step === 'success' || (!vendorNotFound && !!existingVendor);

  if (showSuccess && existingVendor) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Registration" leftIcon="arrow-back" onLeftPress={() => navigation.navigate('RequirementDetails', { requirementId })} />
        <ScrollView className="flex-1 bg-surface-muted px-4 pt-6 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 48 }}>
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/30">
              <Ionicons name="checkmark-circle" size={40} color="#43a047" />
            </View>
            <Text className="mt-4 text-lg font-bold text-ink dark:text-white">Vendor Registered</Text>
            <Text className="mt-1 text-center text-sm text-ink-muted dark:text-slate-400">
              {existingVendor.name} is ready — the requirement has moved on to Purchase Order.
            </Text>
          </View>

          <DashboardCard className="mt-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">Vendor Code</Text>
              <Badge label={existingVendor.code} variant="primary" />
            </View>
            <DetailRow label="Company Name" value={existingVendor.name} />
            <DetailRow label="Contact Person" value={existingVendor.contactPerson} />
            <DetailRow label="Email" value={existingVendor.email} />
            <DetailRow label="Phone" value={existingVendor.phone} />
            <DetailRow
              label="Registration Status"
              value={existingVendor.registrationStatus === 'registered' ? 'Registered' : 'Pending Documents'}
            />
            {existingVendor.approvedByDirectorName ? (
              <DetailRow label="Approved By" value={existingVendor.approvedByDirectorName} />
            ) : null}
          </DashboardCard>

          <Button
            label="Back to Requirement"
            variant="secondary"
            className="mt-6"
            onPress={() => navigation.navigate('RequirementDetails', { requirementId })}
          />
        </ScrollView>
      </Screen>
    );
  }

  if (!isApproved && !isFinalized) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Registration" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="lock-closed-outline" size={48} color="#94a3b8" />
          <Text className="mt-3 text-center text-base font-medium text-ink-muted dark:text-slate-400">
            Vendor registration unlocks once this requirement has been approved by a Director.
          </Text>
        </View>
      </Screen>
    );
  }

  if (!canRegister) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Registration" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="eye-outline" size={48} color="#94a3b8" />
          <Text className="mt-3 text-center text-base font-medium text-ink-muted dark:text-slate-400">
            Read only — only the requesting Department User or a Super Admin can register a vendor.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader title="Vendor Registration" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <StepIndicator current={step} />

      {step === 'details' ? (
        <ScrollView className="flex-1 bg-surface-muted px-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <DashboardCard className="mb-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Winning Quotation</Text>
            <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
              {reviewPackage.comparison
                ? reviewPackage.comparison.recommendation.reason
                : 'This is the quotation the Director selected and approved — review it below and adjust as needed before registering.'}
            </Text>
          </DashboardCard>
          <VendorForm
            departmentName={requirement.departmentName}
            defaultValues={prefill}
            submitLabel="Next: Upload Documents"
            isSubmitting={false}
            onSubmit={(values) => {
              setFormValues(values);
              setStep('documents');
            }}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      ) : null}

      {step === 'documents' ? (
        <ScrollView className="flex-1 bg-surface-muted px-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 48 }}>
          <DashboardCard>
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Supporting Documents</Text>
            <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">
              GST Certificate, PAN Card, and a Cancelled Cheque mark this vendor as fully Registered. MSME Certificate is optional.
            </Text>
            <VendorDocumentPicker
              label="GST Certificate"
              value={documents.gstCertificate}
              onChange={(file) => setDocuments((d) => ({ ...d, gstCertificate: file }))}
            />
            <VendorDocumentPicker
              label="PAN Card"
              value={documents.panCard}
              onChange={(file) => setDocuments((d) => ({ ...d, panCard: file }))}
            />
            <VendorDocumentPicker
              label="Cancelled Cheque"
              value={documents.cancelledCheque}
              onChange={(file) => setDocuments((d) => ({ ...d, cancelledCheque: file }))}
            />
            <VendorDocumentPicker
              label="MSME Certificate"
              optional
              value={documents.msmeCertificate}
              onChange={(file) => setDocuments((d) => ({ ...d, msmeCertificate: file }))}
            />
          </DashboardCard>

          <View className="mt-4 flex-row gap-3">
            <Button label="Back" variant="secondary" className="flex-1" onPress={() => setStep('details')} />
            <Button label="Next: Review" className="flex-1" onPress={() => setStep('review')} />
          </View>
        </ScrollView>
      ) : null}

      {step === 'review' && formValues ? (
        <ScrollView className="flex-1 bg-surface-muted px-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 48 }}>
          <DashboardCard>
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Vendor Details</Text>
            <DetailRow label="Company Name" value={formValues.name} />
            <DetailRow label="Contact Person" value={formValues.contactPerson} />
            <DetailRow label="Phone" value={formValues.phone} />
            <DetailRow label="Email" value={formValues.email} />
            {formValues.gstNumber ? <DetailRow label="GST Number" value={formValues.gstNumber} /> : null}
            {formValues.panNumber ? <DetailRow label="PAN Number" value={formValues.panNumber} /> : null}
            <DetailRow label="Address" value={formValues.address} />
            <DetailRow label="City / State" value={`${formValues.city}, ${formValues.state}`} />
            <DetailRow label="Pincode" value={formValues.pincode} />
            <DetailRow label="Bank" value={`${formValues.bankName} · ${formValues.accountNumber}`} />
            <DetailRow label="IFSC" value={formValues.ifscCode} />
          </DashboardCard>

          <DashboardCard className="mt-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Documents</Text>
            <DetailRow label="GST Certificate" value={documents.gstCertificate ? 'Attached' : 'Not attached'} />
            <DetailRow label="PAN Card" value={documents.panCard ? 'Attached' : 'Not attached'} />
            <DetailRow label="Cancelled Cheque" value={documents.cancelledCheque ? 'Attached' : 'Not attached'} />
            <DetailRow label="MSME Certificate" value={documents.msmeCertificate ? 'Attached' : 'Not provided'} />
          </DashboardCard>

          <View className="mt-4 flex-row gap-3">
            <Button label="Back" variant="secondary" className="flex-1" onPress={() => setStep('documents')} />
            <Button label="Confirm & Register" loading={isRegistering} className="flex-1" onPress={handleRegister} />
          </View>
        </ScrollView>
      ) : null}
    </Screen>
  );
}
