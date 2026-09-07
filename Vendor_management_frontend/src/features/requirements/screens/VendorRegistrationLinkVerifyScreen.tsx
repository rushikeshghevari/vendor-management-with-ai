import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import {
  useGetVendorRegistrationLinkStatusQuery,
  useVerifyVendorRegistrationLinkMutation,
} from '@/features/vendorRegistrationLink/api/vendorRegistrationLinkApi';
import { useAuth } from '@/hooks/useAuth';
import type { RequirementsStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/utils/getErrorMessage';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'VendorRegistrationLinkVerify'>;

const DOCUMENT_LABELS: Record<string, string> = {
  gst_certificate: 'GST Certificate',
  pan_card: 'PAN Card',
  cancelled_cheque: 'Cancelled Cheque',
  msme_certificate: 'MSME Certificate',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-t border-slate-100 py-2.5 dark:border-slate-800">
      <Text className="text-sm text-ink-muted dark:text-slate-400">{label}</Text>
      <Text className="max-w-[58%] text-right text-sm font-medium text-ink dark:text-slate-200">{value}</Text>
    </View>
  );
}

// Same "review-only" list-of-fields convention Phase 6's wizard uses for its own Review step
// (VendorRegistrationScreen.tsx) rather than reusing VendorForm in a read-only mode it was
// never built to support.
export function VendorRegistrationLinkVerifyScreen({ navigation, route }: Props) {
  const { requirementId } = route.params;
  const { hasRole } = useAuth();
  const canVerify = hasRole(ROLES.DEPARTMENT_USER) || hasRole(ROLES.HOD) || hasRole(ROLES.SUPER_ADMIN);

  const { data: link, isLoading } = useGetVendorRegistrationLinkStatusQuery(requirementId);
  const [verifyLink, { isLoading: isVerifying }] = useVerifyVendorRegistrationLinkMutation();

  const handleVerify = () => {
    Alert.alert('Verify & Finalize', 'This will create the Vendor record from the submitted details. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify & Finalize',
        onPress: async () => {
          try {
            await verifyLink(requirementId).unwrap();
            Alert.alert('Vendor Registered', 'The vendor record has been created from this submission.', [
              { text: 'OK', onPress: () => navigation.navigate('RequirementDetails', { requirementId }) },
            ]);
          } catch (error) {
            Alert.alert('Could Not Verify', getErrorMessage(error));
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Verify Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!link || link.status !== 'submitted' || !link.submittedData) {
    return (
      <Screen padded={false}>
        <AppHeader title="Verify Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="hourglass-outline" size={48} color="#94a3b8" />
          <Text className="mt-3 text-center text-base font-medium text-ink-muted dark:text-slate-400">
            Nothing is awaiting verification for this requirement yet.
          </Text>
        </View>
      </Screen>
    );
  }

  const data = link.submittedData;

  return (
    <Screen padded={false}>
      <AppHeader title="Verify Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 48 }}>
        <DashboardCard>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Vendor's Own Submission</Text>
            <Badge label="Awaiting Verification" variant="primary" />
          </View>
          <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
            Submitted directly by the vendor via the public registration link — review carefully before finalizing.
          </Text>
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Company Details</Text>
          <DetailRow label="Company Name" value={data.name} />
          <DetailRow label="Contact Person" value={data.contactPerson} />
          <DetailRow label="Phone" value={data.phone} />
          <DetailRow label="Email" value={data.email} />
          {data.gstNumber ? <DetailRow label="GST Number" value={data.gstNumber} /> : null}
          {data.panNumber ? <DetailRow label="PAN Number" value={data.panNumber} /> : null}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Address</Text>
          <DetailRow label="Address" value={data.address} />
          <DetailRow label="City / State" value={`${data.city}, ${data.state}`} />
          <DetailRow label="District" value={data.district} />
          <DetailRow label="Pincode" value={data.pincode} />
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Bank Details</Text>
          <DetailRow label="Bank" value={`${data.bankName} · ${data.accountNumber}`} />
          <DetailRow label="Account Holder" value={data.accountHolderName} />
          <DetailRow label="IFSC" value={data.ifscCode} />
          {data.upiId ? <DetailRow label="UPI ID" value={data.upiId} /> : null}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Documents ({link.submittedDocuments.length})</Text>
          {link.submittedDocuments.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No documents were attached.</Text>
          ) : (
            link.submittedDocuments.map((doc, index) => (
              <DetailRow key={`${doc.type}-${index}`} label={DOCUMENT_LABELS[doc.type] ?? doc.type} value={doc.fileName} />
            ))
          )}
        </DashboardCard>

        {canVerify ? (
          <Button label="Verify & Finalize" loading={isVerifying} className="mt-5" onPress={handleVerify} />
        ) : (
          <Text className="mt-5 text-center text-sm text-ink-muted dark:text-slate-400">
            Read only — only the requesting Department User, HOD, or a Super Admin can verify this submission.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
