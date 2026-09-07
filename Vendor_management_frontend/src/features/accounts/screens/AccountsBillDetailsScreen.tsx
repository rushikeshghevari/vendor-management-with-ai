import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountsBillDecisionSheet } from '@/components/accounts/AccountsBillDecisionSheet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { env } from '@/config/env';
import { useDecideBillMutation, useGetBillsQuery } from '@/features/bills/api/billsApi';
import type { BillDecision, BillStatus } from '@/features/bills/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { AccountsBillsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AccountsBillsStackParamList, 'AccountsBillDetails'>;

const STATUS_LABEL: Record<BillStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  ai_failed: 'AI Failed',
  ai_verified: 'AI Verified',
  director_approved: 'Awaiting Verification',
  director_rejected: 'Director Rejected',
  director_correction: 'Correction Requested',
  correction_requested: 'Correction Requested',
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

const DECISION_LABEL: Record<BillStatus, string> = STATUS_LABEL;

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(isoDate?: string): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
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

export function AccountsBillDetailsScreen({ navigation, route }: Props) {
  const { billId } = route.params;
  const { data: bills, isLoading } = useGetBillsQuery();
  const [decideBill, { isLoading: isDeciding }] = useDecideBillMutation();
  const [pendingDecision, setPendingDecision] = useState<BillDecision | null>(null);

  const bill = bills?.find((item) => item.id === billId);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Bill Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!bill) {
    return (
      <Screen padded={false}>
        <AppHeader title="Bill Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Bill not found.</Text>
      </Screen>
    );
  }

  const openFile = (url: string) => Linking.openURL(`${env.apiUrl.replace('/api/v1', '')}${url}`);
  const latestInvoice = bill.invoiceFiles[bill.invoiceFiles.length - 1];

  const handleConfirmDecision = async (remarks?: string) => {
    if (!pendingDecision) return;
    try {
      await decideBill({ id: bill.id, decision: pendingDecision, remarks }).unwrap();
      setPendingDecision(null);
    } catch (error) {
      Alert.alert('Could Not Record Decision', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Bill Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard>
          <View className="flex-row items-start justify-between">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
              <Ionicons name="receipt" size={26} color="#1e88e5" />
            </View>
            <Badge label={STATUS_LABEL[bill.status]} variant={STATUS_VARIANT[bill.status]} />
          </View>

          <Text className="mt-3 text-xl font-bold text-ink dark:text-white">{bill.billCode}</Text>
          <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">
            {bill.vendorName} ({bill.vendorCode})
          </Text>

          <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <InfoRow icon="document-text-outline" label="Quotation Number" value={bill.quotationCode} />
            {bill.requirementNumber ? <InfoRow icon="clipboard-outline" label="Requirement" value={bill.requirementNumber} /> : null}
            {bill.grnNumber ? <InfoRow icon="cube-outline" label="Goods Receipt" value={bill.grnNumber} /> : null}
            <InfoRow icon="business-outline" label="Department" value={bill.departmentName} />
            <InfoRow icon="person-outline" label="Department User" value={bill.createdByName || '—'} />
            <InfoRow icon="pricetag-outline" label="Invoice Number" value={bill.invoiceNumber} />
            <InfoRow icon="calendar-outline" label="Invoice Date" value={formatDate(bill.invoiceDate)} />
            <InfoRow icon="cash-outline" label="Invoice Amount" value={bill.invoiceAmount.toLocaleString()} />
            <InfoRow icon="calculator-outline" label="Taxable Amount" value={bill.taxableAmount.toLocaleString()} />
            <InfoRow icon="calculator-outline" label="GST Amount" value={bill.gstAmount.toLocaleString()} />
            <InfoRow icon="card-outline" label="Payment Terms" value={bill.paymentTerms} />
            <InfoRow icon="time-outline" label="Due Date" value={formatDate(bill.dueDate)} />
            {bill.remarks ? <InfoRow icon="chatbox-outline" label="Department Remarks" value={bill.remarks} /> : null}
          </View>

          {bill.verifiedByName ? (
            <View className="mt-3 rounded-xl bg-success-50 p-3 dark:bg-success-900/20">
              <Text className="text-xs font-semibold text-success-700 dark:text-success-400">Verified</Text>
              <Text className="mt-1 text-sm text-success-900 dark:text-success-300">
                By {bill.verifiedByName} on {formatDate(bill.verifiedAt)}
              </Text>
            </View>
          ) : null}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Invoice PDF</Text>
          {bill.invoiceFiles.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No invoice PDF uploaded yet.</Text>
          ) : (
            <>
              <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">{bill.invoiceFiles.length} version(s) on file.</Text>
              {bill.invoiceFiles.map((pdf) => (
                <Text key={pdf.version} onPress={() => openFile(pdf.url)} className="mt-2 text-sm text-primary-600 underline">
                  v{pdf.version} — {pdf.fileName} ({formatDate(pdf.uploadedAt)})
                  {pdf.version === latestInvoice?.version ? '  (current)' : ''}
                </Text>
              ))}
            </>
          )}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Supporting Documents</Text>
          {bill.supportingDocuments.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No supporting documents uploaded.</Text>
          ) : (
            bill.supportingDocuments.map((pdf) => (
              <Text key={pdf.version} onPress={() => openFile(pdf.url)} className="mt-2 text-sm text-primary-600 underline">
                v{pdf.version} — {pdf.fileName} ({formatDate(pdf.uploadedAt)})
              </Text>
            ))
          )}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Bill History</Text>
          {bill.decisionHistory.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No Accounts decisions recorded yet.</Text>
          ) : (
            bill.decisionHistory
              .slice()
              .reverse()
              .map((entry, index) => (
                <View key={`${entry.decidedAt}-${index}`} className="mt-3 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800">
                  <View className="flex-row items-center justify-between">
                    <Badge label={DECISION_LABEL[entry.decision]} variant={STATUS_VARIANT[entry.decision]} />
                    <Text className="text-xs text-ink-muted dark:text-slate-500">{formatDateTime(entry.decidedAt)}</Text>
                  </View>
                  <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">By {entry.decidedByName || '—'}</Text>
                  {entry.remarks ? <Text className="mt-1 text-sm text-ink dark:text-slate-200">{entry.remarks}</Text> : null}
                </View>
              ))
          )}
        </DashboardCard>

        {bill.status === 'director_approved' ? (
          <>
            <Button label="Verify Bill" onPress={() => setPendingDecision('verified')} className="mt-5" />
            <Button label="Request Correction" variant="secondary" onPress={() => setPendingDecision('correction_requested')} className="mt-3" />
            <Button label="Reject Bill" variant="dangerOutline" onPress={() => setPendingDecision('rejected')} className="mt-3" />
          </>
        ) : (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="information-circle-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-center text-sm text-ink-muted dark:text-slate-400">
              {bill.status === 'correction_requested'
                ? 'Waiting for the Department User to resubmit this bill.'
                : `This bill is ${STATUS_LABEL[bill.status]} and is no longer awaiting a decision.`}
            </Text>
          </View>
        )}
      </ScrollView>

      <AccountsBillDecisionSheet
        decision={pendingDecision}
        isSubmitting={isDeciding}
        onConfirm={handleConfirmDecision}
        onClose={() => setPendingDecision(null)}
      />
    </Screen>
  );
}
