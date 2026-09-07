import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountsBillFilterSheet, type AccountsBillFilters } from '@/components/accounts/AccountsBillFilterSheet';
import { BillCard } from '@/components/bills/BillCard';
import { BillSearch } from '@/components/bills/BillSearch';
import { BillSkeleton } from '@/components/bills/BillSkeleton';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Screen } from '@/components/ui/Screen';
import { useGetBillsPageQuery, useGetBillsQuery } from '@/features/bills/api/billsApi';
import type { Bill, BillStatus } from '@/features/bills/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { AccountsBillsStackParamList } from '@/navigation/types';

const PAGE_SIZE = 5;
const SKELETON_PLACEHOLDERS = [1, 2, 3, 4];

// Accounts never sees Draft/Submitted/AI Verified (the Director Financial Approval
// stage) or the upstream `director_rejected` outcome — these are the only statuses the Bill
// List reviews, starting from `director_approved` (the bill has cleared Director Financial Approval).
const STATUS_TABS: { value: BillStatus; label: string }[] = [
  { value: 'director_approved', label: 'Awaiting Verification' },
  { value: 'correction_requested', label: 'Correction Requested' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

type Props = NativeStackScreenProps<AccountsBillsStackParamList, 'AccountsBillList'>;

export function AccountsBillListScreen({ navigation, route }: Props) {
  const searchInputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [statusTab, setStatusTab] = useState<BillStatus>(route.params?.initialStatus ?? 'director_approved');
  const [page, setPage] = useState(1);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState<AccountsBillFilters>({});

  useEffect(() => {
    if (route.params?.initialStatus) {
      setStatusTab(route.params.initialStatus);
      navigation.setParams({ initialStatus: undefined });
    }
  }, [route.params?.initialStatus, navigation]);

  // Accounts must see a bill the moment a Director approves it, without reopening the screen
  // (matches the same pattern already used for the Director's own bill list). Real server-side
  // pagination/filter/search now — not `.length`/`.filter()` over the capped-at-100 `getBills`,
  // which silently under-counted/under-showed past 100 rows.
  const { data: pagedData, isLoading, isFetching, isError, error, refetch } = useGetBillsPageQuery({
    page,
    limit: PAGE_SIZE,
    status: statusTab,
    search: debouncedSearch.trim() || undefined,
    vendor: filters.vendorId,
    department: filters.departmentId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  }, { pollingInterval: 15000 });

  const pagedBills = pagedData?.items ?? [];
  const totalPages = pagedData?.meta.totalPages ?? 1;

  useEffect(() => {
    if (pagedData && page > pagedData.meta.totalPages) setPage(pagedData.meta.totalPages);
  }, [pagedData, page]);

  // Vendor/department filter *options* still read the capped-at-100 `getBills` — a UI nicety
  // (populating the filter sheet's dropdowns), never the displayed/counted bill list itself.
  const { data: bills } = useGetBillsQuery();
  const vendorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (bills ?? []).forEach((item) => seen.set(item.vendorId, item.vendorName));
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [bills]);

  const departmentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (bills ?? []).forEach((item) => seen.set(item.departmentId, item.departmentName));
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [bills]);

  const activeFilterCount = [filters.vendorId, filters.departmentId, filters.dateFrom, filters.dateTo].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleCardPress = (bill: Bill) => navigation.navigate('AccountsBillDetails', { billId: bill.id });

  return (
    <Screen padded={false}>
      <AppHeader title="Bills" />

      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <BillSearch ref={searchInputRef} value={searchQuery} onChangeText={handleSearchChange} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter bills"
            onPress={() => setIsFilterVisible(true)}
            className="relative h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <Ionicons name="filter-outline" size={20} color="#1e88e5" />
            {activeFilterCount > 0 ? (
              <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-primary-600" />
            ) : null}
          </Pressable>
        </View>

        <View className="mt-3">
          <FilterChipRow
            value={statusTab}
            options={STATUS_TABS}
            onChange={(value) => {
              setStatusTab(value);
              setPage(1);
            }}
          />
        </View>

        {isLoading ? (
          <View className="mt-4">
            {SKELETON_PLACEHOLDERS.map((key) => (
              <BillSkeleton key={key} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
        ) : (
          <FlatList
            data={pagedBills}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <BillCard bill={item} onPress={handleCardPress} />}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 96 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
            ListEmptyComponent={<EmptyState title="No Bills Found" description="Try adjusting your search or filters." />}
            ListFooterComponent={
              pagedBills.length > 0 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null
            }
          />
        )}
      </View>

      <AccountsBillFilterSheet
        visible={isFilterVisible}
        vendors={vendorOptions}
        departments={departmentOptions}
        value={filters}
        onApply={(next) => {
          setFilters(next);
          setPage(1);
          setIsFilterVisible(false);
        }}
        onClose={() => setIsFilterVisible(false)}
      />
    </Screen>
  );
}
