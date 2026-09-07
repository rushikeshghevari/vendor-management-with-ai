import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterChipRow } from '@/components/users/FilterChipRow';
import { RequirementCard } from '@/components/requirements/RequirementCard';
import { RequirementEmptyState } from '@/components/requirements/RequirementEmptyState';
import { RequirementSearch } from '@/components/requirements/RequirementSearch';
import { RequirementSkeleton } from '@/components/requirements/RequirementSkeleton';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/ErrorState';
import { Fab } from '@/components/ui/Fab';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Pagination } from '@/components/ui/Pagination';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { useGetRequirementsPageQuery } from '@/features/requirements/api/requirementsApi';
import { REQUIREMENT_STATUSES, type Requirement, type RequirementStatus } from '@/features/requirements/types';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useDrawer } from '@/navigation/context/DrawerContext';
import type { RequirementsStackParamList } from '@/navigation/types';

const PAGE_SIZE = 5;
const SKELETON_PLACEHOLDERS = [1, 2, 3, 4];

const STATUS_TAB_LABEL: Record<RequirementStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  quotation_collection: 'Collecting',
  quotation_comparison: 'Submitted to Director',
  director_review: 'Director Review',
  approved: 'Approved',
  rejected: 'Rejected',
  vendor_finalized: 'Vendor Finalized',
  closed: 'Closed',
};

// Every status the backend can actually set is shown as its own tab, plus a leading "All"
// tab — the same "All + one per real value" pattern already used for the quotation-status
// filter on RequirementDetailsScreen. Replaces the old Phase 1-only draft/submitted pair now
// that later phases (OCR, Comparison, Director Review, Vendor Registration) populate the rest.
type StatusTabValue = RequirementStatus | 'all';
const STATUS_TABS: { value: StatusTabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  ...REQUIREMENT_STATUSES.map((value) => ({ value, label: STATUS_TAB_LABEL[value] })),
];

type Props = NativeStackScreenProps<RequirementsStackParamList, 'RequirementList'>;

export function RequirementListScreen({ navigation, route }: Props) {
  const { user, hasRole } = useAuth();
  const drawer = useDrawer();
  const isDepartmentUser = hasRole(ROLES.DEPARTMENT_USER);
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const canCreate = isDepartmentUser || isSuperAdmin;
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  const searchInputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  // Only a Department User actually creates Drafts — defaulting every other role (HOD,
  // Director, CEO, Accounts, Payment) to the Draft tab left their list looking empty even
  // right after a requirement was submitted to them, since it had already moved past Draft.
  const [statusTab, setStatusTab] = useState<StatusTabValue>(
    route.params?.initialStatus ?? (isDepartmentUser || isSuperAdmin ? 'draft' : 'all'),
  );
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetRequirementsPageQuery({
    page,
    limit: PAGE_SIZE,
    status: statusTab === 'all' ? undefined : statusTab,
    search: debouncedSearch.trim() || undefined,
  });

  const requirements = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  // If a filter/search change shrinks the result set out from under the page the user was
  // on, land them back on the last real page instead of showing an empty page N of M.
  useEffect(() => {
    if (data && page > data.meta.totalPages) setPage(data.meta.totalPages);
  }, [data, page]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusChange = (value: StatusTabValue) => {
    setStatusTab(value);
    setPage(1);
  };

  const handleAddRequirement = () => navigation.navigate('CreateRequirement');
  const handleCardPress = (requirement: Requirement) =>
    navigation.navigate('RequirementDetails', { requirementId: requirement.id });

  // Set when arriving from a Director's "Requirement Ready for Review" notification tap — that
  // card should land already expanded with its quotations visible instead of making them tap
  // it themselves. Only relevant on first render, so it's not cleared on refetch/pagination.
  const expandRequirementId = route.params?.expandRequirementId;

  return (
    <Screen padded={false}>
      <AppHeader
        title="Requirements"
        rightSlot={
          <>
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
        <RequirementSearch ref={searchInputRef} value={searchQuery} onChangeText={handleSearchChange} />

        <View className="mt-3">
          <FilterChipRow value={statusTab} options={STATUS_TABS} onChange={handleStatusChange} />
        </View>

        {isLoading ? (
          <View className="mt-4">
            {SKELETON_PLACEHOLDERS.map((key) => (
              <RequirementSkeleton key={key} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
        ) : (
          <FlatList
            data={requirements}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RequirementCard
                requirement={item}
                onPress={handleCardPress}
                initiallyExpanded={item.id === expandRequirementId}
              />
            )}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 96 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
            ListEmptyComponent={<RequirementEmptyState onAddPress={canCreate ? handleAddRequirement : undefined} />}
            ListFooterComponent={
              requirements.length > 0 ? (
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              ) : null
            }
          />
        )}
      </View>

      {/* Cleared to sit above the floating bottom tab bar (~80px) — Requirements is a
          visible tab's root for several roles now, so the bar is present here. */}
      {canCreate ? (
        <View className="absolute bottom-24 right-6">
          <Fab accessibilityLabel="Add Requirement" onPress={handleAddRequirement} />
        </View>
      ) : null}
    </Screen>
  );
}
