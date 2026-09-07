import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGetActivityLogsPageQuery } from '@/features/activityLog/api/activityLogApi';
import type { ActivityLogEntry } from '@/features/activityLog/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { ProfileStackParamList } from '@/navigation/types';

const PAGE_SIZE = 20;
const SKELETON_PLACEHOLDERS = [1, 2, 3, 4, 5];

function humanizeAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function ActivityLogRow({ item }: { item: ActivityLogEntry }) {
  return (
    <View className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-sm font-semibold text-ink dark:text-white">{humanizeAction(item.action)}</Text>
        <Text className="text-[11px] text-ink-muted dark:text-slate-500">{formatDateTime(item.createdAt)}</Text>
      </View>
      <View className="mt-2 flex-row items-center gap-1.5">
        <Ionicons name="person-outline" size={13} color="#5f5f5f" />
        <Text className="text-xs text-ink-muted dark:text-slate-400">
          {item.performedByName} · {item.performedByRole.replace(/_/g, ' ')}
        </Text>
      </View>
      {item.departmentName ? (
        <View className="mt-1 flex-row items-center gap-1.5">
          <Ionicons name="business-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-400">{item.departmentName}</Text>
        </View>
      ) : null}
      {item.targetType ? (
        <View className="mt-1 flex-row items-center gap-1.5">
          <Ionicons name="pricetag-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-400">{item.targetType}</Text>
        </View>
      ) : null}
    </View>
  );
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'ActivityLog'>;

/** Generic action-audit trail — "who did what, and when" across the app. Super Admin sees
 *  every department's activity; a HOD sees only their own (enforced server-side). */
export function ActivityLogListScreen({ navigation }: Props) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetActivityLogsPageQuery({
    page,
    limit: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  useEffect(() => {
    if (data && page > data.meta.totalPages) setPage(data.meta.totalPages);
  }, [data, page]);

  return (
    <Screen padded={false}>
      <AppHeader title="Activity Log" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        {isLoading ? (
          <View>
            {SKELETON_PLACEHOLDERS.map((key) => (
              <Skeleton key={key} height={78} borderRadius={16} className="mb-3" />
            ))}
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ActivityLogRow item={item} />}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
            ListEmptyComponent={
              <EmptyState title="No Activity Yet" description="Actions taken across the app will show up here." />
            }
            ListFooterComponent={items.length > 0 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null}
          />
        )}
      </View>
    </Screen>
  );
}
