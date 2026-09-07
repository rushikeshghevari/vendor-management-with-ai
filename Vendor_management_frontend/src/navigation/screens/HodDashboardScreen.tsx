import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { AnalyticsBar } from '@/components/dashboard/AnalyticsBar';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { SparklineRow } from '@/components/dashboard/SparklineRow';
import { DepartmentSummaryCard } from '@/components/departments/DepartmentSummaryCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Screen } from '@/components/ui/Screen';
import { useGetHodAnalyticsQuery, useGetHodDepartmentQuery } from '@/features/hod/api/hodApi';
import { useAuth } from '@/hooks/useAuth';
import { useDrawer } from '@/navigation/context/DrawerContext';
import type { HodTabParamList } from '@/navigation/types';
import { formatStatusLabel } from '@/utils/formatStatus';

type Props = BottomTabScreenProps<HodTabParamList, 'Dashboard'>;

const BAR_COLORS = ['#1e88e5', '#f59e0b', '#10b981', '#8b5cf6', '#e53935', '#0ea5e9', '#64748b'];

interface QuickActionData {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function QuickAction({ icon, label, onPress }: QuickActionData) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
        <Ionicons name={icon} size={22} color="#1e88e5" />
      </View>
      <Text className="mt-2 text-center text-xs font-semibold text-ink dark:text-white">{label}</Text>
    </Pressable>
  );
}

export function HodDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const drawer = useDrawer();
  if (drawer) drawer.setTabNavigation(navigation);
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  const { data: department, isLoading } = useGetHodDepartmentQuery();
  const { data: analytics } = useGetHodAnalyticsQuery();

  const quotationBreakdownTotal = Math.max(
    (analytics?.quotationStatusBreakdown ?? []).reduce((sum, entry) => sum + entry.count, 0),
    1,
  );
  const billBreakdownTotal = Math.max(
    (analytics?.billStatusBreakdown ?? []).reduce((sum, entry) => sum + entry.count, 0),
    1,
  );

  return (
    <Screen padded={false} className="bg-surface-muted dark:bg-surface-dark">
      <AppHeader
        variant="brand"
        rightSlot={
          <>
            <NotificationBell size={24} color="#212121" />
            <Avatar initials={initials} online onPress={() => drawer?.openDrawer()} />
          </>
        }
      />

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        <DashboardCard>
          <Text className="text-lg font-bold text-ink dark:text-white">{department?.name ?? 'My Department'}</Text>
          <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">{department?.code}</Text>
        </DashboardCard>

        <View className="mt-4 flex-row gap-3">
          <DepartmentSummaryCard
            icon={<Ionicons name="people-outline" size={20} color="#43a047" />}
            value={isLoading ? 0 : department?.userCount ?? 0}
            label="Department Users"
          />
          <DepartmentSummaryCard
            icon={<Ionicons name="storefront-outline" size={20} color="#7c3aed" />}
            value={isLoading ? 0 : department?.vendorCount ?? 0}
            label="Vendors"
          />
        </View>

        <View className="mt-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-100 dark:shadow-none">
          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">Department Activity Trend</Text>
          <SparklineRow
            title="Requirements"
            subtitle="Raised by your department"
            value={isLoading ? 0 : department?.requirementCount ?? 0}
            icon="list"
            iconColor="#10b981"
            iconBg="#d1fae5"
            trendData={analytics?.requirementTrend ?? []}
            color="#10b981"
            onPress={() => navigation.navigate('Requirements', { screen: 'RequirementList' })}
          />
          <SparklineRow
            title="Quotations"
            subtitle="Vendor cost proposals"
            value={isLoading ? 0 : department?.quotationCount ?? 0}
            icon="document-text"
            iconColor="#1e88e5"
            iconBg="#e3f2fd"
            trendData={analytics?.quotationTrend ?? []}
            color="#1e88e5"
            onPress={() => navigation.navigate('Requirements', { screen: 'RequirementList' })}
          />
          <SparklineRow
            title="Purchase Orders"
            subtitle="Approved procurement orders"
            value={isLoading ? 0 : department?.purchaseOrderCount ?? 0}
            icon="clipboard"
            iconColor="#f59e0b"
            iconBg="#fef3c7"
            trendData={analytics?.purchaseOrderTrend ?? []}
            color="#f59e0b"
            onPress={() => navigation.navigate('PurchaseOrders', { screen: 'PurchaseOrderList' })}
          />
          <SparklineRow
            title="Bills"
            subtitle="Vendor invoices received"
            value={isLoading ? 0 : department?.billCount ?? 0}
            icon="receipt"
            iconColor="#e53935"
            iconBg="#ffebee"
            trendData={analytics?.billTrend ?? []}
            color="#e53935"
            onPress={() => navigation.navigate('Bills', { screen: 'BillList' })}
          />
        </View>

        <Text className="mb-2 mt-6 text-sm font-semibold text-ink dark:text-slate-200">Team & Approvals</Text>
        <View className="flex-row gap-3">
          <DepartmentSummaryCard
            icon={<Ionicons name="person-outline" size={20} color="#16a34a" />}
            value={analytics?.activeUsers ?? 0}
            label="Active Users"
          />
          <DepartmentSummaryCard
            icon={<Ionicons name="person-remove-outline" size={20} color="#94a3b8" />}
            value={analytics?.inactiveUsers ?? 0}
            label="Inactive Users"
          />
        </View>
        <View className="mt-3 flex-row gap-3">
          <DepartmentSummaryCard
            icon={<Ionicons name="hourglass-outline" size={20} color="#f59e0b" />}
            value={analytics?.pendingApprovals ?? 0}
            label="Pending Approvals"
          />
          <DepartmentSummaryCard
            icon={<Ionicons name="close-circle-outline" size={20} color="#dc2626" />}
            value={analytics?.rejected ?? 0}
            label="Rejected"
          />
        </View>

        {analytics && (analytics.quotationStatusBreakdown.length > 0 || analytics.billStatusBreakdown.length > 0) ? (
          <>
            <Text className="mb-2 mt-6 text-sm font-semibold text-ink dark:text-slate-200">Analytics</Text>
            <View className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
              {analytics.quotationStatusBreakdown.map((entry, index) => (
                <View key={`quotation-${entry.status}`} className={index > 0 ? 'mt-3' : undefined}>
                  <AnalyticsBar
                    label={`Quotations · ${formatStatusLabel(entry.status)}`}
                    value={entry.count}
                    max={quotationBreakdownTotal}
                    color={BAR_COLORS[index % BAR_COLORS.length]!}
                  />
                </View>
              ))}
              {analytics.billStatusBreakdown.map((entry, index) => (
                <View key={`bill-${entry.status}`} className="mt-3">
                  <AnalyticsBar
                    label={`Bills · ${formatStatusLabel(entry.status)}`}
                    value={entry.count}
                    max={billBreakdownTotal}
                    color={BAR_COLORS[index % BAR_COLORS.length]!}
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text className="mb-2 mt-6 text-sm font-semibold text-ink dark:text-slate-200">Quick Actions</Text>
        <View className="flex-row gap-3">
          <QuickAction icon="person-add-outline" label="Create User" onPress={() => navigation.navigate('Users', { screen: 'CreateUser' })} />
          <QuickAction icon="storefront-outline" label="Create Vendor" onPress={() => navigation.navigate('Vendors', { screen: 'AddVendor' })} />
          <QuickAction
            icon="document-text-outline"
            label="Create Quotation"
            onPress={() => navigation.navigate('Quotations', { screen: 'CreateQuotation' })}
          />
          <QuickAction
            icon="repeat-outline"
            label="Recurring Expenses"
            onPress={() => navigation.navigate('Bills', { screen: 'RecurringExpenseList' })}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
