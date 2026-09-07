import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/ui/Screen';
import { useDrawer } from '@/navigation/context/DrawerContext';
import { useGetQuotationsQuery } from '@/features/quotations/api/quotationsApi';
import type { QuotationStatus } from '@/features/quotations/types';
import { useGetBillsQuery } from '@/features/bills/api/billsApi';
import type { BillStatus } from '@/features/bills/types';
import { useGetPaymentsQuery } from '@/features/payments/api/paymentsApi';
import type { PaymentStatus } from '@/features/payments/types';
import { useGetVendorsQuery } from '@/features/vendors/api/vendorsApi';
import { useGetUsersQuery } from '@/features/users/api/usersApi';
import { useGetDepartmentsQuery } from '@/features/departments/api/departmentsApi';
import { ROLES } from '@/constants/roles';

// ─── Types ──────────────────────────────────────────────────────────────────

type DateRangeKey = '7d' | '30d' | '90d' | 'all';

interface StatItem {
  label: string;
  value: number;
  color: string;
}

interface MonthlyBar {
  label: string;
  count: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

const QUOTATION_FILTER_OPTS: readonly QuotationStatus[] = [
  'draft', 'submitted', 'negotiation', 'resubmitted', 'approved', 'rejected', 'billed',
];

const QUOTATION_FILTER_LABELS: Record<QuotationStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', negotiation: 'Negotiation',
  resubmitted: 'Resubmitted', approved: 'Approved', rejected: 'Rejected', billed: 'Billed',
};

const BILL_FILTER_OPTS: readonly BillStatus[] = [
  'draft', 'submitted', 'ai_verified', 'director_approved', 'director_rejected', 'director_correction',
  'correction_requested', 'verified', 'rejected', 'payment_pending', 'paid', 'completed',
];

const BILL_FILTER_LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', ai_verified: 'AI Verified',
  director_approved: 'With Accounts', director_rejected: 'Dir. Rejected', director_correction: 'Dir. Correction',
  correction_requested: 'Correction', verified: 'Verified', rejected: 'Rejected',
  payment_pending: 'Pay Pending', paid: 'Paid', completed: 'Completed',
};

const PAYMENT_FILTER_OPTS: readonly PaymentStatus[] = [
  'payment_pending', 'processing', 'paid', 'completed', 'failed',
];

const PAYMENT_FILTER_LABELS: Record<PaymentStatus, string> = {
  payment_pending: 'Pending', processing: 'Processing',
  paid: 'Paid', completed: 'Completed', failed: 'Failed',
};

const MAX_BAR_HEIGHT = 72;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterByDateRange<T extends { createdAt: string }>(
  items: T[],
  range: DateRangeKey,
): T[] {
  if (range === 'all') return items;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = Date.now() - days * 86_400_000;
  return items.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
}

function getMonthlyTrend(items: Array<{ createdAt: string }>): MonthlyBar[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    const count = items.filter((item) => {
      const c = new Date(item.createdAt);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    return { label, count };
  });
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionTitle = memo(function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
});

const KpiSummaryCard = memo(function KpiSummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconBg, { backgroundColor: `${color}1a` }]}>
        <Ionicons name={icon as never} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
});

const StatCard = memo(function StatCard({ label, value, color }: StatItem) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statAccent, { backgroundColor: color }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
});

function FilterChips({
  options,
  selected,
  onSelect,
  labelMap,
}: {
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
  labelMap: Record<string, string>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      <TouchableOpacity
        onPress={() => onSelect('all')}
        style={[styles.chip, selected === 'all' && styles.chipActive]}
        activeOpacity={0.75}
      >
        <Text style={[styles.chipText, selected === 'all' && styles.chipTextActive]}>All</Text>
      </TouchableOpacity>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt)}
          style={[styles.chip, selected === opt && styles.chipActive]}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>
            {labelMap[opt] ?? opt.replace(/_/g, ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const MiniBarChart = memo(function MiniBarChart({
  data,
  color,
}: {
  data: MonthlyBar[];
  color: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartBars}>
        {data.map((item) => {
          const barH = Math.max(Math.round((item.count / max) * MAX_BAR_HEIGHT), item.count > 0 ? 4 : 0);
          return (
            <View key={item.label} style={styles.chartBarCol}>
              {item.count > 0 ? (
                <Text style={styles.chartCount}>{item.count}</Text>
              ) : (
                <Text style={styles.chartCountEmpty}> </Text>
              )}
              <View style={styles.chartBarOuter}>
                <View
                  style={[styles.chartBarFill, { height: barH, backgroundColor: color }]}
                />
              </View>
              <Text style={styles.chartLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const NoData = memo(function NoData({ message = 'No records found' }: { message?: string }) {
  return (
    <View style={styles.noData}>
      <Ionicons name="document-outline" size={28} color="#cbd5e1" />
      <Text style={styles.noDataText}>{message}</Text>
    </View>
  );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function ReportsScreen() {
  useDrawer(); // consume context so future drawer integration can access it

  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [qStatus, setQStatus] = useState<QuotationStatus | 'all'>('all');
  const [bStatus, setBStatus] = useState<BillStatus | 'all'>('all');
  const [pStatus, setPStatus] = useState<PaymentStatus | 'all'>('all');

  // ── Data queries ────────────────────────────────────────────────────────
  const { data: allQuotations = [], isLoading: qLoading, refetch: refetchQ } = useGetQuotationsQuery();
  const { data: allBills = [], isLoading: bLoading, refetch: refetchB } = useGetBillsQuery();
  const { data: allPayments = [], isLoading: pLoading, refetch: refetchP } = useGetPaymentsQuery();
  const { data: allVendors = [], isLoading: vLoading } = useGetVendorsQuery();
  const { data: allUsers = [], isLoading: uLoading } = useGetUsersQuery();
  const { data: allDepartments = [] } = useGetDepartmentsQuery();

  const isLoading = qLoading || bLoading || pLoading || vLoading || uLoading;

  const handleRefresh = useCallback(() => {
    void refetchQ();
    void refetchB();
    void refetchP();
  }, [refetchQ, refetchB, refetchP]);

  // ── Client-side filtered lists ──────────────────────────────────────────
  const quotations = useMemo(() => {
    const byDate = filterByDateRange(allQuotations, dateRange);
    return qStatus === 'all' ? byDate : byDate.filter((q) => q.status === qStatus);
  }, [allQuotations, dateRange, qStatus]);

  const bills = useMemo(() => {
    const byDate = filterByDateRange(allBills, dateRange);
    return bStatus === 'all' ? byDate : byDate.filter((b) => b.status === bStatus);
  }, [allBills, dateRange, bStatus]);

  const payments = useMemo(() => {
    const byDate = filterByDateRange(allPayments, dateRange);
    return pStatus === 'all' ? byDate : byDate.filter((p) => p.status === pStatus);
  }, [allPayments, dateRange, pStatus]);

  // ── Derived stats ───────────────────────────────────────────────────────
  const qStats = useMemo((): StatItem[] => [
    { label: 'Total', value: quotations.length, color: '#1e88e5' },
    { label: 'Pending', value: quotations.filter((q) => ['submitted', 'negotiation', 'resubmitted'].includes(q.status)).length, color: '#f59e0b' },
    { label: 'Approved', value: quotations.filter((q) => ['approved', 'billed'].includes(q.status)).length, color: '#10b981' },
    { label: 'Negotiation', value: quotations.filter((q) => q.status === 'negotiation').length, color: '#8b5cf6' },
    { label: 'Rejected', value: quotations.filter((q) => q.status === 'rejected').length, color: '#ef4444' },
    { label: 'Draft', value: quotations.filter((q) => q.status === 'draft').length, color: '#94a3b8' },
  ], [quotations]);

  const bStats = useMemo((): StatItem[] => [
    { label: 'Total', value: bills.length, color: '#1e88e5' },
    { label: 'AI Verified', value: bills.filter((b) => b.status === 'ai_verified').length, color: '#f59e0b' },
    { label: 'With Accounts', value: bills.filter((b) => b.status === 'director_approved').length, color: '#3b82f6' },
    { label: 'Dir. Rejected', value: bills.filter((b) => b.status === 'director_rejected').length, color: '#ef4444' },
    { label: 'Verified', value: bills.filter((b) => b.status === 'verified').length, color: '#10b981' },
    { label: 'Payment Pending', value: bills.filter((b) => b.status === 'payment_pending').length, color: '#8b5cf6' },
    { label: 'Completed', value: bills.filter((b) => ['paid', 'completed'].includes(b.status)).length, color: '#059669' },
  ], [bills]);

  const pStats = useMemo((): StatItem[] => [
    { label: 'Total', value: payments.length, color: '#1e88e5' },
    { label: 'Pending', value: payments.filter((p) => p.status === 'payment_pending').length, color: '#f59e0b' },
    { label: 'Processing', value: payments.filter((p) => p.status === 'processing').length, color: '#8b5cf6' },
    { label: 'Paid', value: payments.filter((p) => p.status === 'paid').length, color: '#10b981' },
    { label: 'Completed', value: payments.filter((p) => p.status === 'completed').length, color: '#059669' },
    { label: 'Failed', value: payments.filter((p) => p.status === 'failed').length, color: '#ef4444' },
  ], [payments]);

  const vStats = useMemo((): StatItem[] => [
    { label: 'Total', value: allVendors.length, color: '#1e88e5' },
    { label: 'Active', value: allVendors.filter((v) => v.status === 'active').length, color: '#10b981' },
    { label: 'Inactive', value: allVendors.filter((v) => v.status === 'inactive').length, color: '#f59e0b' },
    { label: 'Blacklisted', value: allVendors.filter((v) => v.status === 'blacklisted').length, color: '#ef4444' },
  ], [allVendors]);

  const uStats = useMemo((): StatItem[] => [
    { label: 'Total', value: allUsers.length, color: '#1e88e5' },
    { label: 'Dept Users', value: allUsers.filter((u) => u.role === ROLES.DEPARTMENT_USER).length, color: '#3b82f6' },
    { label: 'CEO', value: allUsers.filter((u) => u.role === ROLES.CEO).length, color: '#f59e0b' },
    { label: 'Directors', value: allUsers.filter((u) => u.role === ROLES.DIRECTOR).length, color: '#8b5cf6' },
    { label: 'Accounts', value: allUsers.filter((u) => u.role === ROLES.ACCOUNTS).length, color: '#10b981' },
    { label: 'Payments Dept', value: allUsers.filter((u) => u.role === ROLES.PAYMENT_DEPARTMENT).length, color: '#059669' },
  ], [allUsers]);

  // ── KPI summary (always all-time counts) ─────────────────────────────────
  const kpiItems = useMemo(() => [
    { label: 'Quotations', value: allQuotations.length, icon: 'document-text-outline', color: '#1e88e5' },
    { label: 'Bills', value: allBills.length, icon: 'receipt-outline', color: '#8b5cf6' },
    { label: 'Payments', value: allPayments.length, icon: 'cash-outline', color: '#10b981' },
    { label: 'Vendors', value: allVendors.length, icon: 'business-outline', color: '#f59e0b' },
    { label: 'Users', value: allUsers.length, icon: 'people-outline', color: '#ef4444' },
    { label: 'Departments', value: allDepartments.length, icon: 'grid-outline', color: '#06b6d4' },
  ], [allQuotations.length, allBills.length, allPayments.length, allVendors.length, allUsers.length, allDepartments.length]);

  // ── Monthly trends (always all-time data, independent of date filter) ───
  const monthlyQ = useMemo(() => getMonthlyTrend(allQuotations), [allQuotations]);
  const monthlyB = useMemo(() => getMonthlyTrend(allBills), [allBills]);
  const monthlyP = useMemo(() => getMonthlyTrend(allPayments), [allPayments]);

  // ── Department activity table ─────────────────────────────────────────────
  const deptActivity = useMemo(() => {
    return allDepartments
      .map((dept) => ({
        id: dept.id,
        name: dept.name,
        quotations: allQuotations.filter((q) => q.departmentId === dept.id).length,
        bills: allBills.filter((b) => b.departmentId === dept.id).length,
        payments: allPayments.filter((p) => p.departmentId === dept.id).length,
      }))
      .filter((d) => d.quotations > 0 || d.bills > 0 || d.payments > 0);
  }, [allDepartments, allQuotations, allBills, allPayments]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Screen padded={false}>
      <AppHeader
        title="Reports"
        rightSlot={
          <TouchableOpacity
            onPress={handleRefresh}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Refresh reports"
            style={isLoading ? { opacity: 0.5 } : undefined}
            disabled={isLoading}
          >
            <Ionicons name="refresh-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Loading banner */}
        {isLoading ? (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#1e88e5" />
            <Text style={styles.loadingText}>Loading report data…</Text>
          </View>
        ) : null}

        {/* ── Date Range Filter ── */}
        <View style={styles.dateRangeRow}>
          {DATE_RANGE_OPTIONS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setDateRange(key)}
              style={[styles.dateChip, dateRange === key && styles.dateChipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.dateChipText, dateRange === key && styles.dateChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 1. Dashboard Summary ── */}
        <SectionTitle title="Dashboard Summary" subtitle="All-time entity counts" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
        >
          {kpiItems.map((item) => (
            <KpiSummaryCard key={item.label} {...item} />
          ))}
        </ScrollView>

        {/* ── 2. Quotation Reports ── */}
        <SectionTitle
          title="Quotation Reports"
          subtitle={plural(quotations.length, 'record') + ' in selected range'}
        />
        <FilterChips
          options={QUOTATION_FILTER_OPTS}
          selected={qStatus}
          onSelect={(v) => setQStatus(v as QuotationStatus | 'all')}
          labelMap={QUOTATION_FILTER_LABELS}
        />
        {quotations.length === 0 ? (
          <NoData />
        ) : (
          <View style={styles.statsGrid}>
            {qStats.map((s) => <StatCard key={s.label} {...s} />)}
          </View>
        )}

        {/* ── 3. Bill Reports ── */}
        <SectionTitle
          title="Bill Reports"
          subtitle={plural(bills.length, 'record') + ' in selected range'}
        />
        <FilterChips
          options={BILL_FILTER_OPTS}
          selected={bStatus}
          onSelect={(v) => setBStatus(v as BillStatus | 'all')}
          labelMap={BILL_FILTER_LABELS}
        />
        {bills.length === 0 ? (
          <NoData />
        ) : (
          <View style={styles.statsGrid}>
            {bStats.map((s) => <StatCard key={s.label} {...s} />)}
          </View>
        )}

        {/* ── 4. Payment Reports ── */}
        <SectionTitle
          title="Payment Reports"
          subtitle={plural(payments.length, 'record') + ' in selected range'}
        />
        <FilterChips
          options={PAYMENT_FILTER_OPTS}
          selected={pStatus}
          onSelect={(v) => setPStatus(v as PaymentStatus | 'all')}
          labelMap={PAYMENT_FILTER_LABELS}
        />
        {payments.length === 0 ? (
          <NoData />
        ) : (
          <View style={styles.statsGrid}>
            {pStats.map((s) => <StatCard key={s.label} {...s} />)}
          </View>
        )}

        {/* ── 5. Vendor Reports ── */}
        <SectionTitle title="Vendor Reports" subtitle="All registered vendors" />
        {allVendors.length === 0 ? (
          <NoData />
        ) : (
          <View style={styles.statsGrid}>
            {vStats.map((s) => <StatCard key={s.label} {...s} />)}
          </View>
        )}

        {/* ── 6. User Reports ── */}
        <SectionTitle title="User Reports" subtitle="All system users" />
        {allUsers.length === 0 ? (
          <NoData />
        ) : (
          <View style={styles.statsGrid}>
            {uStats.map((s) => <StatCard key={s.label} {...s} />)}
          </View>
        )}

        {/* ── 7a. Monthly Trends ── */}
        <SectionTitle title="Monthly Trends" subtitle="Last 6 months · All-time data" />

        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Monthly Quotations</Text>
          {allQuotations.length === 0 ? (
            <NoData message="No quotation data" />
          ) : (
            <MiniBarChart data={monthlyQ} color="#1e88e5" />
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Monthly Bills</Text>
          {allBills.length === 0 ? (
            <NoData message="No bill data" />
          ) : (
            <MiniBarChart data={monthlyB} color="#8b5cf6" />
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Monthly Payments</Text>
          {allPayments.length === 0 ? (
            <NoData message="No payment data" />
          ) : (
            <MiniBarChart data={monthlyP} color="#10b981" />
          )}
        </View>

        {/* ── 7b. Department-wise Activity ── */}
        <SectionTitle title="Department Activity" subtitle="Quotations · Bills · Payments per dept" />
        {deptActivity.length === 0 ? (
          <NoData message="No department activity yet" />
        ) : (
          <View style={styles.tableCard}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableCell, styles.tableCellDept, styles.tableHeaderText]}>Department</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Quot.</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Bills</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Pmts</Text>
            </View>
            {deptActivity.map((dept, idx) => (
              <View
                key={dept.id}
                style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCell, styles.tableCellDept]} numberOfLines={1}>
                  {dept.name}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellNum]}>{dept.quotations}</Text>
                <Text style={[styles.tableCell, styles.tableCellNum]}>{dept.bills}</Text>
                <Text style={[styles.tableCell, styles.tableCellNum]}>{dept.payments}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 8. Export ── */}
        <SectionTitle title="Export Reports" />
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() =>
              Alert.alert(
                'Export PDF',
                'PDF export will be available in the next release. Your report data is ready to export once the feature launches.',
              )
            }
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Export PDF — Available in next release"
          >
            <Ionicons name="document-text-outline" size={20} color="#94a3b8" />
            <View style={styles.exportBtnTexts}>
              <Text style={styles.exportBtnLabel}>Export PDF</Text>
              <Text style={styles.exportBtnNote}>Available in next release</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() =>
              Alert.alert(
                'Export Excel',
                'Excel export will be available in the next release. Your report data is ready to export once the feature launches.',
              )
            }
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Export Excel — Available in next release"
          >
            <Ionicons name="grid-outline" size={20} color="#94a3b8" />
            <View style={styles.exportBtnTexts}>
              <Text style={styles.exportBtnLabel}>Export Excel</Text>
              <Text style={styles.exportBtnNote}>Available in next release</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },

  // ── Loading banner
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  loadingText: {
    fontSize: 13,
    color: '#1e88e5',
    fontWeight: '500',
  },

  // ── Date range filter
  dateRangeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  dateChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: '#1e88e5',
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dateChipTextActive: {
    color: '#ffffff',
  },

  // ── Section header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  // ── KPI summary row
  kpiRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 10,
  },
  kpiCard: {
    width: 110,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Status filter chips
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#1e88e5',
    borderColor: '#1e88e5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
  },

  // ── Stat grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  statCard: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
    minWidth: 90,
  },
  statAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Charts
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  chartCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  chartWrap: {
    height: MAX_BAR_HEIGHT + 44,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT + 44,
    gap: 4,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: MAX_BAR_HEIGHT + 44,
  },
  chartCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
    minHeight: 14,
  },
  chartCountEmpty: {
    fontSize: 10,
    minHeight: 14,
  },
  chartBarOuter: {
    width: '100%',
    height: MAX_BAR_HEIGHT,
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 3,
  },
  chartLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },

  // ── Department activity table
  tableCard: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tableHeaderRow: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableHeaderText: {
    fontWeight: '700',
    color: '#64748b',
  },
  tableCell: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    textAlign: 'center',
  },
  tableCellDept: {
    flex: 3,
    textAlign: 'left',
    fontWeight: '500',
  },
  tableCellNum: {
    fontWeight: '600',
    color: '#1e293b',
  },

  // ── No data
  noData: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  noDataText: {
    fontSize: 13,
    color: '#94a3b8',
  },

  // ── Export
  exportRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  exportBtnTexts: {
    flex: 1,
  },
  exportBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  exportBtnNote: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 1,
  },
});
