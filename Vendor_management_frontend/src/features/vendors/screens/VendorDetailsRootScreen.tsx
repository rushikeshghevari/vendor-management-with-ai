import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { useGetVendorByIdQuery } from '@/features/vendors/api/vendorsApi';
import type { VendorStatus } from '@/features/vendors/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VendorDetailsRoot'>;

const STATUS_LABEL: Record<VendorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blacklisted: 'Blacklisted',
};

const STATUS_VARIANT: Record<VendorStatus, 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  inactive: 'neutral',
  blacklisted: 'danger',
};

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="mt-2.5 flex-row items-start gap-2">
      <Ionicons name={icon} size={14} color="#5f5f5f" style={{ marginTop: 1 }} />
      <View className="flex-1">
        <Text className="text-[11px] text-ink-muted dark:text-slate-500">{label}</Text>
        <Text className="text-sm text-ink dark:text-slate-200">{value}</Text>
      </View>
    </View>
  );
}

/** Read-only "quick view" reachable from anywhere via a `vendor` notification tap/deep-link —
 *  for roles (Director) that have no `Vendors` tab/list screen at all, so the full,
 *  tab-nested `VendorDetailsScreen` (with its Bills/Quotations history and edit actions) isn't
 *  reachable or appropriate here. No edit/delete actions — those remain HOD/Super Admin only. */
export function VendorDetailsRootScreen({ navigation, route }: Props) {
  const { vendorId } = route.params;
  const { data: vendor, isLoading, isError } = useGetVendorByIdQuery(vendorId);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (isError || !vendor) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Vendor not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader title="Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        <DashboardCard>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-lg font-bold text-ink dark:text-white">{vendor.name}</Text>
              <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">{vendor.code}</Text>
            </View>
            <Badge label={STATUS_LABEL[vendor.status]} variant={STATUS_VARIANT[vendor.status]} />
          </View>

          <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <InfoRow icon="business-outline" label="Department" value={vendor.departmentName} />
            <InfoRow icon="pricetag-outline" label="Category" value={vendor.category} />
            <InfoRow icon="person-outline" label="Contact Person" value={vendor.contactPerson} />
            <InfoRow icon="call-outline" label="Phone" value={vendor.phone} />
            <InfoRow icon="mail-outline" label="Email" value={vendor.email} />
            {vendor.gstNumber ? <InfoRow icon="document-text-outline" label="GST Number" value={vendor.gstNumber} /> : null}
            <InfoRow icon="location-outline" label="Address" value={`${vendor.address}, ${vendor.city}, ${vendor.state}`} />
          </View>
        </DashboardCard>
      </View>
    </Screen>
  );
}
