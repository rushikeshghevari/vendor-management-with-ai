import { StyleSheet, Text, View } from 'react-native';

import type { PurchaseOrderStatus } from '@/features/purchaseOrders/types';

interface Props { status: PurchaseOrderStatus; size?: 'sm' | 'md'; }

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; bg: string; text: string }> = {
  generated:               { label: 'Generated',         bg: '#EFF6FF', text: '#1D4ED8' },
  bill_uploaded:           { label: 'Bill Uploaded',     bg: '#F0FDF4', text: '#15803D' },
  ai_verification_pending: { label: 'AI Pending',        bg: '#FFF7ED', text: '#C2410C' },
  ai_verified:             { label: 'AI Verified',       bg: '#FAF5FF', text: '#7C3AED' },
  accounts_verified:       { label: 'Accts Verified',    bg: '#ECFDF5', text: '#059669' },
  payment_pending:         { label: 'Payment Pending',   bg: '#FFF7ED', text: '#D97706' },
  paid:                    { label: 'Paid',              bg: '#F0FDF4', text: '#15803D' },
  closed:                  { label: 'Closed',            bg: '#F9FAFB', text: '#6B7280' },
};

export function PurchaseOrderStatusBadge({ status, size = 'md' }: Props) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#F3F4F6', text: '#374151' };
  const isSmall = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, isSmall && styles.small]}>
      <Text style={[styles.text, { color: cfg.text }, isSmall && styles.smallText]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  text:      { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  small:     { paddingHorizontal: 7, paddingVertical: 2 },
  smallText: { fontSize: 10 },
});
