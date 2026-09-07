import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PAYMENT_STATUS_LABEL } from '@/components/payments/PaymentStatusBadge';
import type { PaymentFailureReason, PaymentHistoryEntry } from '@/features/payments/types';

const FAILURE_REASON_LABEL: Record<PaymentFailureReason, string> = {
  bank_timeout: 'Bank Timeout',
  upi_failed: 'UPI Failed',
  cheque_rejected: 'Cheque Rejected',
  insufficient_balance: 'Insufficient Balance',
  account_closed: 'Account Closed',
  invalid_ifsc: 'Invalid IFSC',
  network_failure: 'Network Failure',
  manual_hold: 'Manual Hold',
  other: 'Other',
};

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  payment_pending: 'time-outline',
  processing: 'sync-outline',
  paid: 'checkmark-circle-outline',
  completed: 'checkmark-done-circle-outline',
  failed: 'close-circle-outline',
};

const STATUS_COLOR: Record<string, string> = {
  payment_pending: '#94a3b8',
  processing: '#1e88e5',
  paid: '#43a047',
  completed: '#43a047',
  failed: '#e53935',
};

interface PaymentTimelineProps {
  history: PaymentHistoryEntry[];
}

/** Renders the Payment's append-only history — never reordered, oldest first, so a retry
 *  cycle (Failed -> Processing again) reads top-to-bottom exactly as it happened. */
export function PaymentTimeline({ history }: PaymentTimelineProps) {
  if (history.length === 0) {
    return <Text className="text-sm text-ink-muted dark:text-slate-400">No history yet.</Text>;
  }

  return (
    <View>
      {history.map((entry, index) => (
        <View key={`${entry.status}-${entry.changedAt}-${index}`} className="flex-row items-start gap-3 pb-4">
          <View className="items-center">
            <Ionicons name={STATUS_ICON[entry.status] ?? 'ellipse-outline'} size={18} color={STATUS_COLOR[entry.status] ?? '#94a3b8'} />
            {index < history.length - 1 ? <View className="mt-1 h-full w-px flex-1 bg-slate-200 dark:bg-slate-700" /> : null}
          </View>
          <View className="flex-1 pb-2">
            <Text className="text-sm font-semibold text-ink dark:text-white">
              {PAYMENT_STATUS_LABEL[entry.status]}
              {entry.retryNumber ? ` (Retry ${entry.retryNumber})` : ''}
            </Text>
            <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">
              {new Date(entry.changedAt).toLocaleString()}
            </Text>
            {entry.failureReason ? (
              <Text className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                Reason: {FAILURE_REASON_LABEL[entry.failureReason]}
              </Text>
            ) : null}
            {entry.remarks ? (
              <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">{entry.remarks}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export { FAILURE_REASON_LABEL };
