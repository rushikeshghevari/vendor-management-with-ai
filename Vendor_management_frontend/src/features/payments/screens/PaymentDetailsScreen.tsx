import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PaymentStatusBadge } from '@/components/payments/PaymentStatusBadge';
import { PaymentTimeline } from '@/components/payments/PaymentTimeline';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { useGetPaymentByIdQuery, useMarkCompletedMutation } from '@/features/payments/api/paymentsApi';
import { ROLES } from '@/constants/roles';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { PaymentsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PaymentsStackParamList, 'PaymentDetails'>;

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

export function PaymentDetailsScreen({ navigation, route }: Props) {
  const { paymentId } = route.params;
  const { hasRole } = useAuth();
  const canProcess = hasRole(ROLES.PAYMENT_DEPARTMENT);

  const { data: payment, isLoading } = useGetPaymentByIdQuery(paymentId);
  const [markCompleted, { isLoading: isCompleting }] = useMarkCompletedMutation();

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

  const handleMarkCompleted = async () => {
    try {
      await markCompleted(payment.id).unwrap();
    } catch (error) {
      Alert.alert('Could Not Complete Payment', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Payment Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard>
          <View className="flex-row items-start justify-between">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
              <Ionicons name="card" size={26} color="#1e88e5" />
            </View>
            <PaymentStatusBadge status={payment.status} />
          </View>

          <Text className="mt-3 text-xl font-bold text-ink dark:text-white">{payment.paymentCode}</Text>
          <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">
            {payment.vendorName ?? (payment.reimbursedToName ? `Reimbursement — ${payment.reimbursedToName}` : '—')}
          </Text>

          {/* No Vendor record exists for a reimbursement payee — this is where the payer
              finds the account to actually transfer the money to. */}
          {payment.reimbursementBankDetails ? (
            <View className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Reimburse To — Bank Details
              </Text>
              <InfoRow icon="business-outline" label="Bank" value={payment.reimbursementBankDetails.bankName} />
              <InfoRow icon="person-outline" label="Account Holder" value={payment.reimbursementBankDetails.accountHolderName} />
              <InfoRow icon="card-outline" label="Account Number" value={payment.reimbursementBankDetails.accountNumber} />
              <InfoRow icon="key-outline" label="IFSC" value={payment.reimbursementBankDetails.ifscCode} />
              {payment.reimbursementBankDetails.upiId ? (
                <InfoRow icon="phone-portrait-outline" label="UPI" value={payment.reimbursementBankDetails.upiId} />
              ) : null}
            </View>
          ) : null}

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
              {payment.bankName ? <InfoRow icon="business-outline" label="Bank" value={payment.bankName} /> : null}
              {payment.accountNumber ? <InfoRow icon="card-outline" label="Account Number" value={payment.accountNumber} /> : null}
              {payment.ifsc ? <InfoRow icon="key-outline" label="IFSC" value={payment.ifsc} /> : null}
              {payment.upiId ? <InfoRow icon="phone-portrait-outline" label="UPI" value={payment.upiId} /> : null}
              {payment.utrNumber ? <InfoRow icon="key-outline" label="UTR" value={payment.utrNumber} /> : null}
              {payment.chequeNumber ? <InfoRow icon="document-outline" label="Cheque Number" value={payment.chequeNumber} /> : null}
              {payment.transactionReference ? (
                <InfoRow icon="key-outline" label="Reference Number" value={payment.transactionReference} />
              ) : null}
            </View>
          ) : null}

          {payment.retryCount > 0 ? (
            <View className="mt-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-950">
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400">Retried {payment.retryCount} time(s)</Text>
            </View>
          ) : null}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="mb-2 text-sm font-semibold text-ink dark:text-slate-200">Timeline</Text>
          <PaymentTimeline history={payment.history} />
        </DashboardCard>

        <DashboardCard className="mt-4">
          <View className="flex-row items-center gap-2">
            <Text style={{ fontSize: 20 }}>🤖</Text>
            <Text className="flex-1 text-sm font-semibold text-ink dark:text-slate-200">AI Insights</Text>
            <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Coming Soon</Text>
            </View>
          </View>
          <Text className="mt-2 text-xs text-ink-muted dark:text-slate-400">
            AI-powered payment fraud detection, vendor analytics, and cash flow predictions will appear here.
          </Text>
        </DashboardCard>

        {canProcess && payment.status === 'payment_pending' ? (
          <Button
            label="Start Processing"
            onPress={() => navigation.navigate('PaymentForm', { paymentId: payment.id, mode: 'start-processing' })}
            className="mt-5"
          />
        ) : null}

        {canProcess && payment.status === 'processing' ? (
          <>
            <Button
              label="Mark Paid"
              onPress={() => navigation.navigate('PaymentForm', { paymentId: payment.id, mode: 'mark-paid' })}
              className="mt-5"
            />
            <Button
              label="Mark Failed"
              variant="dangerOutline"
              onPress={() => navigation.navigate('PaymentForm', { paymentId: payment.id, mode: 'mark-failed' })}
              className="mt-3"
            />
          </>
        ) : null}

        {canProcess && payment.status === 'failed' ? (
          <Button
            label="Retry"
            onPress={() => navigation.navigate('PaymentForm', { paymentId: payment.id, mode: 'retry' })}
            className="mt-5"
          />
        ) : null}

        {canProcess && payment.status === 'paid' ? (
          <Button label="Mark Completed" loading={isCompleting} onPress={handleMarkCompleted} className="mt-5" />
        ) : null}

        {!canProcess || payment.status === 'completed' ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="eye-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-sm text-ink-muted dark:text-slate-400">
              {payment.status === 'completed' ? 'Payment Completed — final, no further changes.' : 'Read-only view.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
