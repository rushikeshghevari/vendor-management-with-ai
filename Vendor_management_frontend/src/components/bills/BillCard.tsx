import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import type { Bill, BillStatus } from '@/features/bills/types';

interface BillCardProps {
  bill: Bill;
  onPress?: (bill: Bill) => void;
}

const STATUS_LABEL: Record<BillStatus, string> = {
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

const STATUS_VARIANT: Record<BillStatus, 'primary' | 'success' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  submitted: 'primary',
  ai_failed: 'danger',
  ai_verified: 'primary',
  director_approved: 'success',
  director_rejected: 'danger',
  director_correction: 'danger',
  correction_requested: 'danger',
  verified: 'success',
  rejected: 'danger',
  payment_pending: 'primary',
  paid: 'success',
  completed: 'success',
};

export function BillCard({ bill, onPress }: BillCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={bill.billCode}
      onPress={() => onPress?.(bill)}
      android_ripple={{ color: '#e2e8f0' }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-bold text-ink dark:text-white">{bill.billCode}</Text>
          <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">{bill.vendorName}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Badge label={STATUS_LABEL[bill.status]} variant={STATUS_VARIANT[bill.status]} />
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-1.5">
        <Ionicons name="cash-outline" size={13} color="#5f5f5f" />
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          Invoice {bill.invoiceAmount.toLocaleString()} (+{bill.gstAmount.toLocaleString()} GST)
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="document-text-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500">{bill.quotationCode}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            Due {new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {bill.purchaseOrderNumber || bill.uploadedByName || bill.aiMatchPercentage != null ? (
        <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
          {bill.purchaseOrderNumber ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="cart-outline" size={12} color="#5f5f5f" />
              <Text className="text-[11px] text-ink-muted dark:text-slate-500">{bill.purchaseOrderNumber}</Text>
            </View>
          ) : null}
          {bill.uploadedByName ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="person-outline" size={12} color="#5f5f5f" />
              <Text className="text-[11px] text-ink-muted dark:text-slate-500">{bill.uploadedByName}</Text>
            </View>
          ) : null}
          {bill.aiMatchPercentage != null ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="sparkles-outline" size={12} color="#7C3AED" />
              <Text
                className="text-[11px] font-semibold"
                style={{ color: bill.aiRisk === 'HIGH' ? '#DC2626' : bill.aiRisk === 'MEDIUM' ? '#D97706' : '#059669' }}
              >
                AI {bill.aiMatchPercentage}%
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
