import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterChipRow } from '@/components/users/FilterChipRow';
import { BillCard } from '@/components/bills/BillCard';
import { BillEmptyState } from '@/components/bills/BillEmptyState';
import { BillSearch } from '@/components/bills/BillSearch';
import { BillSkeleton } from '@/components/bills/BillSkeleton';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/ErrorState';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Pagination } from '@/components/ui/Pagination';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { useGetBillsPageQuery, useGetBillsQuery } from '@/features/bills/api/billsApi';
import { BILL_STATUSES, type Bill, type BillStatus } from '@/features/bills/types';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useDrawer } from '@/navigation/context/DrawerContext';
import type { BillsStackParamList, DepartmentUserTabParamList } from '@/navigation/types';

const PAGE_SIZE = 5;
const SKELETON_PLACEHOLDERS = [1, 2, 3, 4];

const STATUS_TAB_LABEL: Record<BillStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  ai_failed: 'AI Failed',
  ai_verified: 'AI Verified',
  director_approved: 'With Accounts',
  director_rejected: 'Dir. Rejected',
  director_correction: 'Correction',
  correction_requested: 'Correction',
  verified: 'Verified',
  rejected: 'Rejected',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  completed: 'Completed',
};

// Department Users see all stages of their own bills — one tab per status.
const DEPT_USER_TAB_KEYS: BillStatus[] = [
  'draft', 'submitted', 'ai_failed', 'ai_verified', 'director_approved',
  'director_correction', 'correction_requested', 'verified', 'paid',
];
const STATUS_TABS = DEPT_USER_TAB_KEYS.map((value) => ({ value, label: STATUS_TAB_LABEL[value] }));

// Director tabs are groupings of several underlying statuses — e.g. "Approved" covers every
// stage from Director-Approved through Paid, since a Director still wants to find a bill they
// approved even after it's moved on to Accounts/Payment. FilterChipRow only supports a single
// value per tab, so each tab key here is a synthetic string, resolved via DIRECTOR_TAB_STATUSES
// below rather than compared directly against `item.status`.
const DIRECTOR_TAB_STATUSES: Record<string, BillStatus[]> = {
  pending_ai: ['submitted', 'ai_failed'],
  pending_approval: ['ai_verified'],
  approved: ['director_approved', 'verified', 'payment_pending', 'paid'],
  rejected: ['director_rejected'],
  sent_back: ['director_correction', 'correction_requested'],
  completed: ['completed'],
};
const DIRECTOR_STATUS_TABS = [
  { value: 'pending_ai', label: 'Pending AI' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sent_back', label: 'Sent Back' },
  { value: 'completed', label: 'Completed' },
];

type Props = NativeStackScreenProps<BillsStackParamList, 'BillList'>;

export function BillListScreen({ navigation }: Props) {
  const { user, hasRole } = useAuth();
  const drawer = useDrawer();
  const isDirector = hasRole(ROLES.DIRECTOR);
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  const searchInputRef = useRef<TextInput>(null);

  const statusTabs: { value: string; label: string }[] = isDirector ? DIRECTOR_STATUS_TABS : STATUS_TABS;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [statusTab, setStatusTab] = useState<string>(isDirector ? 'pending_ai' : 'draft');
  const [page, setPage] = useState(1);

  // Director tabs resolve to a *set* of underlying statuses (see DIRECTOR_TAB_STATUSES) — the
  // backend's bill list only filters on one status value at a time, so a Director's view stays
  // on the capped-at-100 `getBills` (client-filtered), same as before this pass. Every other
  // role's tab is exactly one status, so it gets real server-side pagination/search below.
  const matchingStatuses: BillStatus[] = DIRECTOR_TAB_STATUSES[statusTab] ?? [];
  const { data: directorBills, isLoading: isLoadingDirector, isFetching: isFetchingDirector, refetch: refetchDirector } =
    useGetBillsQuery(undefined, { pollingInterval: isDirector ? 15000 : undefined, skip: !isDirector });

  const filteredDirectorBills = isDirector
    ? (directorBills ?? []).filter((item: Bill) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesStatus = matchingStatuses.includes(item.status);
        const matchesQuery = !query || item.billCode.toLowerCase().includes(query);
        return matchesStatus && matchesQuery;
      })
    : [];
  const directorTotalPages = Math.max(1, Math.ceil(filteredDirectorBills.length / PAGE_SIZE));
  const directorCurrentPage = Math.min(page, directorTotalPages);
  const pagedDirectorBills = filteredDirectorBills.slice(
    (directorCurrentPage - 1) * PAGE_SIZE,
    directorCurrentPage * PAGE_SIZE,
  );

  const {
    data: pagedData,
    isLoading: isLoadingPaged,
    isFetching: isFetchingPaged,
    isError,
    error,
    refetch: refetchPaged,
  } = useGetBillsPageQuery(
    { page, limit: PAGE_SIZE, status: statusTab as BillStatus, search: debouncedSearch.trim() || undefined },
    { skip: isDirector },
  );

  useEffect(() => {
    if (!isDirector && pagedData && page > pagedData.meta.totalPages) setPage(pagedData.meta.totalPages);
  }, [isDirector, pagedData, page]);

  const isLoading = isDirector ? isLoadingDirector : isLoadingPaged;
  const isFetching = isDirector ? isFetchingDirector : isFetchingPaged;
  const refetch = isDirector ? refetchDirector : refetchPaged;
  const pagedBills = isDirector ? pagedDirectorBills : (pagedData?.items ?? []);
  const totalPages = isDirector ? directorTotalPages : (pagedData?.meta.totalPages ?? 1);
  const currentPage = isDirector ? directorCurrentPage : page;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleGoToQuotations = () =>
    navigation.getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>()?.navigate('Quotations', { screen: 'QuotationList' });
  const handleCardPress = (bill: Bill) => navigation.navigate('BillDetails', { billId: bill.id });

  return (
    <Screen padded={false}>
      <AppHeader
        title="Bills"
        rightSlot={
          <>
            {!isDirector ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Recurring expenses"
                hitSlop={8}
                onPress={() => navigation.navigate('RecurringExpenseList')}
              >
                <Ionicons name="repeat" size={22} color="#ffffff" />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={8}
              onPress={() => searchInputRef.current?.focus()}
            >
              <Ionicons name="search-outline" size={22} color="#ffffff" />
            </Pressable>
            <NotificationBell />
            <Avatar initials={initials} size={32} online onPress={() => drawer?.openDrawer()} />
          </>
        }
      />

      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        <BillSearch ref={searchInputRef} value={searchQuery} onChangeText={handleSearchChange} />

        <View className="mt-3">
          <FilterChipRow
            value={statusTab}
            options={statusTabs}
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
            ListEmptyComponent={<BillEmptyState onGoToQuotations={isDirector ? undefined : handleGoToQuotations} />}
            ListFooterComponent={
              pagedBills.length > 0 ? <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} /> : null
            }
          />
        )}
      </View>
    </Screen>
  );
}
