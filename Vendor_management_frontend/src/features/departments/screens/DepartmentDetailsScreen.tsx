import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChipSelect } from '@/components/departments/ChipSelect';
import { DeleteConfirmationSheet } from '@/components/departments/DeleteConfirmationSheet';
import { DepartmentBadge } from '@/components/departments/DepartmentBadge';
import { DepartmentSummaryCard } from '@/components/departments/DepartmentSummaryCard';
import { AnalyticsBar } from '@/components/dashboard/AnalyticsBar';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import {
  useDeleteDepartmentMutation,
  useGetDepartmentAnalyticsQuery,
  useGetDepartmentsQuery,
  useSetDepartmentStatusMutation,
  useTransferHodMutation,
} from '@/features/departments/api/departmentsApi';
import { useGetUsersQuery } from '@/features/users/api/usersApi';
import { useGetVendorsQuery } from '@/features/vendors/api/vendorsApi';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { formatStatusLabel } from '@/utils/formatStatus';
import type { DepartmentsStackParamList, MainTabParamList } from '@/navigation/types';

const TRANSFER_CANDIDATE_ROLES: string[] = [ROLES.HOD, ROLES.DEPARTMENT_USER];
const DEMOTE_OPTIONS = [
  { value: 'no' as const, label: "Leave previous HOD's account as-is" },
  { value: 'yes' as const, label: 'Demote previous HOD to Department User' },
];
const BAR_COLORS = ['#1e88e5', '#f59e0b', '#10b981', '#8b5cf6', '#e53935', '#0ea5e9', '#64748b'];

type Props = NativeStackScreenProps<DepartmentsStackParamList, 'DepartmentDetails'>;

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DepartmentDetailsScreen({ navigation, route }: Props) {
  const { departmentId } = route.params;
  const [isDeleteSheetVisible, setIsDeleteSheetVisible] = useState(false);
  const [isTransferVisible, setIsTransferVisible] = useState(false);
  const [selectedHodId, setSelectedHodId] = useState('');
  const [demoteChoice, setDemoteChoice] = useState<'yes' | 'no'>('no');

  const { data: departments, isLoading: isDepartmentLoading } = useGetDepartmentsQuery();
  const { data: users } = useGetUsersQuery();
  const { data: vendors } = useGetVendorsQuery();
  const { data: analytics } = useGetDepartmentAnalyticsQuery(departmentId);
  const [setDepartmentStatus] = useSetDepartmentStatusMutation();
  const [deleteDepartment, { isLoading: isDeleting }] = useDeleteDepartmentMutation();
  const [transferHod, { isLoading: isTransferring }] = useTransferHodMutation();

  const department = departments?.find((item) => item.id === departmentId);
  const totalUsers = (users ?? []).filter((item) => item.departmentId === departmentId && item.isActive).length;
  const totalVendors = (vendors ?? []).filter((item) => item.departmentId === departmentId && item.status === 'active').length;

  const transferCandidates = (users ?? []).filter(
    (item) => item.isActive && TRANSFER_CANDIDATE_ROLES.includes(item.role) && item.id !== department?.hod?.id,
  );

  const handleTransferConfirm = async () => {
    if (!selectedHodId) return;
    try {
      await transferHod({ id: departmentId, newHodId: selectedHodId, demoteOldHod: demoteChoice === 'yes' }).unwrap();
      setIsTransferVisible(false);
      setSelectedHodId('');
      setDemoteChoice('no');
    } catch (error) {
      Alert.alert('Could Not Transfer HOD', getErrorMessage(error));
    }
  };

  if (isDepartmentLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Department Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!department) {
    return (
      <Screen padded={false}>
        <AppHeader title="Department Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Department not found.</Text>
      </Screen>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteDepartment(department.id).unwrap();
      setIsDeleteSheetVisible(false);
      navigation.goBack();
    } catch (error) {
      setIsDeleteSheetVisible(false);
      Alert.alert('Could Not Delete Department', getErrorMessage(error));
    }
  };

  const goToUsers = () => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Users');

  const handleDeletePress = () => {
    if (totalUsers > 0) {
      Alert.alert(
        'Cannot Delete Department',
        'This department contains active users.\nPlease move or remove all users before deleting this department.',
        [{ text: 'OK', style: 'cancel' }, { text: 'View Users', onPress: goToUsers }],
      );
      return;
    }

    if (totalVendors > 0) {
      Alert.alert(
        'Cannot Delete Department',
        'This department contains active vendors.\nPlease move or remove all vendors before deleting this department.',
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }

    setIsDeleteSheetVisible(true);
  };

  const handleToggleStatus = async () => {
    try {
      await setDepartmentStatus({ id: department.id, isActive: !department.isActive }).unwrap();
    } catch (error) {
      Alert.alert('Could Not Update Status', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Department Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard>
          <View className="flex-row items-start justify-between">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
              <Ionicons name="business" size={26} color="#1e88e5" />
            </View>
            <DepartmentBadge isActive={department.isActive} />
          </View>

          <Text className="mt-3 text-xl font-bold text-ink dark:text-white">{department.name}</Text>
          <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">{department.code}</Text>

          <Text className="mt-3 text-sm text-ink-muted dark:text-slate-300">{department.description}</Text>

          {department.hod ? (
            <View className="mt-3 flex-row items-center gap-1.5">
              <Ionicons name="person-outline" size={14} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-400">
                HOD: {department.hod.name} ({department.hod.email})
              </Text>
            </View>
          ) : (
            <View className="mt-3 flex-row items-center gap-1.5">
              <Ionicons name="alert-circle-outline" size={14} color="#d97706" />
              <Text className="text-xs text-amber-600 dark:text-amber-400">No HOD assigned</Text>
            </View>
          )}

          <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">Created {formatDate(department.createdAt)}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">Updated {formatDate(department.updatedAt)}</Text>
            </View>
          </View>
        </DashboardCard>

        <View className="mt-4 flex-row gap-3">
          <DepartmentSummaryCard
            icon={<Ionicons name="people-outline" size={20} color="#43a047" />}
            value={totalUsers}
            label="Total Users"
          />
          <DepartmentSummaryCard
            icon={<Ionicons name="storefront-outline" size={20} color="#7c3aed" />}
            value={totalVendors}
            label="Total Vendors"
          />
        </View>

        <View className="mt-3 flex-row gap-3">
          <DepartmentSummaryCard
            icon={<Ionicons name="document-text-outline" size={20} color="#1e88e5" />}
            value={department.quotationCount ?? 0}
            label="Quotations"
          />
          <DepartmentSummaryCard
            icon={<Ionicons name="receipt-outline" size={20} color="#e53935" />}
            value={department.billCount ?? 0}
            label="Bills"
          />
        </View>

        {analytics ? (
          <View className="mt-3 flex-row gap-3">
            <DepartmentSummaryCard
              icon={<Ionicons name="hourglass-outline" size={20} color="#f59e0b" />}
              value={analytics.pendingApprovals}
              label="Pending Approvals"
            />
            <DepartmentSummaryCard
              icon={<Ionicons name="checkmark-done-circle-outline" size={20} color="#16a34a" />}
              value={analytics.completed}
              label="Completed"
            />
          </View>
        ) : null}

        {analytics && (analytics.quotationStatusBreakdown.length > 0 || analytics.billStatusBreakdown.length > 0) ? (
          <DashboardCard className="mt-4">
            <Text className="mb-3 text-sm font-semibold text-ink dark:text-slate-200">Analytics</Text>
            {analytics.quotationStatusBreakdown.map((entry, index) => (
              <View key={`quotation-${entry.status}`} className={index > 0 ? 'mt-3' : undefined}>
                <AnalyticsBar
                  label={`Quotations · ${formatStatusLabel(entry.status)}`}
                  value={entry.count}
                  max={Math.max(analytics.quotationStatusBreakdown.reduce((sum, e) => sum + e.count, 0), 1)}
                  color={BAR_COLORS[index % BAR_COLORS.length]!}
                />
              </View>
            ))}
            {analytics.billStatusBreakdown.map((entry, index) => (
              <View key={`bill-${entry.status}`} className="mt-3">
                <AnalyticsBar
                  label={`Bills · ${formatStatusLabel(entry.status)}`}
                  value={entry.count}
                  max={Math.max(analytics.billStatusBreakdown.reduce((sum, e) => sum + e.count, 0), 1)}
                  color={BAR_COLORS[index % BAR_COLORS.length]!}
                />
              </View>
            ))}
          </DashboardCard>
        ) : null}

        <Button
          label="Edit Department"
          onPress={() => navigation.navigate('EditDepartment', { departmentId: department.id })}
          className="mt-5"
        />
        <Button
          label={department.hod ? 'Transfer HOD' : 'Assign HOD'}
          variant="secondary"
          onPress={() => setIsTransferVisible((v) => !v)}
          className="mt-3"
        />

        {isTransferVisible ? (
          <DashboardCard className="mt-3">
            <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-200">Select New HOD</Text>
            <FilterChipRow
              value={selectedHodId}
              options={transferCandidates.map((item) => ({ value: item.id, label: item.name }))}
              onChange={setSelectedHodId}
            />
            {transferCandidates.length === 0 ? (
              <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">No eligible users found.</Text>
            ) : null}

            {department.hod ? (
              <View className="mt-3">
                <ChipSelect label="" value={demoteChoice} options={DEMOTE_OPTIONS} onChange={setDemoteChoice} />
              </View>
            ) : null}

            <Button
              label="Confirm Transfer"
              loading={isTransferring}
              onPress={handleTransferConfirm}
              className="mt-1"
            />
          </DashboardCard>
        ) : null}

        <Button
          label={department.isActive ? 'Deactivate' : 'Activate'}
          variant="secondary"
          onPress={handleToggleStatus}
          className="mt-3"
        />
        <Button
          label="Delete Department"
          variant="dangerOutline"
          loading={isDeleting}
          onPress={handleDeletePress}
          className="mt-3"
        />
      </ScrollView>

      <DeleteConfirmationSheet
        visible={isDeleteSheetVisible}
        departmentName={department.name}
        onCancel={() => setIsDeleteSheetVisible(false)}
        onConfirm={handleDelete}
      />
    </Screen>
  );
}
