import { memo, useMemo } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { AnalyticsBar } from '@/components/dashboard/AnalyticsBar';
import { SparklineRow } from '@/components/dashboard/SparklineRow';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Screen } from '@/components/ui/Screen';
import { useGetDirectorBillStatsQuery } from '@/features/bills/api/billsApi';
import { useGetUnreadNotificationCountQuery } from '@/features/notifications/api/notificationsApi';
import { useGetDirectorQuotationStatsQuery } from '@/features/quotations/api/quotationsApi';
import { useGetRequirementsPageQuery } from '@/features/requirements/api/requirementsApi';
import { useAuth } from '@/hooks/useAuth';
import { useDrawer } from '@/navigation/context/DrawerContext';
import type { DirectorTabParamList } from '@/navigation/types';

type Props = BottomTabScreenProps<DirectorTabParamList, 'Dashboard'>;

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

interface QuickActionData { icon: string; color: string; label: string; onPress: () => void; }
const QuickAction = memo(function QuickAction({ icon, color, label, onPress }: QuickActionData) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.qaItem} activeOpacity={0.72}>
      <View style={[styles.qaIconWrap, { backgroundColor: `${color}1a` }]}>
        <Ionicons name={icon as never} size={22} color={color} />
      </View>
      <Text style={styles.qaLabel} numberOfLines={2}>{label}</Text>
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

export function DirectorDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const drawer = useDrawer();
  if (drawer) drawer.setTabNavigation(navigation);
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  // pollingInterval on every query below — matches Accounts/Payment dashboards — so this
  // screen reflects a Director's own "Sent Back" / another Director's decision, or a fresh
  // "Submit to Director", without needing a manual pull-to-refresh.
  const { data: stats, isLoading, isFetching, refetch } = useGetDirectorQuotationStatsQuery(undefined, { pollingInterval: 15000 });
  const { data: billStats, isLoading: isLoadingBillStats, isFetching: isFetchingBillStats, refetch: refetchBillStats } = useGetDirectorBillStatsQuery(undefined, { pollingInterval: 15000 });
  const { data: unreadCount } = useGetUnreadNotificationCountQuery();
  // Requirements a Director can currently act on: explicitly submitted by the Department User
  // but not yet opened (quotation_comparison) or already opened for review by someone
  // (director_review). quotation_collection is deliberately excluded — that status means the
  // Department User is still collecting/reviewing quotations and hasn't pressed "Submit to
  // Director" yet, so it was never actually the Director's to act on (see
  // docs/WORKFLOW_ENHANCEMENT_DIRECTOR_SUBMISSION.md). Accurate totals via `limit: 1` paged
  // calls (not `.length` over the capped-at-100 list, which — for the org-wide Director view —
  // is the dashboard most likely to actually exceed that cap in a real deployment).
  const { data: submittedReqPage, isLoading: isLoadingSubmittedReq, isFetching: isFetchingSubmittedReq, refetch: refetchSubmittedReq } = useGetRequirementsPageQuery({ page: 1, limit: 1, status: 'quotation_comparison' }, { pollingInterval: 15000 });
  const { data: directorReviewReqPage, isLoading: isLoadingDirectorReviewReq, isFetching: isFetchingDirectorReviewReq, refetch: refetchDirectorReviewReq } = useGetRequirementsPageQuery({ page: 1, limit: 1, status: 'director_review' }, { pollingInterval: 15000 });
  const isLoadingRequirements = isLoadingSubmittedReq || isLoadingDirectorReviewReq;

  // Pull-to-refresh previously only refetched `stats`, leaving billStats and both requirement
  // counts stale until the screen fully remounted — this is why the dashboard looked "stuck"
  // after a Send Back / Submit to Director / another Director's decision.
  const isRefreshing = (isFetching || isFetchingBillStats || isFetchingSubmittedReq || isFetchingDirectorReviewReq) && !isLoading;
  const refetchAll = () => {
    refetch();
    refetchBillStats();
    refetchSubmittedReq();
    refetchDirectorReviewReq();
  };

  const goToPendingQuotations = () => navigation.navigate('PendingQuotations', { screen: 'QuotationList' });
  const goToPendingBillApprovals = () => navigation.navigate('PendingBillApprovals', { screen: 'BillList' });
  const goToRequirements = () => navigation.navigate('Requirements', { screen: 'RequirementList' });
  const goToNotifications = () => {
    let nav = navigation as unknown as { getParent?: () => unknown; navigate: (name: string) => void };
    while (nav.getParent?.()) nav = nav.getParent!() as typeof nav;
    nav.navigate('NotificationCenter');
  };

  const isAnyLoading = isLoading || isLoadingBillStats || isLoadingRequirements;
  const dash = (v: number | undefined): string | number => (isAnyLoading ? '—' : (v ?? 0));

  const requirementsAwaitingReview = (submittedReqPage?.meta.total ?? 0) + (directorReviewReqPage?.meta.total ?? 0);

  // The top alert banner's count is a sum of three independent pending buckets — route to
  // whichever one actually has items instead of always assuming it's quotations, otherwise a
  // Director with only a Requirement awaiting review (0 pending quotations) gets sent to an
  // empty Quotations list and never reaches the Requirement that needs their decision.
  const goToPendingReview = () => {
    if (requirementsAwaitingReview > 0) goToRequirements();
    else if ((stats?.pending ?? 0) > 0) goToPendingQuotations();
    else if ((billStats?.pendingFinancialApprovals ?? 0) > 0) goToPendingBillApprovals();
    else goToPendingQuotations();
  };

  const kpiRow1 = useMemo<KpiCardData[]>(() => [
    { id: 'q_pending', icon: 'hourglass', iconColor: '#f59e0b', iconBg: '#fef3c7', value: dash(stats?.pending), label: 'Quotations Pending', subtitle: 'Awaiting review', onPress: goToPendingQuotations },
    { id: 'q_negotiation', icon: 'chatbox-ellipses', iconColor: '#e53935', iconBg: '#fdeaea', value: dash(stats?.negotiation), label: 'In Negotiation', subtitle: 'Quotations', onPress: goToPendingQuotations },
    { id: 'q_resubmitted', icon: 'refresh-circle', iconColor: '#1e88e5', iconBg: '#dbeafe', value: dash(stats?.resubmitted), label: 'Resubmitted', subtitle: 'Quotations', onPress: goToPendingQuotations },
    { id: 'q_approved', icon: 'checkmark-circle', iconColor: '#43a047', iconBg: '#e8f5e9', value: dash(stats?.approvedToday), label: 'Approved Today', subtitle: 'Quotations' },
    { id: 'q_rejected', icon: 'close-circle', iconColor: '#e53935', iconBg: '#fdeaea', value: dash(stats?.rejectedToday), label: 'Rejected Today', subtitle: 'Quotations' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isAnyLoading, stats]);

  const kpiRow2 = useMemo<KpiCardData[]>(() => [
    { id: 'b_pending', icon: 'receipt', iconColor: '#f59e0b', iconBg: '#fef3c7', value: dash(billStats?.pendingFinancialApprovals), label: 'Financial Approvals', subtitle: 'AI-Verified Bills', onPress: goToPendingBillApprovals },
    { id: 'b_highrisk', icon: 'alert-circle', iconColor: '#e53935', iconBg: '#fdeaea', value: dash(billStats?.highRiskBills), label: 'High Risk Bills', subtitle: 'Needs attention', onPress: goToPendingBillApprovals },
    { id: 'b_approved', icon: 'checkmark-circle', iconColor: '#43a047', iconBg: '#e8f5e9', value: dash(billStats?.approvedToday), label: 'Approved Today', subtitle: 'Bills' },
    { id: 'b_correction', icon: 'pencil', iconColor: '#1e88e5', iconBg: '#dbeafe', value: dash(billStats?.correctionToday), label: 'Corrections Today', subtitle: 'Bills' },
    { id: 'notifications', icon: 'notifications', iconColor: '#e53935', iconBg: '#fdeaea', value: unreadCount ?? 0, label: 'Unread Alerts', subtitle: 'Notifications' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isAnyLoading, billStats, unreadCount]);

  const pendingTotal = (stats?.pending ?? 0) + (billStats?.pendingFinancialApprovals ?? 0) + requirementsAwaitingReview;

  const tasks = useMemo(() => [
    { label: 'Requirements Awaiting Review', count: dash(requirementsAwaitingReview), onPress: goToRequirements },
    { label: 'Pending Quotation Reviews', count: dash(stats?.pending), onPress: goToPendingQuotations },
    { label: 'Negotiation Requests', count: dash(stats?.negotiation), onPress: goToPendingQuotations },
    { label: 'Resubmitted Quotations', count: dash(stats?.resubmitted), onPress: goToPendingQuotations },
    { label: 'Pending Financial Approvals', count: dash(billStats?.pendingFinancialApprovals), onPress: goToPendingBillApprovals },
    { label: 'High Risk Bills', count: dash(billStats?.highRiskBills), onPress: goToPendingBillApprovals },
    { label: 'Unread Notifications', count: unreadCount ?? 0 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isAnyLoading, stats, billStats, unreadCount, requirementsAwaitingReview]);

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
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} />}
      >
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{user?.name ?? 'Director'} 👋</Text>
          </View>
          <View style={[styles.roleChip, { backgroundColor: '#f3e8fd' }]}>
            <Text style={[styles.roleChipText, { color: '#7c3aed' }]}>Director</Text>
          </View>
        </View>

        {pendingTotal > 0 ? (
          <TouchableOpacity style={styles.alertBanner} onPress={goToPendingReview} activeOpacity={0.8}>
            <Ionicons name="alert-circle" size={15} color="#92400e" />
            <Text style={styles.alertText}>
              {pendingTotal} item{pendingTotal !== 1 ? 's' : ''} awaiting your review
            </Text>
            <Text style={styles.alertLink}>Review</Text>
          </TouchableOpacity>
        ) : null}

        <View className="mx-4 mt-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-100 dark:shadow-none">
          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">Overview Console</Text>
          <SparklineRow
            title="Requirements"
            subtitle="Awaiting director review"
            value={dash(requirementsAwaitingReview)}
            icon="document-text"
            iconColor="#1e88e5"
            iconBg="#e3f2fd"
            trendData={[1, 2, 2, 3, 3, requirementsAwaitingReview]}
            color="#1e88e5"
            onPress={goToRequirements}
          />
          <SparklineRow
            title="Quotations"
            subtitle="Pending director review"
            value={dash(stats?.pending)}
            icon="paper-plane"
            iconColor="#f59e0b"
            iconBg="#fef3c7"
            trendData={[2, 3, 4, 3, 5, stats?.pending ?? 0]}
            color="#f59e0b"
            onPress={goToPendingQuotations}
          />
          <SparklineRow
            title="Bills"
            subtitle="Pending financial approval"
            value={dash(billStats?.pendingFinancialApprovals)}
            icon="receipt"
            iconColor="#43a047"
            iconBg="#e8f5e9"
            trendData={[1, 2, 3, 4, 4, billStats?.pendingFinancialApprovals ?? 0]}
            color="#43a047"
            onPress={goToPendingBillApprovals}
          />
          <SparklineRow
            title="High Risk Bills"
            subtitle="Needs director attention"
            value={dash(billStats?.highRiskBills)}
            icon="alert-circle"
            iconColor="#e53935"
            iconBg="#fdeaea"
            trendData={[0, 1, 1, 0, 1, billStats?.highRiskBills ?? 0]}
            color="#e53935"
            onPress={goToPendingBillApprovals}
          />
        </View>

        <SectionHeader title="My Tasks" onViewAll={goToPendingQuotations} />
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

  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', borderRadius: 10, marginHorizontal: 16, marginBottom: 4, padding: 10, gap: 7 },
  alertText: { flex: 1, fontSize: 12, color: '#92400e', fontWeight: '500' },
  alertLink: { fontSize: 12, fontWeight: '700', color: '#d97706' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 9 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.9 },
  viewAll: { fontSize: 12, fontWeight: '600', color: '#1e88e5' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  mainKpiCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  kpiListContent: { paddingHorizontal: 16, paddingBottom: 2 },
  kpiCard: { width: KPI_CARD_WIDTH, backgroundColor: '#ffffff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  kpiIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', lineHeight: 28 },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 4 },
  kpiSubtitle: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  qaItem: { width: '48%', backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  qaIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#334155', lineHeight: 16 },

  listCard: { backgroundColor: '#ffffff', borderRadius: 14, marginHorizontal: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 8 },
  analyticsCard: { padding: 14 },
  analyticsGroupLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  analyticsDivider: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  taskRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  taskLabel: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '500' },
  taskRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskBadge: { backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  taskBadgeText: { fontSize: 12, fontWeight: '700', color: '#1e88e5' },
});
