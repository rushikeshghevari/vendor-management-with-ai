import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import type { Quotation, QuotationStatus } from '@/features/quotations/types';

interface QuotationCardProps {
  quotation: Quotation;
  onPress?: (quotation: Quotation) => void;
}

const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  negotiation: 'Negotiation',
  resubmitted: 'Resubmitted',
  approved: 'Approved',
  rejected: 'Rejected',
  billed: 'Billed',
};

const STATUS_VARIANT: Record<QuotationStatus, 'primary' | 'success' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  submitted: 'primary',
  negotiation: 'danger',
  resubmitted: 'primary',
  approved: 'success',
  rejected: 'danger',
  billed: 'primary',
};

export function QuotationCard({ quotation, onPress }: QuotationCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={quotation.quotationCode}
      onPress={() => onPress?.(quotation)}
      android_ripple={{ color: '#e2e8f0' }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-bold text-ink dark:text-white">{quotation.quotationCode}</Text>
          <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">{quotation.vendorName}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Badge label={STATUS_LABEL[quotation.status]} variant={STATUS_VARIANT[quotation.status]} />
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-1.5">
        <Ionicons name="pricetag-outline" size={13} color="#5f5f5f" />
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          {quotation.currency} {quotation.amount.toLocaleString()} (+{quotation.gst}% GST)
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            Required {new Date(quotation.requiredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flag-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500 capitalize">{quotation.priority}</Text>
        </View>
      </View>
    </Pressable>
  );
}
