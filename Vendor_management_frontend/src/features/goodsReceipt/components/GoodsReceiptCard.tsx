import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { GoodsReceipt, GrnOverallCondition } from '@/features/goodsReceipt/types';

interface Props {
  grn: GoodsReceipt;
  onPress: () => void;
}

const CONDITION_LABEL: Record<GrnOverallCondition, string> = {
  good: 'Good',
  damaged: 'Damaged',
  partial: 'Partial',
};

const CONDITION_COLOR: Record<GrnOverallCondition, { bg: string; text: string }> = {
  good: { bg: '#ECFDF5', text: '#059669' },
  damaged: { bg: '#FEF2F2', text: '#DC2626' },
  partial: { bg: '#FFFBEB', text: '#D97706' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function GoodsReceiptCard({ grn, onPress }: Props) {
  const conditionColor = CONDITION_COLOR[grn.overallCondition];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.76}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="cube-outline" size={20} color="#2563EB" />
        </View>
        <View style={styles.info}>
          <Text style={styles.grnNumber}>{grn.grnNumber}</Text>
          <Text style={styles.vendor} numberOfLines={1}>{grn.vendorName}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: conditionColor.bg }]}>
          <Text style={[styles.badgeText, { color: conditionColor.text }]}>
            {CONDITION_LABEL[grn.overallCondition]}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>{formatDate(grn.receivedDate)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="document-text-outline" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>{grn.poNumber}</Text>
        </View>
        {grn.requirementNumber ? (
          <View style={styles.metaItem}>
            <Ionicons name="clipboard-outline" size={12} color="#9CA3AF" />
            <Text style={styles.metaText}>{grn.requirementNumber}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:     { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  row:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  info:     { flex: 1 },
  grnNumber:{ fontSize: 14, fontWeight: '700', color: '#111827' },
  vendor:   { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  badgeText:{ fontSize: 11, fontWeight: '600' },
  meta:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#9CA3AF' },
});
