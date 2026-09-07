import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGetAiAuditLogsPageQuery } from '@/features/aiAuditLog/api/aiAuditLogApi';
import type { AiAuditLogEntry, AiAuditRisk } from '@/features/aiAuditLog/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { ProfileStackParamList } from '@/navigation/types';

const PAGE_SIZE = 20;
const SKELETON_PLACEHOLDERS = [1, 2, 3, 4, 5];

const RISK_TABS: { value: AiAuditRisk | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const RISK_VARIANT: Record<AiAuditRisk, 'success' | 'primary' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'primary',
  HIGH: 'danger',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function AiAuditLogRow({ item }: { item: AiAuditLogEntry }) {
  return (
    <View className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="text-sm font-semibold text-ink dark:text-white">
          {item.matchPercentage}% match · {item.recommendation.replace(/_/g, ' ')}
        </Text>
        <Badge label={item.risk} variant={RISK_VARIANT[item.risk]} />
      </View>
      <Text className="mt-1 text-[11px] text-ink-muted dark:text-slate-500">{formatDateTime(item.createdAt)}</Text>

      <View className="mt-2 flex-row items-center gap-1.5">
        <Ionicons name={item.success ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={13} color={item.success ? '#16a34a' : '#dc2626'} />
        <Text className="text-xs text-ink-muted dark:text-slate-400">
          {item.success ? 'Succeeded' : `Failed${item.errorMessage ? `: ${item.errorMessage}` : ''}`}
          {item.usedFallback ? ' (fallback provider)' : ''}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center gap-1.5">
        <Ionicons name="hardware-chip-outline" size={13} color="#5f5f5f" />
        <Text className="text-xs text-ink-muted dark:text-slate-400">
          {item.modelVersion} · {item.totalTokens} tokens · {item.executionTimeMs}ms
        </Text>
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'AiAuditLog'>;

/** Gemini AI verification run log — prompts, token usage, timing, and outcome of each 3-way
 *  (PO/Bill/Quotation) AI match call. Distinct from /audit-logs (the match decisions
 *  themselves, already surfaced in ComparisonScreen). Super Admin only. */
export function AiAuditLogListScreen({ navigation }: Props) {
  const [page, setPage] = useState(1);
  const [riskTab, setRiskTab] = useState<AiAuditRisk | 'all'>('all');

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAiAuditLogsPageQuery({
    page,
    limit: PAGE_SIZE,
    risk: riskTab === 'all' ? undefined : riskTab,
  });

  const items = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  useEffect(() => {
    if (data && page > data.meta.totalPages) setPage(data.meta.totalPages);
  }, [data, page]);

  const handleRiskChange = (value: AiAuditRisk | 'all') => {
    setRiskTab(value);
    setPage(1);
  };

  return (
    <Screen padded={false}>
      <AppHeader title="AI Audit Log" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        <FilterChipRow value={riskTab} options={RISK_TABS} onChange={handleRiskChange} />

        {isLoading ? (
          <View className="mt-4">
            {SKELETON_PLACEHOLDERS.map((key) => (
              <Skeleton key={key} height={90} borderRadius={16} className="mb-3" />
            ))}
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AiAuditLogRow item={item} />}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
            ListEmptyComponent={
              <EmptyState title="No AI Verification Runs Yet" description="Gemini verification runs will show up here." />
            }
            ListFooterComponent={items.length > 0 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null}
          />
        )}
      </View>
    </Screen>
  );
}
