import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PurchaseOrderStatusBadge } from '@/features/purchaseOrders/components/PurchaseOrderStatusBadge';
import type { PurchaseOrder } from '@/features/purchaseOrders/types';

interface Props {
  po: PurchaseOrder;
  onPress: () => void;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PurchaseOrderCard({ po, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.76}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={20} color="#2563EB" />
        </View>
        <View style={styles.info}>
          <Text style={styles.poNumber}>{po.poNumber}</Text>
          <Text style={styles.vendor} numberOfLines={1}>{po.vendorName}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatCurrency(po.grandTotal)}</Text>
          <PurchaseOrderStatusBadge status={po.status} size="sm" />
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>{formatDate(po.poDate)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="receipt-outline" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>{po.quotationCode}</Text>
        </View>
        {po.aiVerification && (
          <View style={styles.metaItem}>
            <Ionicons name="sparkles-outline" size={12} color="#7C3AED" />
            <Text style={[styles.metaText, { color: '#7C3AED' }]}>
              AI: {po.aiVerification.matchPercentage}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:     { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  row:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  info:     { flex: 1 },
  poNumber: { fontSize: 14, fontWeight: '700', color: '#111827' },
  vendor:   { fontSize: 12, color: '#6B7280', marginTop: 2 },
  right:    { alignItems: 'flex-end', gap: 4 },
  amount:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  meta:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#9CA3AF' },
});
