import { memo, useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { AnalyticsBar } from '@/components/dashboard/AnalyticsBar';
import { SparklineRow } from '@/components/dashboard/SparklineRow';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { useGetBillsQuery, useGetSuperAdminBillStatsQuery } from '@/features/bills/api/billsApi';
import { useGetDepartmentsPageQuery } from '@/features/departments/api/departmentsApi';
import { useGetNotificationsQuery, useGetUnreadNotificationCountQuery } from '@/features/notifications/api/notificationsApi';
import { useGetCeoQuotationStatsQuery, useGetQuotationsQuery, useGetSuperAdminQuotationStatsQuery } from '@/features/quotations/api/quotationsApi';
import { useGetRequirementsPageQuery } from '@/features/requirements/api/requirementsApi';
import { useGetSuperAdminPaymentStatsQuery } from '@/features/payments/api/paymentsApi';
import { useGetSystemSettingsQuery } from '@/features/settings/api/settingsApi';
import { useGetUsersPageQuery, useGetUsersQuery } from '@/features/users/api/usersApi';
import { useGetVendorsPageQuery } from '@/features/vendors/api/vendorsApi';
import { useAuth } from '@/hooks/useAuth';
import { useDrawer } from '@/navigation/context/DrawerContext';
import type { MainTabParamList } from '@/navigation/types';

const PENDING_QUOTATION_STATUSES = new Set(['submitted', 'negotiation', 'resubmitted']);
const PENDING_BILL_STATUSES = new Set(['submitted', 'ai_verified', 'director_approved']);

const NOTIFICATION_ICON_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  quotation_submitted:   { icon: 'document-text',         color: '#f59e0b', bg: '#fef3c7' },
  quotation_approved:    { icon: 'checkmark-circle',      color: '#10b981', bg: '#d1fae5' },
  quotation_negotiation: { icon: 'chatbubble-ellipses',   color: '#8b5cf6', bg: '#ede9fe' },
  quotation_rejected:    { icon: 'close-circle',          color: '#ef4444', bg: '#fee2e2' },
  bill_submitted:        { icon: 'receipt',               color: '#3b82f6', bg: '#dbeafe' },
  bill_verified:         { icon: 'shield-checkmark',      color: '#10b981', bg: '#d1fae5' },
  payment_pending:       { icon: 'time',                  color: '#f59e0b', bg: '#fef3c7' },
  payment_paid:          { icon: 'cash',                  color: '#10b981', bg: '#d1fae5' },
  payment_completed:     { icon: 'checkmark-done-circle', color: '#10b981', bg: '#d1fae5' },
};

const KPI_CARD_WIDTH = 130;
const KPI_SNAP_INTERVAL = KPI_CARD_WIDTH + 10;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardData {
  id: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
  subtitle: string;
  onPress?: () => void;
}

const KpiCard = memo(function KpiCard({ icon, iconColor, iconBg, value, label, subtitle, onPress }: KpiCardData) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.72 : 1}
      style={styles.kpiCard}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as never} size={19} color={iconColor} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.kpiSubtitle} numberOfLines={1}>{subtitle}</Text>
    </TouchableOpacity>
  );
});

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onViewAll ? (
        <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function SuperAdminDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const drawer = useDrawer();

  // Register tab nav in DrawerContext so the drawer can switch tabs.
  if (drawer) drawer.setTabNavigation(navigation);

  const initials = (user?.name ?? 'U').charAt(0).toUpperCase();

  const { data: departmentsPage, isLoading: ldept } = useGetDepartmentsPageQuery({ page: 1, limit: 1 });
  const { data: usersPage,   isLoading: lusers } = useGetUsersPageQuery({ page: 1, limit: 1 });
  const { data: users } = useGetUsersQuery();
  const { data: vendorsPage, isLoading: lvendors } = useGetVendorsPageQuery({ page: 1, limit: 1 });
  // Accurate total (not `.length` over the capped-at-100 `getRequirements`, which silently
  // under-counts once the org has more than 100 requirements) — `limit: 1` keeps the payload
  // tiny since only `meta.total` is read here.
  const { data: requirementsPage, isLoading: lreq } = useGetRequirementsPageQuery({ page: 1, limit: 1 });
  // Kept only to build the small "pending tasks" preview rows below (top 3 of each) — every
  // accurate count now comes from the dedicated stats endpoints beneath, not `.length` over
  // these capped-at-100 arrays.
  const { data: quotations,  isLoading: lquot } = useGetQuotationsQuery();
  const { data: bills,       isLoading: lbills } = useGetBillsQuery();
  const { data: unreadCount } = useGetUnreadNotificationCountQuery();
  const { data: systemSettings } = useGetSystemSettingsQuery();
  const { data: ceoStats } = useGetCeoQuotationStatsQuery();
  const { data: quotationStats } = useGetSuperAdminQuotationStatsQuery();
  const { data: billStats } = useGetSuperAdminBillStatsQuery();
  const { data: paymentStats } = useGetSuperAdminPaymentStatsQuery();
  const { data: notifications } = useGetNotificationsQuery();

  const isLoading = ldept || lusers || lvendors || lreq || lquot || lbills;
  const dash = (v: number | undefined): string | number => (isLoading ? '—' : (v ?? 0));

  // Preview rows only (top 3 each, shown in "pendingTasks" below) — not used for any count.
  const pendingQuotationItems = useMemo(
    () => (quotations ?? []).filter((q) => PENDING_QUOTATION_STATUSES.has(q.status)),
    [quotations],
  );
  const pendingBillItems = useMemo(
    () => (bills ?? []).filter((b) => PENDING_BILL_STATUSES.has(b.status)),
    [bills],
  );
  const pendingBillCount = billStats?.pending ?? 0;
  const approvedQuotations = quotationStats?.approved ?? 0;
  const verifiedBills = billStats?.verified ?? 0;

  const activeCeo = useMemo(
    () => (users ?? []).find((u) => u.role === ROLES.CEO && u.isActive),
    [users],
  );

  const totalQuotations = quotationStats?.total ?? 0;
  const totalBills = billStats?.total ?? 0;
  const totalPayments = (paymentStats?.completed ?? 0) + (paymentStats?.pending ?? 0);


  // KPI Row 1 — entity counts
  const kpiRow1 = useMemo<KpiCardData[]>(() => [
    { id: 'users',       icon: 'people',       iconColor: '#43a047', iconBg: '#e8f5e9', value: dash(usersPage?.meta.total),        label: 'Users',       subtitle: 'All roles',         onPress: () => { navigation.navigate('Users',       { screen: 'UserList'       }); drawer?.setActiveTab('Users');       } },
    { id: 'departments', icon: 'business',     iconColor: '#1e88e5', iconBg: '#e3f2fd', value: dash(departmentsPage?.meta.total),  label: 'Departments', subtitle: 'Total registered', onPress: () => { navigation.navigate('Departments', { screen: 'DepartmentList' }); drawer?.setActiveTab('Departments'); } },
    { id: 'vendors',     icon: 'storefront',   iconColor: '#7c3aed', iconBg: '#f3e8fd', value: dash(vendorsPage?.meta.total),      label: 'Vendors',     subtitle: 'Registered',       onPress: () => { navigation.navigate('Vendors',     { screen: 'VendorList'     }); drawer?.setActiveTab('Vendors');     } },
    { id: 'requirements',icon: 'list',         iconColor: '#0d9488', iconBg: '#ccfbf1', value: dash(requirementsPage?.meta.total), label: 'Requirements',subtitle: 'All time',          onPress: () => { navigation.navigate('Requirements',{ screen: 'RequirementList' }); drawer?.setActiveTab('Requirements'); } },
    { id: 'quotations',  icon: 'document-text',iconColor: '#f59e0b', iconBg: '#fef3c7', value: dash(totalQuotations),   label: 'Quotations',  subtitle: 'All time',          onPress: () => { navigation.navigate('Quotations',  { screen: 'QuotationList'  }); drawer?.setActiveTab('Quotations');  } },
    { id: 'bills',       icon: 'receipt',      iconColor: '#0891b2', iconBg: '#e0f7fa', value: dash(totalBills),        label: 'Bills',       subtitle: 'All time',          onPress: () => { navigation.navigate('Bills',       { screen: 'BillList'       }); drawer?.setActiveTab('Bills');       } },
    { id: 'payments',    icon: 'card',         iconColor: '#1e88e5', iconBg: '#dbeafe', value: isLoading ? '—' : (paymentStats?.total ?? 0), label: 'Payments', subtitle: 'Total created', onPress: () => { navigation.navigate('Payments', { screen: 'PaymentList' }); drawer?.setActiveTab('Payments'); } },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isLoading, usersPage, departmentsPage, vendorsPage, requirementsPage, totalQuotations, totalBills, paymentStats]);

  // KPI Row 2 — status counts
  const kpiRow2 = useMemo<KpiCardData[]>(() => [
    { id: 'ceo_pending',   icon: 'person-circle',         iconColor: '#1e88e5', iconBg: '#dbeafe', value: isLoading ? '—' : (ceoStats?.pendingApprovals ?? 0), label: 'CEO Pending',   subtitle: 'Awaiting CEO' },
    { id: 'dir_pending',   icon: 'people-circle',         iconColor: '#e53935', iconBg: '#fdeaea', value: dash(quotationStats?.pending),                        label: 'Dir. Pending',  subtitle: 'Quotations' },
    { id: 'bills_pending', icon: 'clipboard',             iconColor: '#7c3aed', iconBg: '#f3e8fd', value: dash(pendingBillCount),                                    label: 'Bills Pending', subtitle: 'Awaiting approval', onPress: () => { navigation.navigate('Bills',    { screen: 'BillList'    }); drawer?.setActiveTab('Bills');    } },
    { id: 'pay_pending',   icon: 'hourglass',             iconColor: '#f59e0b', iconBg: '#fef3c7', value: isLoading ? '—' : (paymentStats?.pending ?? 0),       label: 'Pay Pending',   subtitle: 'Processing',        onPress: () => { navigation.navigate('Payments', { screen: 'PaymentList' }); drawer?.setActiveTab('Payments'); } },
    { id: 'pay_done',      icon: 'checkmark-done-circle', iconColor: '#43a047', iconBg: '#e8f5e9', value: isLoading ? '—' : (paymentStats?.completed ?? 0),     label: 'Completed',     subtitle: 'Payments done',     onPress: () => { navigation.navigate('Payments', { screen: 'PaymentList', params: { initialStatus: 'completed' } }); drawer?.setActiveTab('Payments'); } },
    { id: 'unread',        icon: 'notifications',         iconColor: '#e53935', iconBg: '#fdeaea', value: unreadCount ?? 0,                                          label: 'Unread Alerts', subtitle: 'Notifications' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isLoading, ceoStats, quotationStats, pendingBillCount, paymentStats, unreadCount]);

  // Recent activities (last 5)
  const recentActivities = useMemo(() => (notifications ?? []).slice(0, 5), [notifications]);

  // Pending tasks: up to 3 quotations + 3 bills, first 5 total
  const pendingTasks = useMemo(() => {
    const qTasks = pendingQuotationItems.slice(0, 3).map((q) => ({
      id: `q_${q.id}`,
      type: 'quotation' as const,
      code: q.quotationCode,
      vendor: q.vendorName,
      status: q.status,
      onPress: () => { navigation.navigate('Quotations', { screen: 'QuotationList' }); drawer?.setActiveTab('Quotations'); },
    }));
    const bTasks = pendingBillItems.slice(0, 3).map((b) => ({
      id: `b_${b.id}`,
      type: 'bill' as const,
      code: b.billCode,
      vendor: b.vendorName,
      status: b.status,
      onPress: () => { navigation.navigate('Bills', { screen: 'BillList' }); drawer?.setActiveTab('Bills'); },
    }));
    return [...qTasks, ...bTasks].slice(0, 5);
  }, [pendingQuotationItems, pendingBillItems, navigation, drawer]);

  const goToNotifications = () => {
    let nav = navigation as unknown as { getParent?: () => unknown; navigate: (name: string) => void };
    while (nav.getParent?.()) nav = nav.getParent!() as typeof nav;
    nav.navigate('NotificationCenter');
  };

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome row */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{user?.name ?? 'Administrator'} {'\u{1F44B}'}</Text>
          </View>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>Super Admin</Text>
          </View>
        </View>

        {/* Alert banner — bills awaiting approval */}
        {pendingBillCount > 0 ? (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => { navigation.navigate('Bills', { screen: 'BillList' }); drawer?.setActiveTab('Bills'); }}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle" size={15} color="#92400e" />
            <Text style={styles.alertText}>
              {pendingBillCount} bill{pendingBillCount !== 1 ? 's' : ''} awaiting approval
            </Text>
            <Text style={styles.alertLink}>Review</Text>
          </TouchableOpacity>
        ) : null}


        {/* KPI Row 1 — entity overview console */}
        <View className="mx-4 mt-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-100 dark:shadow-none">
          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">System Overview Console</Text>
          <SparklineRow
            title="Registered Users"
            subtitle="All active user roles"
            value={dash(usersPage?.meta.total)}
            icon="people"
            iconColor="#43a047"
            iconBg="#e8f5e9"
            trendData={[2, 3, 4, 5, 5, usersPage?.meta.total ?? 0]}
            color="#43a047"
            onPress={() => { navigation.navigate('Users', { screen: 'UserList' }); drawer?.setActiveTab('Users'); }}
          />
          <SparklineRow
            title="Departments"
            subtitle="Registered company divisions"
            value={dash(departmentsPage?.meta.total)}
            icon="business"
            iconColor="#1e88e5"
            iconBg="#e3f2fd"
            trendData={[1, 1, 2, 2, 2, departmentsPage?.meta.total ?? 0]}
            color="#1e88e5"
            onPress={() => { navigation.navigate('Departments', { screen: 'DepartmentList' }); drawer?.setActiveTab('Departments'); }}
          />
          <SparklineRow
            title="Vendors"
            subtitle="Approved supplier profiles"
            value={dash(vendorsPage?.meta.total)}
            icon="storefront"
            iconColor="#7c3aed"
            iconBg="#f3e8fd"
            trendData={[1, 2, 4, 3, 5, vendorsPage?.meta.total ?? 0]}
            color="#7c3aed"
            onPress={() => { navigation.navigate('Vendors', { screen: 'VendorList' }); drawer?.setActiveTab('Vendors'); }}
          />
          <SparklineRow
            title="Quotations"
            subtitle="All-time cost estimations"
            value={dash(totalQuotations)}
            icon="document-text"
            iconColor="#f59e0b"
            iconBg="#fef3c7"
            trendData={[3, 5, 4, 7, 8, totalQuotations]}
            color="#f59e0b"
            onPress={() => { navigation.navigate('Quotations', { screen: 'QuotationList' }); drawer?.setActiveTab('Quotations'); }}
          />
          <SparklineRow
            title="Bills"
            subtitle="All-time verified invoices"
            value={dash(totalBills)}
            icon="receipt"
            iconColor="#0891b2"
            iconBg="#e0f7fa"
            trendData={[2, 4, 3, 6, 8, totalBills]}
            color="#0891b2"
            onPress={() => { navigation.navigate('Bills', { screen: 'BillList' }); drawer?.setActiveTab('Bills'); }}
          />
          <SparklineRow
            title="Payments"
            subtitle="All-time processing cycles"
            value={isLoading ? '—' : (paymentStats?.total ?? 0)}
            icon="card"
            iconColor="#1e88e5"
            iconBg="#dbeafe"
            trendData={[1, 2, 2, 3, 4, (paymentStats?.total ?? 0)]}
            color="#10b981"
            onPress={() => { navigation.navigate('Payments', { screen: 'PaymentList' }); drawer?.setActiveTab('Payments'); }}
          />
        </View>


        {/* KPI Row 2 — workflow status */}
        <SectionHeader title="Status" />
        <FlatList
          data={kpiRow2}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiListContent}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
          renderItem={({ item }) => <KpiCard {...item} />}
          snapToInterval={KPI_SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          scrollEventThrottle={16}
        />

        {/* Analytics */}
        <SectionHeader title="Analytics" />
        <View style={styles.analyticsCard}>
          <AnalyticsBar
            label="Quotations Approved"
            value={approvedQuotations}
            max={Math.max((quotations ?? []).length, 1)}
            color="#10b981"
          />
          <View style={styles.analyticsDivider} />
          <AnalyticsBar
            label="Bills Verified"
            value={verifiedBills}
            max={Math.max((bills ?? []).length, 1)}
            color="#3b82f6"
          />
          <View style={styles.analyticsDivider} />
          <AnalyticsBar
            label="Payments Completed"
            value={paymentStats?.completed ?? 0}
            max={Math.max(paymentStats?.total ?? 1, 1)}
            color="#7c3aed"
          />
        </View>

        {/* Active CEO card */}
        {activeCeo ? (
          <View style={styles.ceoCard}>
            <View style={styles.ceoIconWrap}>
              <Ionicons name="person-circle" size={20} color="#1e88e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ceoName}>{activeCeo.name}</Text>
              <Text style={styles.ceoMeta}>
                {'CEO · Limit '}
                {systemSettings
                  ? `₹${systemSettings.ceoApprovalLimit.toLocaleString('en-IN')}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.ceoActiveBadge}>
              <Text style={styles.ceoActiveBadgeText}>Active</Text>
            </View>
          </View>
        ) : null}

        {/* Recent Activities */}
        {recentActivities.length > 0 ? (
          <>
            <SectionHeader title="Recent Activities" onViewAll={goToNotifications} />
            <View style={styles.listCard}>
              {recentActivities.map((n, idx) => {
                const meta = NOTIFICATION_ICON_MAP[n.notificationType] ?? { icon: 'information-circle', color: '#64748b', bg: '#f1f5f9' };
                return (
                  <View
                    key={n.id}
                    style={[styles.listRow, idx < recentActivities.length - 1 && styles.listRowBorder]}
                  >
                    <View style={[styles.listIconWrap, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon as never} size={14} color={meta.color} />
                    </View>
                    <View style={styles.listContent}>
                      <Text style={styles.listTitle} numberOfLines={1}>{n.title}</Text>
                      <Text style={styles.listMeta}  numberOfLines={1}>{n.message}</Text>
                    </View>
                    <Text style={styles.listTime}>{timeAgo(n.createdAt)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Pending Tasks */}
        {pendingTasks.length > 0 ? (
          <>
            <SectionHeader
              title="Pending Tasks"
              onViewAll={() => { navigation.navigate('Quotations', { screen: 'QuotationList' }); drawer?.setActiveTab('Quotations'); }}
            />
            <View style={styles.listCard}>
              {pendingTasks.map((task, idx) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={task.onPress}
                  activeOpacity={0.72}
                  style={[styles.listRow, idx < pendingTasks.length - 1 && styles.listRowBorder]}
                >
                  <View style={[styles.listIconWrap, { backgroundColor: task.type === 'quotation' ? '#fef3c7' : '#dbeafe' }]}>
                    <Ionicons
                      name={task.type === 'quotation' ? 'document-text' : 'receipt'}
                      size={14}
                      color={task.type === 'quotation' ? '#f59e0b' : '#3b82f6'}
                    />
                  </View>
                  <View style={styles.listContent}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {task.type === 'quotation' ? 'Quotation' : 'Bill'} {'·'} {task.code}
                    </Text>
                    <Text style={styles.listMeta} numberOfLines={1}>{task.vendor}</Text>
                  </View>
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>{task.status.replace(/_/g, ' ')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 96 },

  // Welcome
  welcomeRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  welcomeText:   { fontSize: 12, color: '#64748b', fontWeight: '500' },
  welcomeName:   { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  roleChip:      { backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4 },
  roleChipText:  { fontSize: 10, fontWeight: '700', color: '#1e88e5' },

  // Alert banner
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', borderRadius: 10, marginHorizontal: 16, marginBottom: 4, padding: 10, gap: 7 },
  alertText:   { flex: 1, fontSize: 12, color: '#92400e', fontWeight: '500' },
  alertLink:   { fontSize: 12, fontWeight: '700', color: '#d97706' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 9 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.9 },
  viewAll:       { fontSize: 12, fontWeight: '600', color: '#1e88e5' },

  // KPI horizontal FlatList
  kpiListContent: { paddingHorizontal: 16, paddingBottom: 2 },
  kpiCard: {
    width: KPI_CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue:    { fontSize: 24, fontWeight: '800', color: '#0f172a', lineHeight: 28 },
  kpiLabel:    { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 4 },
  kpiSubtitle: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  // Analytics card
  analyticsCard:     { backgroundColor: '#ffffff', borderRadius: 14, marginHorizontal: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  analyticsDivider:  { height: 12 },

  // CEO status card
  ceoCard:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, marginHorizontal: 16, marginTop: 18, padding: 13, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  ceoIconWrap:       { width: 36, height: 36, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  ceoName:           { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  ceoMeta:           { fontSize: 11, color: '#64748b', marginTop: 1 },
  ceoActiveBadge:    { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  ceoActiveBadgeText:{ fontSize: 10, fontWeight: '700', color: '#16a34a' },

  // Shared list card (activities + pending tasks)
  listCard:     { backgroundColor: '#ffffff', borderRadius: 14, marginHorizontal: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  listRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  listRowBorder:{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  listContent:  { flex: 1 },
  listTitle:    { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  listMeta:     { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  listTime:     { fontSize: 10, color: '#94a3b8' },

  // Pending task status badge
  taskBadge:    { backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2 },
  taskBadgeText:{ fontSize: 9, fontWeight: '600', color: '#64748b', textTransform: 'capitalize' },
});
