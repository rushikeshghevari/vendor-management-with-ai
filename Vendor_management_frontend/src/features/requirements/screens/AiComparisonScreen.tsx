import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { useGenerateComparisonMutation, useGetComparisonQuery } from '@/features/comparison/api/comparisonApi';
import type {
  ComparisonItemEntry,
  ComparisonObservationSeverity,
  ComparisonQuotationSnapshot,
} from '@/features/comparison/types';
import { useGetRequirementByIdQuery } from '@/features/requirements/api/requirementsApi';
import { useAuth } from '@/hooks/useAuth';
import type { RequirementsStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/utils/getErrorMessage';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'AiComparison'>;

type SortMode = 'price_asc' | 'price_desc' | 'vendor';
type ItemFilter = 'all' | 'matched' | 'missing' | 'extra' | 'mismatch';

const SEVERITY_ICON: Record<ComparisonObservationSeverity, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle-outline',
  warning: 'warning-outline',
  critical: 'alert-circle-outline',
};

const SEVERITY_COLOR: Record<ComparisonObservationSeverity, string> = {
  info: '#5f5f5f',
  warning: '#d97706',
  critical: '#dc2626',
};

const OCR_BADGE: Record<string, { label: string; variant: 'primary' | 'success' | 'danger' | 'neutral' }> = {
  not_started: { label: 'OCR Not Started', variant: 'neutral' },
  processing: { label: 'OCR Processing…', variant: 'primary' },
  completed: { label: 'OCR Complete', variant: 'success' },
  failed: { label: 'OCR Failed', variant: 'danger' },
};

function formatCurrency(value: number | undefined, currency?: string): string {
  if (value === undefined) return '—';
  return `${currency ?? ''} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`.trim();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[46%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <Text className="text-[11px] text-ink-muted dark:text-slate-500">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">{value}</Text>
    </View>
  );
}

function QuotationCompareCard({ quotation, isRecommended }: { quotation: ComparisonQuotationSnapshot; isRecommended: boolean }) {
  const ocrBadge = OCR_BADGE[quotation.ocrStatus] ?? OCR_BADGE.not_started!;
  return (
    <View className={`mt-3 rounded-2xl border p-4 ${isRecommended ? 'border-primary-300 bg-primary-50/40 dark:border-primary-800 dark:bg-primary-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-semibold text-ink dark:text-white">{quotation.quotationCode}</Text>
            {isRecommended ? <Ionicons name="star" size={14} color="#1e88e5" /> : null}
          </View>
          <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">{quotation.vendorName}</Text>
        </View>
        <Badge label={ocrBadge.label} variant={ocrBadge.variant} />
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          Grand Total: <Text className="font-semibold text-ink dark:text-slate-200">{formatCurrency(quotation.grandTotal, quotation.currency)}</Text>
          {quotation.grandTotalSource === 'quotation' ? ' (manual)' : ''}
        </Text>
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          GST: <Text className="font-semibold text-ink dark:text-slate-200">{formatCurrency(quotation.gstAmount, quotation.currency)}</Text>
        </Text>
        {quotation.discount !== undefined ? (
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            Discount: <Text className="font-semibold text-ink dark:text-slate-200">{formatCurrency(quotation.discount, quotation.currency)}</Text>
          </Text>
        ) : null}
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          Items: <Text className="font-semibold text-ink dark:text-slate-200">{quotation.itemCount}</Text>
        </Text>
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          Delivery: <Text className="font-semibold text-ink dark:text-slate-200">{quotation.deliveryDays !== undefined ? `${quotation.deliveryDays} day(s)` : quotation.deliveryTerms ?? '—'}</Text>
        </Text>
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          Payment: <Text className="font-semibold text-ink dark:text-slate-200">{quotation.paymentTerms ?? '—'}</Text>
        </Text>
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          Date: <Text className="font-semibold text-ink dark:text-slate-200">{quotation.quotationDate ?? '—'}</Text>
        </Text>
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          Validity: <Text className="font-semibold text-ink dark:text-slate-200">{quotation.validity ?? 'Not Available'}</Text>
        </Text>
        {!quotation.hasAttachment ? (
          <Text className="text-xs font-semibold text-red-600 dark:text-red-400">No document uploaded</Text>
        ) : null}
        {quotation.ocrConfidence !== undefined ? (
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            OCR Confidence: <Text className="font-semibold text-ink dark:text-slate-200">{quotation.ocrConfidence}%</Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ItemCompareRow({ item }: { item: ComparisonItemEntry }) {
  const statusBadge = item.status === 'matched' ? (item.quantityMismatch || item.amountMismatch ? { label: 'Mismatch', variant: 'primary' as const } : { label: 'Matched', variant: 'success' as const })
    : item.status === 'missing' ? { label: 'Missing', variant: 'danger' as const }
    : { label: 'Extra', variant: 'neutral' as const };

  return (
    <View className="mt-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-sm font-medium text-ink dark:text-white">{item.itemName}</Text>
        <Badge label={statusBadge.label} variant={statusBadge.variant} />
      </View>
      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
        {item.requirementQuantity !== undefined ? (
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            Required Qty: <Text className="font-semibold text-ink dark:text-slate-200">{item.requirementQuantity}</Text>
          </Text>
        ) : null}
        {item.quotationQuantity !== undefined ? (
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            Quoted Qty: <Text className={`font-semibold ${item.quantityMismatch ? 'text-red-600 dark:text-red-400' : 'text-ink dark:text-slate-200'}`}>{item.quotationQuantity}</Text>
          </Text>
        ) : null}
        {item.requirementRate !== undefined ? (
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            Est. Rate: <Text className="font-semibold text-ink dark:text-slate-200">₹{item.requirementRate.toLocaleString()}</Text>
          </Text>
        ) : null}
        {item.quotationUnitPrice !== undefined ? (
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            Quoted Rate: <Text className={`font-semibold ${item.unitPriceDifference ? 'text-amber-600 dark:text-amber-400' : 'text-ink dark:text-slate-200'}`}>₹{item.quotationUnitPrice.toLocaleString()}</Text>
          </Text>
        ) : null}
        {item.amountMismatch ? <Text className="text-xs font-semibold text-red-600 dark:text-red-400">Amount mismatch</Text> : null}
      </View>
    </View>
  );
}

export function AiComparisonScreen({ navigation, route }: Props) {
  const { requirementId } = route.params;
  const { hasRole, user } = useAuth();
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const isHod = hasRole(ROLES.HOD);

  const { data: requirement } = useGetRequirementByIdQuery(requirementId);
  // Read-only once a decision has been made on the requirement — mirrors comparisonService
  // .generate()'s COMPARISON_LOCKED_STATUSES gate exactly (see
  // docs/WORKFLOW_ENHANCEMENT_DIRECTOR_SUBMISSION.md).
  const isLocked = requirement?.status === 'approved' || requirement?.status === 'rejected'
    || requirement?.status === 'vendor_finalized' || requirement?.status === 'closed';
  const canGenerate = !isLocked && (isSuperAdmin || isHod || requirement?.createdById === user?.id);

  const { data: comparison, isLoading, isFetching, error } = useGetComparisonQuery(requirementId);
  const [generateComparison, { isLoading: isGenerating }] = useGenerateComparisonMutation();

  const [sortMode, setSortMode] = useState<SortMode>('price_asc');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [itemFilter, setItemFilter] = useState<ItemFilter>('all');

  const sortedQuotations = useMemo(() => {
    if (!comparison) return [];
    const items = [...comparison.quotations];
    items.sort((a, b) => {
      if (sortMode === 'price_asc') return (a.grandTotal ?? Infinity) - (b.grandTotal ?? Infinity);
      if (sortMode === 'price_desc') return (b.grandTotal ?? -Infinity) - (a.grandTotal ?? -Infinity);
      return a.vendorName.localeCompare(b.vendorName);
    });
    return items;
  }, [comparison, sortMode]);

  const activeQuotationId = selectedQuotationId ?? comparison?.itemComparison[0]?.quotationId ?? null;
  const activeItemComparison = comparison?.itemComparison.find((ic) => ic.quotationId === activeQuotationId);

  const filteredItems = useMemo(() => {
    if (!activeItemComparison) return [];
    return activeItemComparison.items.filter((item) => {
      if (itemFilter === 'all') return true;
      if (itemFilter === 'mismatch') return item.quantityMismatch || item.amountMismatch;
      return item.status === itemFilter;
    });
  }, [activeItemComparison, itemFilter]);

  const handleGenerate = async () => {
    try {
      await generateComparison(requirementId).unwrap();
    } catch (err) {
      Alert.alert('Could Not Generate Comparison', getErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="AI Comparison" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  const notGeneratedYet = !comparison && !!error;

  return (
    <Screen padded={false}>
      <AppHeader title="AI Comparison" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        {notGeneratedYet ? (
          <DashboardCard>
            <View className="items-center py-6">
              <Ionicons name="git-compare-outline" size={28} color="#94a3b8" />
              <Text className="mt-3 text-center text-sm text-ink-muted dark:text-slate-400">
                No comparison has been generated yet for this requirement.
              </Text>
              {canGenerate ? (
                <Button label="Generate Comparison" loading={isGenerating} onPress={handleGenerate} className="mt-4" />
              ) : null}
            </View>
          </DashboardCard>
        ) : null}

        {comparison ? (
          <>
            <DashboardCard>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-ink dark:text-white">Comparison Summary</Text>
                {isFetching ? <Loader /> : null}
              </View>
              <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">
                Generated {formatDateTime(comparison.generatedAt)} · {comparison.statistics.totalQuotations} quotation(s) compared
              </Text>
              {canGenerate ? (
                <Button label="Regenerate Comparison" variant="secondary" loading={isGenerating} onPress={handleGenerate} className="mt-3" />
              ) : null}
            </DashboardCard>

            <DashboardCard className="mt-4">
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">Statistics</Text>
              <View className="mt-3 flex-row flex-wrap gap-3">
                <StatTile label="Lowest Price" value={formatCurrency(comparison.statistics.lowestPrice)} />
                <StatTile label="Highest Price" value={formatCurrency(comparison.statistics.highestPrice)} />
                <StatTile label="Average Price" value={formatCurrency(comparison.statistics.averagePrice)} />
                <StatTile label="Cost Difference" value={formatCurrency(comparison.statistics.costDifference)} />
                <StatTile
                  label="Budget Variance"
                  value={
                    comparison.statistics.budgetVariancePercent !== undefined
                      ? `${comparison.statistics.budgetVariancePercent > 0 ? '+' : ''}${comparison.statistics.budgetVariancePercent.toFixed(1)}%`
                      : '—'
                  }
                />
                <StatTile label="Total Quotations" value={String(comparison.statistics.totalQuotations)} />
              </View>
            </DashboardCard>

            <DashboardCard className="mt-4 border border-primary-100 dark:border-primary-900/40">
              <View className="flex-row items-center gap-2">
                <Ionicons name="sparkles-outline" size={18} color="#1e88e5" />
                <Text className="text-sm font-semibold text-ink dark:text-slate-200">AI Recommendation</Text>
              </View>
              {comparison.recommendation.quotationCode ? (
                <Text className="mt-2 text-sm font-semibold text-ink dark:text-white">{comparison.recommendation.quotationCode}</Text>
              ) : null}
              <Text className="mt-1 text-sm text-ink-muted dark:text-slate-400">{comparison.recommendation.reason}</Text>
              <View className="mt-2 flex-row items-center gap-1.5">
                <Ionicons name="information-circle-outline" size={13} color="#5f5f5f" />
                <Text className="flex-1 text-[11px] text-ink-muted dark:text-slate-500">
                  Recommendation only — not an approval. Final decision requires Director review.
                </Text>
              </View>
            </DashboardCard>

            {comparison.observations.length > 0 ? (
              <DashboardCard className="mt-4">
                <Text className="text-sm font-semibold text-ink dark:text-slate-200">AI Observations ({comparison.observations.length})</Text>
                {comparison.observations.map((observation, index) => (
                  <View key={`${observation.type}-${index}`} className="mt-3 flex-row items-start gap-2">
                    <Ionicons name={SEVERITY_ICON[observation.severity]} size={16} color={SEVERITY_COLOR[observation.severity]} style={{ marginTop: 1 }} />
                    <Text className="flex-1 text-sm text-ink dark:text-slate-300">{observation.message}</Text>
                  </View>
                ))}
              </DashboardCard>
            ) : null}

            <DashboardCard className="mt-4">
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">Vendor Comparison</Text>
              <View className="mt-3">
                <FilterChipRow
                  value={sortMode}
                  options={[
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'vendor', label: 'Vendor Name' },
                  ]}
                  onChange={setSortMode}
                />
              </View>
              {sortedQuotations.map((quotation) => (
                <QuotationCompareCard
                  key={quotation.quotationId}
                  quotation={quotation}
                  isRecommended={quotation.quotationId === comparison.recommendation.quotationId}
                />
              ))}
            </DashboardCard>

            <DashboardCard className="mt-4">
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">Item Comparison</Text>
              <View className="mt-3">
                <FilterChipRow
                  value={activeQuotationId ?? ''}
                  options={comparison.itemComparison.map((ic) => ({ value: ic.quotationId, label: ic.quotationCode }))}
                  onChange={setSelectedQuotationId}
                />
              </View>
              <View className="mt-3">
                <FilterChipRow
                  value={itemFilter}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'matched', label: 'Matched' },
                    { value: 'missing', label: 'Missing' },
                    { value: 'extra', label: 'Extra' },
                    { value: 'mismatch', label: 'Mismatch' },
                  ]}
                  onChange={setItemFilter}
                />
              </View>
              {filteredItems.length === 0 ? (
                <Text className="mt-4 text-sm text-ink-muted dark:text-slate-400">No items match this filter.</Text>
              ) : (
                filteredItems.map((item, index) => <ItemCompareRow key={`${item.itemName}-${index}`} item={item} />)
              )}
            </DashboardCard>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
