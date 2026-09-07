import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PaymentStatusBadge } from '@/components/payments/PaymentStatusBadge';
import type { Payment } from '@/features/payments/types';

interface PaymentListItemProps {
  payment: Payment;
  onPress?: (payment: Payment) => void;
}

export function PaymentListItem({ payment, onPress }: PaymentListItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={payment.paymentCode}
      onPress={() => onPress?.(payment)}
      android_ripple={{ color: '#e2e8f0' }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-bold text-ink dark:text-white">{payment.paymentCode}</Text>
          <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">{payment.vendorName}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <PaymentStatusBadge status={payment.status} />
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-1.5">
        <Ionicons name="cash-outline" size={13} color="#5f5f5f" />
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          {payment.amount.toLocaleString()} (+{payment.gst.toLocaleString()} GST)
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="receipt-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500">{payment.billCode}</Text>
        </View>
        {payment.retryCount > 0 ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="refresh-outline" size={13} color="#f59e0b" />
            <Text className="text-xs text-ink-muted dark:text-slate-500">Retry {payment.retryCount}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
