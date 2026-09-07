import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, View, type TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BillCard } from '@/components/bills/BillCard';
import { BillSearch } from '@/components/bills/BillSearch';
import { BillSkeleton } from '@/components/bills/BillSkeleton';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { useGetBillsPageQuery } from '@/features/bills/api/billsApi';
import type { Bill } from '@/features/bills/types';
import { useCreatePaymentMutation } from '@/features/payments/api/paymentsApi';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { PaymentsStackParamList } from '@/navigation/types';

const PAGE_SIZE = 10;
const SKELETON_PLACEHOLDERS = [1, 2, 3, 4];

type Props = NativeStackScreenProps<PaymentsStackParamList, 'BillsReadyForPayment'>;

/** Verified Bills with no Payment yet — this is where a newly-Verified Bill must immediately
 *  show up for Payment Department. Tapping a card creates the Payment and opens it; for
 *  Accounts/Super Admin (read-only) the list is informational only, no create action. */
export function BillsReadyForPaymentScreen({ navigation }: Props) {
  const { hasRole } = useAuth();
  const canCreate = hasRole(ROLES.PAYMENT_DEPARTMENT);

  const searchInputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetBillsPageQuery({
    page,
    limit: PAGE_SIZE,
    status: 'verified',
    search: debouncedSearch.trim() || undefined,
  });
  const [createPayment, { isLoading: isCreating }] = useCreatePaymentMutation();

  const readyBills = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  useEffect(() => {
    if (data && page > data.meta.totalPages) setPage(data.meta.totalPages);
  }, [data, page]);

  const handleCardPress = (bill: Bill) => {
    if (!canCreate) return;
    Alert.alert('Create Payment', `Create a Payment for ${bill.billCode}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Create',
        onPress: async () => {
          try {
            const payment = await createPayment({ bill: bill.id }).unwrap();
            navigation.navigate('PaymentDetails', { paymentId: payment.id });
          } catch (error) {
            Alert.alert('Could Not Create Payment', getErrorMessage(error));
          }
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Ready For Payment" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        <BillSearch
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={(value) => { setSearchQuery(value); setPage(1); }}
          placeholder="Search by bill number..."
        />

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
            data={readyBills}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <BillCard bill={item} onPress={handleCardPress} />}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={(isFetching && !isLoading) || isCreating} onRefresh={refetch} />}
            ListEmptyComponent={
              <EmptyState
                title="No Bills Ready For Payment"
                description="Verified bills awaiting payment processing will appear here."
              />
            }
            ListFooterComponent={readyBills.length > 0 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null}
          />
        )}
      </View>
    </Screen>
  );
}
