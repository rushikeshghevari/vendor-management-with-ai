import { memo, useMemo } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { AnalyticsBar } from '@/components/dashboard/AnalyticsBar';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Screen } from '@/components/ui/Screen';
import { useGetBillsPageQuery, useGetBillsQuery } from '@/features/bills/api/billsApi';
import { useGetUnreadNotificationCountQuery } from '@/features/notifications/api/notificationsApi';
import { useGetMyPaymentStatsQuery } from '@/features/payments/api/paymentsApi';
import { useGetQuotationsPageQuery, useGetQuotationsQuery } from '@/features/quotations/api/quotationsApi';
import { useGetRequirementsPageQuery } from '@/features/requirements/api/requirementsApi';
import { useGetVendorsPageQuery } from '@/features/vendors/api/vendorsApi';
import { useAuth } from '@/hooks/useAuth';
import { useDrawer } from '@/navigation/context/DrawerContext';
import type { DepartmentUserTabParamList } from '@/navigation/types';

type Props = BottomTabScreenProps<DepartmentUserTabParamList, 'Dashboard'>;

const KPI_CARD_WIDTH = 130;
const KPI_SNAP_INTERVAL = KPI_CARD_WIDTH + 10;

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
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.72 : 1} style={styles.kpiCard}>
      <View style={[styles.kpiIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as never} size={19} color={iconColor} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.kpiSubtitle} numberOfLines={1}>{subtitle}</Text>
    </TouchableOpacity>
  );
});

interface QuickActionData {
  icon: string;
  color: string;
  label: string;
  onPress: () => void;
  isPrimary?: boolean;
}

const QuickAction = memo(function QuickAction({ icon, color, label, onPress, isPrimary }: QuickActionData) {
  if (isPrimary) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.qaItemPrimary} activeOpacity={0.82}>
        <View style={[styles.qaPrimaryFab, { backgroundColor: color }]}>
          <Ionicons name={icon as never} size={22} color="#ffffff" />
        </View>
        <Text style={styles.qaPrimaryLabel} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.qaItemTab} activeOpacity={0.72}>
      <Ionicons name={icon as never} size={22} color={color} />
      <Text style={styles.qaTabLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
});

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

export function DepartmentUserDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const drawer = useDrawer();
  // Register tab nav so drawer can switch tabs from any screen.
  if (drawer) drawer.setTabNavigation(navigation);
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  const { data: vendorsPage, isLoading: isLoadingVendors, refetch: refetchVendors } = useGetVendorsPageQuery({ page: 1, limit: 1 });
  // Kept only for `waitingForCeo`/`waitingForDirectors` below, which filter on `approvalRoute`
  // — a field the backend's quotation list endpoint has no query param for, so those two
  // derived counts can't move server-side without a backend change (left as a disclosed,
  // lower-risk limitation, since this is scoped to the user's own quotations, not org-wide).
  const { data: quotations, isLoading: isLoadingQuotations, refetch: refetchQuotations } = useGetQuotationsQuery();
  // Accurate per-status totals for the simple single-status KPI cards (not `.length` over the
  // capped-at-100 list above).
  const { data: draftQPage, refetch: refetchDraftQ } = useGetQuotationsPageQuery({ page: 1, limit: 1, status: 'draft' });
  const { data: submittedQPage, refetch: refetchSubmittedQ } = useGetQuotationsPageQuery({ page: 1, limit: 1, status: 'submitted' });
  const { data: approvedQPage, refetch: refetchApprovedQ } = useGetQuotationsPageQuery({ page: 1, limit: 1, status: 'approved' });
  const { data: negotiationQPage, refetch: refetchNegotiationQ } = useGetQuotationsPageQuery({ page: 1, limit: 1, status: 'negotiation' });
  const { data: rejectedQPage, refetch: refetchRejectedQ } = useGetQuotationsPageQuery({ page: 1, limit: 1, status: 'rejected' });
  const { data: totalQPage, refetch: refetchTotalQ } = useGetQuotationsPageQuery({ page: 1, limit: 1 });
  const { data: bills, isLoading: isLoadingBills, refetch: refetchBills } = useGetBillsQuery();
  // Accurate per-status totals (not `.length` over the capped-at-100 list above).
  const { data: draftBPage, refetch: refetchDraftB } = useGetBillsPageQuery({ page: 1, limit: 1, status: 'draft' });
  // Note: the original client-side count also added `countB('resubmitted')`, but Bills have no
  // such status in BILL_STATUS (that value only exists for Quotations) — it was always a no-op
  // there, and would be a real validation error if sent as a query param, so it's dropped here.
  const { data: submittedBPage, refetch: refetchSubmittedB } = useGetBillsPageQuery({ page: 1, limit: 1, status: 'submitted' });
  const { data: approvedBPage, refetch: refetchApprovedB } = useGetBillsPageQuery({ page: 1, limit: 1, status: 'director_approved' });
  const { data: verifiedBPage, refetch: refetchVerifiedB } = useGetBillsPageQuery({ page: 1, limit: 1, status: 'verified' });
  const { data: correctionBPage, refetch: refetchCorrectionB } = useGetBillsPageQuery({ page: 1, limit: 1, status: 'correction_requested' });
  const { data: totalBPage, refetch: refetchTotalB } = useGetBillsPageQuery({ page: 1, limit: 1 });
  const { data: paymentStats, isLoading: isLoadingPaymentStats } = useGetMyPaymentStatsQuery();
  const { data: unreadCount } = useGetUnreadNotificationCountQuery();

  // Accurate per-status Requirement totals (not `.length` over the capped-at-100 list, which
  // silently under-counts once this user has more than 100 requirements) — `limit: 1` per
  // call since only `meta.total` is read; RTK Query caches each status filter separately.
  const { data: draftReqPage, isLoading: isLoadingDraftReq, refetch: refetchDraftReq } = useGetRequirementsPageQuery({ page: 1, limit: 1, status: 'draft' });
  const { data: submittedReqPage, refetch: refetchSubmittedReq } = useGetRequirementsPageQuery({ page: 1, limit: 1, status: 'submitted' });
  const { data: collectionReqPage, refetch: refetchCollectionReq } = useGetRequirementsPageQuery({ page: 1, limit: 1, status: 'quotation_collection' });
  const { data: comparisonReqPage, refetch: refetchComparisonReq } = useGetRequirementsPageQuery({ page: 1, limit: 1, status: 'quotation_comparison' });
  const { data: directorReviewReqPage, refetch: refetchDirectorReviewReq } = useGetRequirementsPageQuery({ page: 1, limit: 1, status: 'director_review' });
  const { data: approvedReqPage, refetch: refetchApprovedReq } = useGetRequirementsPageQuery({ page: 1, limit: 1, status: 'approved' });

  const isLoading = isLoadingVendors || isLoadingDraftReq || isLoadingQuotations || isLoadingBills;
  const isFetching = isLoading;
  const refetch = () => {
    refetchVendors(); refetchQuotations(); refetchBills();
    refetchDraftReq(); refetchSubmittedReq(); refetchCollectionReq(); refetchComparisonReq(); refetchDirectorReviewReq(); refetchApprovedReq();
    refetchDraftQ(); refetchSubmittedQ(); refetchApprovedQ(); refetchNegotiationQ(); refetchRejectedQ(); refetchTotalQ();
    refetchDraftB(); refetchSubmittedB(); refetchApprovedB(); refetchVerifiedB(); refetchCorrectionB(); refetchTotalB();
  };

  const dash = (v: number | undefined): string | number => (isLoading ? '—' : (v ?? 0));

  const waitingForCeo = useMemo(
    () => (quotations ?? []).filter((q) => (q.status === 'submitted' || q.status === 'resubmitted') && q.approvalRoute === 'ceo').length,
    [quotations],
  );
  const waitingForDirectors = useMemo(
    () => (quotations ?? []).filter((q) => (q.status === 'submitted' || q.status === 'resubmitted') && q.approvalRoute === 'directors').length,
    [quotations],
  );

  const draftReqCount = draftReqPage?.meta.total ?? 0;
  const submittedReqCount = submittedReqPage?.meta.total ?? 0;
  // "In Progress" covers every status a requirement moves through after Submitted, up to
  // (but not including) the two terminal outcomes — Vendor Finalized (done) and Rejected
  // (done, unfavorably) aren't "in progress" anymore, so they're excluded here on purpose.
  const inProgressReqCount =
    (collectionReqPage?.meta.total ?? 0) +
    (comparisonReqPage?.meta.total ?? 0) +
    (directorReviewReqPage?.meta.total ?? 0) +
    (approvedReqPage?.meta.total ?? 0);

  const kpiRowRequirements = useMemo<KpiCardData[]>(() => [
    { id: 'r_draft', icon: 'document-text', iconColor: '#f59e0b', iconBg: '#fef3c7', value: dash(draftReqCount), label: 'Draft Requirements', subtitle: 'Not submitted', onPress: () => navigation.navigate('Requirements', { screen: 'RequirementList', params: { initialStatus: 'draft' } }) },
    { id: 'r_submitted', icon: 'paper-plane', iconColor: '#0d9488', iconBg: '#ccfbf1', value: dash(submittedReqCount), label: 'Submitted', subtitle: 'Pending review', onPress: () => navigation.navigate('Requirements', { screen: 'RequirementList', params: { initialStatus: 'submitted' } }) },
    { id: 'r_in_progress', icon: 'sync', iconColor: '#1e88e5', iconBg: '#dbeafe', value: dash(inProgressReqCount), label: 'In Progress', subtitle: 'Collecting → Approved', onPress: () => navigation.navigate('Requirements', { screen: 'RequirementList', params: { initialStatus: 'all' } }) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isLoading, draftReqCount, submittedReqCount, inProgressReqCount]);

  const kpiRowQuotations = useMemo<KpiCardData[]>(() => [
    { id: 'q_draft', icon: 'document-text', iconColor: '#f59e0b', iconBg: '#fef3c7', value: dash(draftQPage?.meta.total), label: 'Draft Quotations', subtitle: 'Not submitted', onPress: () => navigation.navigate('Quotations', { screen: 'QuotationList' }) },
    { id: 'q_submitted', icon: 'paper-plane', iconColor: '#1e88e5', iconBg: '#dbeafe', value: dash(submittedQPage?.meta.total), label: 'Submitted', subtitle: 'Pending review', onPress: () => navigation.navigate('Quotations', { screen: 'QuotationList' }) },
    { id: 'q_approved', icon: 'checkmark-circle', iconColor: '#43a047', iconBg: '#e8f5e9', value: dash(approvedQPage?.meta.total), label: 'Approved', subtitle: 'Quotations', onPress: () => navigation.navigate('Quotations', { screen: 'QuotationList' }) },
    { id: 'q_negotiation', icon: 'chatbox-ellipses', iconColor: '#e53935', iconBg: '#fdeaea', value: dash(negotiationQPage?.meta.total), label: 'Negotiation', subtitle: 'Needs update', onPress: () => navigation.navigate('Quotations', { screen: 'QuotationList' }) },
    { id: 'q_rejected', icon: 'close-circle', iconColor: '#e53935', iconBg: '#fdeaea', value: dash(rejectedQPage?.meta.total), label: 'Rejected', subtitle: 'Quotations', onPress: () => navigation.navigate('Quotations', { screen: 'QuotationList' }) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isLoading, draftQPage, submittedQPage, approvedQPage, negotiationQPage, rejectedQPage]);

  const kpiRowBills = useMemo<KpiCardData[]>(() => [
    { id: 'b_draft', icon: 'receipt', iconColor: '#f59e0b', iconBg: '#fef3c7', value: dash(draftBPage?.meta.total), label: 'Draft Bills', subtitle: 'Not submitted', onPress: () => navigation.navigate('Bills', { screen: 'BillList' }) },
    { id: 'b_pending', icon: 'paper-plane', iconColor: '#1e88e5', iconBg: '#dbeafe', value: dash(submittedBPage?.meta.total), label: 'Pending Approval', subtitle: 'Bills awaiting', onPress: () => navigation.navigate('Bills', { screen: 'BillList' }) },
    { id: 'b_approved', icon: 'checkmark-circle', iconColor: '#43a047', iconBg: '#e8f5e9', value: dash(approvedBPage?.meta.total), label: 'Approved', subtitle: 'Bills', onPress: () => navigation.navigate('Bills', { screen: 'BillList' }) },
    { id: 'b_verified', icon: 'shield-checkmark', iconColor: '#00897b', iconBg: '#e3f4f2', value: dash(verifiedBPage?.meta.total), label: 'Verified', subtitle: 'Bills', onPress: () => navigation.navigate('Bills', { screen: 'BillList' }) },
    { id: 'b_correction', icon: 'create', iconColor: '#e53935', iconBg: '#fdeaea', value: dash(correctionBPage?.meta.total), label: 'Correction Req.', subtitle: 'Needs update', onPress: () => navigation.navigate('Bills', { screen: 'BillList' }) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isLoading, draftBPage, submittedBPage, approvedBPage, verifiedBPage, correctionBPage]);

  const kpiRowPayments = useMemo<KpiCardData[]>(() => [
    { id: 'vend', icon: 'storefront', iconColor: '#7c3aed', iconBg: '#f3e8fd', value: dash(vendorsPage?.meta.total), label: 'My Vendors', subtitle: 'Registered', onPress: () => navigation.navigate('Vendors', { screen: 'VendorList' }) },
    { id: 'pay_total', icon: 'card', iconColor: '#1e88e5', iconBg: '#dbeafe', value: isLoadingPaymentStats ? '—' : (paymentStats?.myPayments ?? 0), label: 'My Payments', subtitle: 'All time', onPress: () => navigation.navigate('Payments', { screen: 'PaymentList' }) },
    { id: 'pay_pending', icon: 'hourglass', iconColor: '#f59e0b', iconBg: '#fef3c7', value: isLoadingPaymentStats ? '—' : (paymentStats?.pending ?? 0), label: 'Pending Payments', subtitle: 'Processing' },
    { id: 'pay_done', icon: 'checkmark-done', iconColor: '#43a047', iconBg: '#e8f5e9', value: isLoadingPaymentStats ? '—' : (paymentStats?.completed ?? 0), label: 'Completed', subtitle: 'Payments', onPress: () => navigation.navigate('Payments', { screen: 'PaymentList', params: { initialStatus: 'completed' } }) },
    { id: 'notifications', icon: 'notifications', iconColor: '#e53935', iconBg: '#fdeaea', value: unreadCount ?? 0, label: 'Unread Alerts', subtitle: 'Notifications' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isLoading, isLoadingPaymentStats, vendorsPage, paymentStats, unreadCount]);

  const tasks = useMemo(() => [
    { label: 'Waiting for CEO Approval', count: isLoading ? '—' : waitingForCeo, onPress: () => navigation.navigate('Quotations', { screen: 'QuotationList' }) },
    { label: 'Waiting for Director Approval', count: isLoading ? '—' : waitingForDirectors, onPress: () => navigation.navigate('Quotations', { screen: 'QuotationList' }) },
    { label: 'Negotiation Required', count: isLoading ? '—' : (negotiationQPage?.meta.total ?? 0), onPress: () => navigation.navigate('Quotations', { screen: 'QuotationList' }) },
    { label: 'Bills Pending Approval', count: isLoading ? '—' : (submittedBPage?.meta.total ?? 0), onPress: () => navigation.navigate('Bills', { screen: 'BillList' }) },
    { label: 'Bills Returned (Correction)', count: isLoading ? '—' : (correctionBPage?.meta.total ?? 0), onPress: () => navigation.navigate('Bills', { screen: 'BillList' }) },
    { label: 'Unread Notifications', count: unreadCount ?? 0 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isLoading, quotations, submittedBPage, correctionBPage, waitingForCeo, waitingForDirectors, unreadCount]);

  const totalQ = totalQPage?.meta.total ?? 0;
  const approvedQ = approvedQPage?.meta.total ?? 0;
  const totalB = totalBPage?.meta.total ?? 0;
  const verifiedB = verifiedBPage?.meta.total ?? 0;

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
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{user?.name ?? 'there'} 👋</Text>
          </View>
          <View style={[styles.roleChip, { backgroundColor: '#e8f5e9' }]}>
            <Text style={[styles.roleChipText, { color: '#43a047' }]}>Dept. User</Text>
          </View>
        </View>

        <SectionHeader title="Quick Navigation" />
        <View style={styles.navButtonsContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Requirements', { screen: 'RequirementList', params: { initialStatus: 'all' } })}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrap, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="document-text" size={20} color="#1e88e5" />
            </View>
            <Text style={styles.navButtonLabel}>Requirements</Text>
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{dash(draftReqCount + submittedReqCount + inProgressReqCount)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Quotations', { screen: 'QuotationList' })}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrap, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="paper-plane" size={20} color="#43a047" />
            </View>
            <Text style={styles.navButtonLabel}>Quotations</Text>
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{dash(totalQ)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Bills', { screen: 'BillList' })}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrap, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="receipt" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.navButtonLabel}>Bills</Text>
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{dash(totalB)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Payments', { screen: 'PaymentList' })}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrap, { backgroundColor: '#f3e8fd' }]}>
              <Ionicons name="card" size={20} color="#7c3aed" />
            </View>
            <Text style={styles.navButtonLabel}>Payments</Text>
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{isLoadingPaymentStats ? '—' : (paymentStats?.myPayments ?? 0)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Vendors', { screen: 'VendorList' })}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrap, { backgroundColor: '#fce7f3' }]}>
              <Ionicons name="storefront" size={20} color="#db2777" />
            </View>
            <Text style={styles.navButtonLabel}>Vendors</Text>
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{dash(vendorsPage?.meta.total)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Bills', { screen: 'RecurringExpenseList' })}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrap, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="repeat" size={20} color="#4f46e5" />
            </View>
            <Text style={styles.navButtonLabel}>Recurring Expenses</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <SectionHeader title="Analytics" />
        <View style={styles.analyticsCard}>
          <AnalyticsBar label="Quotations Approved" value={approvedQ} max={Math.max(totalQ, 1)} color="#10b981" />
          <View style={styles.analyticsDivider} />
          <AnalyticsBar label="Bills Verified" value={verifiedB} max={Math.max(totalB, 1)} color="#3b82f6" />
        </View>

        <SectionHeader title="My Tasks" onViewAll={() => navigation.navigate('Quotations', { screen: 'QuotationList' })} />
        <View style={styles.listCard}>
          {tasks.map((task, idx) => (
            <TouchableOpacity
              key={task.label}
              onPress={task.onPress}
              activeOpacity={task.onPress ? 0.72 : 1}
              style={[styles.taskRow, idx < tasks.length - 1 && styles.taskRowBorder]}
            >
              <Text style={styles.taskLabel}>{task.label}</Text>
              <View style={styles.taskRight}>
                <View style={styles.taskBadge}>
                  <Text style={styles.taskBadgeText}>{task.count}</Text>
                </View>
                {task.onPress ? <Ionicons name="chevron-forward" size={14} color="#94a3b8" /> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 96 },

  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  welcomeText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  welcomeName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  roleChip: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4 },
  roleChipText: { fontSize: 10, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 9 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.9 },
  viewAll: { fontSize: 12, fontWeight: '600', color: '#1e88e5' },

  kpiCard: { width: KPI_CARD_WIDTH, backgroundColor: '#ffffff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  kpiIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', lineHeight: 28 },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 4 },
  kpiSubtitle: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  navButtonsContainer: { paddingHorizontal: 16, gap: 8 },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  navIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navButtonLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  navBadge: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  navBadgeText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  qaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  qaItemTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  qaTabLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  qaItemPrimary: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  qaPrimaryFab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  qaPrimaryLabel: { fontSize: 11, fontWeight: '700', color: '#e11d48', textAlign: 'center' },

  analyticsCard: { backgroundColor: '#ffffff', borderRadius: 14, marginHorizontal: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  analyticsDivider: { height: 12 },

  listCard: { backgroundColor: '#ffffff', borderRadius: 14, marginHorizontal: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  taskRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  taskLabel: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '500' },
  taskRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskBadge: { backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  taskBadgeText: { fontSize: 12, fontWeight: '700', color: '#1e88e5' },
});
