import { useMemo, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterChipRow } from '@/components/users/FilterChipRow';
import { VendorCard } from '@/components/vendors/VendorCard';
import { VendorEmptyState } from '@/components/vendors/VendorEmptyState';
import { VendorSearch } from '@/components/vendors/VendorSearch';
import { VendorSkeleton } from '@/components/vendors/VendorSkeleton';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/ErrorState';
import { Fab } from '@/components/ui/Fab';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { Pagination } from '@/components/ui/Pagination';
import { Screen } from '@/components/ui/Screen';
import { useGetVendorsPageQuery, useGetVendorsQuery } from '@/features/vendors/api/vendorsApi';
import type { Vendor, VendorStatus } from '@/features/vendors/types';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useDrawer } from '@/navigation/context/DrawerContext';
import type { VendorsStackParamList } from '@/navigation/types';

const PAGE_SIZE = 5;
const SKELETON_PLACEHOLDERS = [1, 2, 3, 4];

const STATUS_OPTIONS: Array<{ value: VendorStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

type Props = NativeStackScreenProps<VendorsStackParamList, 'VendorList'>;

export function VendorListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const drawer = useDrawer();
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  const searchInputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetVendorsPageQuery({
    page,
    limit: PAGE_SIZE,
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    search: debouncedSearch.trim() || undefined,
  });

  const vendors = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  useEffect(() => {
    if (data && page > data.meta.totalPages) setPage(data.meta.totalPages);
  }, [data, page]);

  // Category options are a free-text field, not a fixed enum, so there's no static list to
  // hardcode like the Status chips below — this still reads the capped-at-100 `getVendors`
  // purely to populate the filter's option list (a UI nicety), never for the displayed/counted
  // vendor list itself, which comes entirely from the paged query above.
  const { data: vendorsForCategoryOptions } = useGetVendorsQuery();
  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set((vendorsForCategoryOptions ?? []).map((item) => item.category)));
    return [{ value: 'all', label: 'All Categories' }, ...categories.map((item) => ({ value: item, label: item }))];
  }, [vendorsForCategoryOptions]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleAddVendor = () => navigation.navigate('AddVendor');
  const handleCardPress = (vendor: Vendor) => navigation.navigate('VendorDetails', { vendorId: vendor.id });

  return (
    <Screen padded={false}>
      <AppHeader
        title="Vendors"
        rightSlot={
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Vendor"
              hitSlop={8}
              onPress={handleAddVendor}
            >
              <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={8}
              onPress={() => searchInputRef.current?.focus()}
            >
              <Ionicons name="search-outline" size={22} color="#ffffff" />
            </Pressable>
            <Avatar initials={initials} size={32} online onPress={() => drawer?.openDrawer()} />
          </>
        }
      />

      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        <VendorSearch ref={searchInputRef} value={searchQuery} onChangeText={handleSearchChange} />

        <View className="mt-3">
          <Text className="mb-1.5 text-xs font-semibold text-ink-muted dark:text-slate-400">Category</Text>
          <FilterChipRow
            value={categoryFilter}
            options={categoryOptions}
            onChange={(value) => {
              setCategoryFilter(value);
              setPage(1);
            }}
          />
        </View>

        <View className="mt-3">
          <Text className="mb-1.5 text-xs font-semibold text-ink-muted dark:text-slate-400">Status</Text>
          <FilterChipRow
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          />
        </View>

        {isLoading ? (
          <View className="mt-4">
            {SKELETON_PLACEHOLDERS.map((key) => (
              <VendorSkeleton key={key} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
        ) : (
          <FlatList
            data={vendors}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <VendorCard vendor={item} onPress={handleCardPress} />}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 96 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
            ListEmptyComponent={<VendorEmptyState onAddPress={handleAddVendor} />}
            ListFooterComponent={
              vendors.length > 0 ? (
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              ) : null
            }
          />
        )}
      </View>
    </Screen>
  );
}
