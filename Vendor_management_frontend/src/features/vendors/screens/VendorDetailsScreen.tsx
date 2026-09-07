import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useGetBillsQuery } from '@/features/bills/api/billsApi';
import { useGetQuotationsQuery } from '@/features/quotations/api/quotationsApi';
import { useDeleteVendorMutation, useGetVendorsQuery, useSetVendorStatusMutation } from '@/features/vendors/api/vendorsApi';
import type { VendorStatus } from '@/features/vendors/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { DepartmentUserTabParamList, VendorsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<VendorsStackParamList, 'VendorDetails'>;

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

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

export function VendorDetailsScreen({ navigation, route }: Props) {
  const { vendorId } = route.params;
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: vendors, isLoading } = useGetVendorsQuery();
  const { data: quotations } = useGetQuotationsQuery();
  const { data: bills } = useGetBillsQuery();
  const [setVendorStatus, { isLoading: isUpdatingStatus }] = useSetVendorStatusMutation();
  const [deleteVendor] = useDeleteVendorMutation();

  const vendor = vendors?.find((item) => item.id === vendorId);
  const vendorQuotations = (quotations ?? []).filter((item) => item.vendorId === vendorId);
  const vendorBills = (bills ?? []).filter((item) => item.vendorId === vendorId);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!vendor) {
    return (
      <Screen padded={false}>
        <AppHeader title="Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Vendor not found.</Text>
      </Screen>
    );
  }

  const handleSetStatus = async (status: VendorStatus) => {
    try {
      await setVendorStatus({ id: vendor.id, status }).unwrap();
    } catch (error) {
      Alert.alert('Could Not Update Status', getErrorMessage(error));
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Vendor', `"${vendor.name}" will be marked Inactive — the record is kept for audit history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteVendor(vendor.id).unwrap();
            navigation.goBack();
          } catch (error) {
            Alert.alert('Could Not Delete Vendor', getErrorMessage(error));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Vendor Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard>
          <View className="flex-row items-start justify-between">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
              <Ionicons name="storefront" size={26} color="#1e88e5" />
            </View>
            <Badge label={STATUS_LABEL[vendor.status]} variant={STATUS_VARIANT[vendor.status]} />
          </View>

          <Text className="mt-3 text-xl font-bold text-ink dark:text-white">{vendor.name}</Text>
          <Text className="mt-0.5 text-sm font-semibold text-primary-600">{vendor.code}</Text>

          <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <InfoRow icon="business-outline" label="Department" value={vendor.departmentName || '—'} />
            <InfoRow icon="pricetag-outline" label="Category" value={vendor.category} />
            <InfoRow icon="person-outline" label="Contact Person" value={vendor.contactPerson} />
            <InfoRow icon="call-outline" label="Mobile" value={vendor.phone} />
            <InfoRow icon="mail-outline" label="Email" value={vendor.email} />
            <InfoRow icon="document-text-outline" label="GST Number" value={vendor.gstNumber ?? 'Not provided'} />
            <InfoRow icon="card-outline" label="PAN Number" value={vendor.panNumber ?? 'Not provided'} />
            <InfoRow
              icon="location-outline"
              label="Address"
              value={`${vendor.address}, ${vendor.city}, ${vendor.district}, ${vendor.state} - ${vendor.pincode}`}
            />
          </View>

          <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Text className="text-xs font-semibold text-ink-muted dark:text-slate-400">Bank Details</Text>
            <InfoRow icon="business-outline" label="Bank Name" value={vendor.bankDetails.bankName} />
            <InfoRow icon="person-outline" label="Account Holder" value={vendor.bankDetails.accountHolderName} />
            <InfoRow icon="card-outline" label="Account Number" value={vendor.bankDetails.accountNumber} />
            <InfoRow icon="key-outline" label="IFSC Code" value={vendor.bankDetails.ifscCode} />
            <InfoRow icon="phone-portrait-outline" label="UPI ID" value={vendor.bankDetails.upiId ?? 'Not provided'} />
          </View>

          <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="person-circle-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">By {vendor.createdByName || '—'}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">Created {formatDate(vendor.createdAt)}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">Updated {formatDate(vendor.updatedAt)}</Text>
            </View>
          </View>
        </DashboardCard>

        <DashboardCard className="mt-4">
          <SectionHeader title="Quotation History" />
          {vendorQuotations.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No quotations for this vendor yet.</Text>
          ) : (
            vendorQuotations.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() =>
                  navigation
                    .getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>()
                    ?.navigate('Quotations', { screen: 'QuotationDetails', params: { quotationId: item.id } })
                }
                className="mt-2 flex-row items-center justify-between border-t border-slate-100 pt-2 first:border-t-0 first:pt-0 dark:border-slate-800"
              >
                <Text className="text-sm font-semibold text-ink dark:text-white">{item.quotationCode}</Text>
                <Badge label={item.status} variant="neutral" />
              </Pressable>
            ))
          )}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <SectionHeader title="Bill History" />
          {vendorBills.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No bills for this vendor yet.</Text>
          ) : (
            vendorBills.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() =>
                  navigation
                    .getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>()
                    ?.navigate('Bills', { screen: 'BillDetails', params: { billId: item.id } })
                }
                className="mt-2 flex-row items-center justify-between border-t border-slate-100 pt-2 first:border-t-0 first:pt-0 dark:border-slate-800"
              >
                <Text className="text-sm font-semibold text-ink dark:text-white">{item.billCode}</Text>
                <Badge label={item.status} variant="neutral" />
              </Pressable>
            ))
          )}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <View className="flex-row items-center gap-2">
            <Text style={{ fontSize: 20 }}>🤖</Text>
            <Text className="flex-1 text-sm font-semibold text-ink dark:text-slate-200">AI Insights</Text>
            <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Coming Soon</Text>
            </View>
          </View>
          <Text className="mt-2 text-xs text-ink-muted dark:text-slate-400">
            AI-powered vendor performance scoring, compliance checks, and procurement insights will appear here.
          </Text>
        </DashboardCard>

        <Button label="Edit Vendor" onPress={() => navigation.navigate('EditVendor', { vendorId: vendor.id })} className="mt-5" />

        {vendor.status !== 'active' ? (
          <Button label="Mark Active" variant="secondary" loading={isUpdatingStatus} onPress={() => handleSetStatus('active')} className="mt-3" />
        ) : (
          <Button label="Deactivate" variant="secondary" loading={isUpdatingStatus} onPress={() => handleSetStatus('inactive')} className="mt-3" />
        )}

        {vendor.status !== 'blacklisted' ? (
          <Button label="Blacklist Vendor" variant="dangerOutline" loading={isUpdatingStatus} onPress={() => handleSetStatus('blacklisted')} className="mt-3" />
        ) : null}

        <Button label="Delete Vendor" variant="dangerOutline" loading={isDeleting} onPress={handleDelete} className="mt-3" />
      </ScrollView>
    </Screen>
  );
}
