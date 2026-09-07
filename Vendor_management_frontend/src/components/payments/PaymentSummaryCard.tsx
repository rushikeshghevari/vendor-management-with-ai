import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { PaymentStatusBadge } from '@/components/payments/PaymentStatusBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useGetPaymentByQuotationQuery } from '@/features/payments/api/paymentsApi';

interface PaymentSummaryCardProps {
  quotationId: string;
}

/** CEO/Director's only window into Payment data — read-only, no actions, ever. Renders
 *  nothing if no Payment exists yet for this quotation's Bill (404 from the backend). */
export function PaymentSummaryCard({ quotationId }: PaymentSummaryCardProps) {
  const { data: payment, isLoading } = useGetPaymentByQuotationQuery(quotationId);

  if (isLoading || !payment) return null;

  return (
    <DashboardCard className="mt-4">
      <SectionHeader title="Payment Summary" />
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink dark:text-white">{payment.paymentCode}</Text>
        <PaymentStatusBadge status={payment.status} />
      </View>
      <View className="mt-2.5 flex-row items-center gap-1.5">
        <Ionicons name="cash-outline" size={13} color="#5f5f5f" />
        <Text className="text-xs text-ink-muted dark:text-slate-500">
          {payment.amount.toLocaleString()} (+{payment.gst.toLocaleString()} GST)
        </Text>
      </View>
      {payment.paymentMethod ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="card-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500">{payment.paymentMethod}</Text>
        </View>
      ) : null}
      {payment.paymentDate ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
          <Text className="text-xs text-ink-muted dark:text-slate-500">
            Paid {new Date(payment.paymentDate).toLocaleDateString()}
          </Text>
        </View>
      ) : null}
    </DashboardCard>
  );
}
