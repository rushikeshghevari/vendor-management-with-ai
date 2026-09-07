import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, View, type TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Loader } from '@/components/ui/Loader';
import { Pagination } from '@/components/ui/Pagination';
import { Screen } from '@/components/ui/Screen';
import { VendorCard } from '@/components/vendors/VendorCard';
import { VendorEmptyState } from '@/components/vendors/VendorEmptyState';
import { VendorSearch } from '@/components/vendors/VendorSearch';
import { VendorSkeleton } from '@/components/vendors/VendorSkeleton';
import { useGetVendorsPageQuery } from '@/features/vendors/api/vendorsApi';
import type { Vendor } from '@/features/vendors/types';
import { useLinkExistingVendorMutation } from '@/features/vendorRegistration/api/vendorRegistrationApi';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { RequirementsStackParamList } from '@/navigation/types';

const PAGE_SIZE = 5;
const SKELETON_PLACEHOLDERS = [1, 2, 3, 4];

type Props = NativeStackScreenProps<RequirementsStackParamList, 'SelectExistingVendor'>;

/** "Show Vendors" — lets the caller manually pick any existing Vendor for this requirement,
 *  for the case the winning quotation's own email/phone doesn't happen to match one on file
 *  even though the Department User recognizes it as the same real-world vendor. If the vendor
 *  they need isn't here, they fall back to Register Vendor or the public self-registration link. */
export function SelectExistingVendorScreen({ navigation, route }: Props) {
  const { requirementId } = route.params;
  const searchInputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetVendorsPageQuery({
    page,
    limit: PAGE_SIZE,
    status: 'active',
    search: debouncedSearch.trim() || undefined,
  });

  const vendors = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  useEffect(() => {
    if (data && page > data.meta.totalPages) setPage(data.meta.totalPages);
  }, [data, page]);

  const [linkExistingVendor, { isLoading: isLinking }] = useLinkExistingVendorMutation();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleSelect = (vendor: Vendor) => {
    Alert.alert('Link This Vendor', `Finalize this requirement against ${vendor.name} (${vendor.code})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Link Vendor',
        onPress: async () => {
          try {
            await linkExistingVendor({ requirementId, vendorId: vendor.id }).unwrap();
            Alert.alert('Vendor Linked', `${vendor.name} has been set as the vendor for this requirement.`, [
              { text: 'OK', onPress: () => navigation.navigate('RequirementDetails', { requirementId }) },
            ]);
          } catch (err) {
            Alert.alert('Could Not Link Vendor', getErrorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Show Vendors" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        <VendorSearch ref={searchInputRef} value={searchQuery} onChangeText={handleSearchChange} placeholder="Search by name, code, GST..." />

        {isLinking ? (
          <View className="mt-4">
            <Loader />
          </View>
        ) : null}

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
            renderItem={({ item }) => <VendorCard vendor={item} onPress={handleSelect} />}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
            ListEmptyComponent={<VendorEmptyState />}
            ListFooterComponent={
              vendors.length > 0 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null
            }
          />
        )}
      </View>
    </Screen>
  );
}
