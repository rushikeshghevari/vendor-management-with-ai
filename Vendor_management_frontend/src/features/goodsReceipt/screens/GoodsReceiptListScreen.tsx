import { useState } from 'react';
import {
  FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { GoodsReceiptCard } from '@/features/goodsReceipt/components/GoodsReceiptCard';
import { useGetGoodsReceiptsQuery } from '@/features/goodsReceipt/api/goodsReceiptApi';
import type { PurchaseOrderStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PurchaseOrderStackParamList, 'GoodsReceiptList'>;

/** Standalone browse/search list for Goods Receipts — previously only viewable embedded inside
 *  a single Purchase Order's own detail screen. Read-only everywhere: recording a new Goods
 *  Receipt still only happens from the originating PO's "Record Goods Receipt" action. */
export function GoodsReceiptListScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');

  const { data: receipts = [], isLoading, isFetching, refetch } = useGetGoodsReceiptsQuery(
    { search: search || undefined },
  );

  return (
    <Screen padded={false}>
      <AppHeader title="Goods Receipts" />

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search GRN, PO, vendor..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={receipts}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <GoodsReceiptCard
            grn={item}
            // No standalone GRN details screen exists yet — fall back to the parent PO's
            // detail screen, which already renders the populated `goodsReceipt` field.
            onPress={() => navigation.navigate('PurchaseOrderDetails', { purchaseOrderId: item.purchaseOrderId })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading...' : 'No Goods Receipts found'}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow:  { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput:{ flex: 1, fontSize: 14, color: '#111827' },
  list:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText:  { fontSize: 14, color: '#9CA3AF' },
});
