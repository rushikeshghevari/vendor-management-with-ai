import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PaymentStatusBadge } from '@/components/payments/PaymentStatusBadge';
import { PaymentTimeline } from '@/components/payments/PaymentTimeline';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { useGetPaymentByIdQuery } from '@/features/payments/api/paymentsApi';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentDetailsRoot'>;

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="mt-2.5 flex-row items-start gap-2">
      <Ionicons name={icon} size={14} color="#5f5f5f" style={{ marginTop: 1 }} />
      <View className="flex-1">
        <Text className="text-[11px] text-ink-muted dark:text-slate-500">{label}</Text>
        <Text className="text-sm text-ink dark:text-slate-200">{value}</Text>
      </View>
    </View>
  );
}

/** Read-only "quick view" reachable from anywhere via a `payment` notification tap/deep-link —
 *  for roles (CEO, Director) that have no `Payments` tab at all, so the full, tab-nested
 *  `PaymentDetailsScreen` (with its Start Processing/Mark Paid/Mark Failed actions) isn't
 *  reachable or appropriate here. No process actions — those remain Payment Department only. */
export function PaymentDetailsRootScreen({ navigation, route }: Props) {
  const { paymentId } = route.params;
  const { data: payment, isLoading } = useGetPaymentByIdQuery(paymentId);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Payment Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!payment) {
    return (
      <Screen padded={false}>
        <AppHeader title="Payment Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Payment not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader title="Payment Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-lg font-bold text-ink dark:text-white">{payment.paymentCode}</Text>
              <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">{payment.vendorName}</Text>
            </View>
            <PaymentStatusBadge status={payment.status} />
          </View>

          <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <InfoRow icon="receipt-outline" label="Bill" value={payment.billCode} />
            <InfoRow icon="document-text-outline" label="Quotation" value={payment.quotationCode} />
            {payment.requirementNumber ? <InfoRow icon="clipboard-outline" label="Requirement" value={payment.requirementNumber} /> : null}
            {payment.grnNumber ? <InfoRow icon="cube-outline" label="Goods Receipt" value={payment.grnNumber} /> : null}
            <InfoRow icon="business-outline" label="Department" value={payment.departmentName} />
            <InfoRow icon="pricetag-outline" label="Invoice Number" value={payment.invoiceNumber} />
            <InfoRow icon="calendar-outline" label="Invoice Date" value={formatDate(payment.invoiceDate)} />
            <InfoRow icon="cash-outline" label="Amount" value={payment.amount.toLocaleString()} />
            <InfoRow icon="calculator-outline" label="GST" value={payment.gst.toLocaleString()} />
            {payment.verifiedAt ? <InfoRow icon="checkmark-circle-outline" label="Verified Date" value={formatDate(payment.verifiedAt)} /> : null}
          </View>

          {payment.paymentMethod ? (
            <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <InfoRow icon="card-outline" label="Payment Method" value={payment.paymentMethod} />
              {payment.utrNumber ? <InfoRow icon="key-outline" label="UTR" value={payment.utrNumber} /> : null}
              {payment.chequeNumber ? <InfoRow icon="document-outline" label="Cheque Number" value={payment.chequeNumber} /> : null}
            </View>
          ) : null}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="mb-2 text-sm font-semibold text-ink dark:text-slate-200">Timeline</Text>
          <PaymentTimeline history={payment.history} />
        </DashboardCard>

        <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
          <Ionicons name="eye-outline" size={20} color="#5f5f5f" />
          <Text className="mt-1.5 text-sm text-ink-muted dark:text-slate-400">Read-only view.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
