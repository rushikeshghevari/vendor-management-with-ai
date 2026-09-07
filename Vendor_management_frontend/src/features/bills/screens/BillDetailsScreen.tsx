import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { BillHistoryList } from '@/components/bills/BillHistoryList';
import { BillProgressStepper } from '@/components/bills/BillProgressStepper';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { DirectorApprovalHistory } from '@/components/quotations/DirectorApprovalHistory';
import { ROLES } from '@/constants/roles';
import { env } from '@/config/env';
import {
  useDeleteBillMutation,
  useGetBillsQuery,
  useGetBillTimelineQuery,
  useResubmitBillMutation,
  useRetryAiVerificationMutation,
  useSubmitBillMutation,
} from '@/features/bills/api/billsApi';
import { useGetPurchaseOrderByQuotationQuery } from '@/features/purchaseOrders/api/purchaseOrdersApi';
import type { BillStatus } from '@/features/bills/types';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { BillsStackParamList, RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<BillsStackParamList, 'BillDetails'>;

const STATUS_LABEL: Record<BillStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  ai_failed: 'AI Failed',
  ai_verified: 'AI Verified',
  director_approved: 'Ready for Accounts',
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

export function BillDetailsScreen({ navigation, route }: Props) {
  const { billId } = route.params;
  const { hasRole } = useAuth();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isDepartmentUser = hasRole(ROLES.DEPARTMENT_USER);
  const isDirector = hasRole(ROLES.DIRECTOR);
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirectorOrSuperAdmin = isDirector || isSuperAdmin;

  const { data: bills, isLoading } = useGetBillsQuery();
  const [submitBill, { isLoading: isSubmitting }] = useSubmitBillMutation();
  const [resubmitBill, { isLoading: isResubmitting }] = useResubmitBillMutation();
  const [deleteBill] = useDeleteBillMutation();
  const [retryAiVerification, { isLoading: isRetryingAi }] = useRetryAiVerificationMutation();

  const bill = bills?.find((item) => item.id === billId);

  // PO balance is shown regardless of role once a PO is linked — remaining balance is
  // computed client-side as grandTotal - thisBill's own amount (only one bill per PO today).
  const { data: linkedPo } = useGetPurchaseOrderByQuotationQuery(bill?.quotationId ?? '', {
    skip: !bill?.quotationId,
  });
  const { data: timeline } = useGetBillTimelineQuery(billId, { skip: !billId });

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

  const handleSubmit = async () => {
    try {
      await submitBill(bill.id).unwrap();
    } catch (error) {
      Alert.alert('Could Not Submit Bill', getErrorMessage(error));
    }
  };

  const handleResubmit = async () => {
    try {
      await resubmitBill(bill.id).unwrap();
    } catch (error) {
      Alert.alert('Could Not Resubmit Bill', getErrorMessage(error));
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Bill', `"${bill.billCode}" will be permanently removed from your drafts.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteBill(bill.id).unwrap();
            navigation.goBack();
          } catch (error) {
            Alert.alert('Could Not Delete Bill', getErrorMessage(error));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const openFile = (url: string) =>
    navigation.navigate('PdfViewer', { url: `${env.apiUrl.replace('/api/v1', '')}${url}`, title: bill.billCode });
  const latestInvoice = bill.invoiceFiles[bill.invoiceFiles.length - 1];

  // Director can open the financial approval screen directly from bill details.
  const canDirectorAct = isDirector && bill.status === 'ai_verified';
  const remainingPoBalance = linkedPo ? linkedPo.grandTotal - bill.invoiceAmount : null;

  const handleRetryAi = async () => {
    try {
      await retryAiVerification(bill.id).unwrap();
    } catch (error) {
      Alert.alert('Could Not Retry AI Verification', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Bill Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Workflow progress indicator */}
        <DashboardCard className="mb-4">
          <BillProgressStepper status={bill.status} />
        </DashboardCard>

        {/* AI Failed — Director/Super Admin recovery action */}
        {bill.status === 'ai_failed' ? (
          <View className="mb-4 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
            <View className="flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text className="flex-1 text-sm font-semibold text-red-700 dark:text-red-400">
                AI Verification Failed
              </Text>
            </View>
            <Text className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              The AI pipeline could not complete for this bill.{isDirectorOrSuperAdmin ? ' Retry once the issue is resolved.' : ' A Director or Super Admin will retry it.'}
            </Text>
            {isDirectorOrSuperAdmin ? (
              <Button label="Retry AI Verification" loading={isRetryingAi} onPress={handleRetryAi} className="mt-3" />
            ) : null}
          </View>
        ) : null}

        {/* Director Financial Approval CTA — only when bill is AI-Verified and awaiting decision */}
        {canDirectorAct ? (
          <Pressable
            className="mb-4 flex-row items-center gap-3 rounded-xl bg-violet-600 px-4 py-4 active:bg-violet-700"
            onPress={() => rootNav.navigate('BillFinancialApproval', { billId: bill.id })}
            accessibilityRole="button"
          >
            <Ionicons name="shield-checkmark" size={22} color="#fff" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-white">Financial Approval Required</Text>
              <Text className="text-xs text-white/70">AI has verified this bill. Tap to review and decide.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
        ) : null}

        {/* Director Financial Decisions (Roster) */}
        {bill.directorApprovals && bill.directorApprovals.length > 0 ? (
          <DashboardCard className="mb-4">
            <Text className="mb-3 text-sm font-semibold text-ink dark:text-slate-200">
              Director Approvals Roster
            </Text>
            <DirectorApprovalHistory approvals={bill.directorApprovals as any} />
          </DashboardCard>
        ) : null}

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
            <InfoRow icon="document-text-outline" label="Quotation" value={bill.quotationCode} />
            {bill.purchaseOrderNumber ? (
              <InfoRow icon="cart-outline" label="Purchase Order" value={bill.purchaseOrderNumber} />
            ) : null}
            {linkedPo ? (
              <InfoRow icon="wallet-outline" label="Remaining PO Balance" value={`₹ ${(remainingPoBalance ?? 0).toLocaleString('en-IN')} of ₹ ${linkedPo.grandTotal.toLocaleString('en-IN')}`} />
            ) : null}
            <InfoRow icon="business-outline" label="Department" value={bill.departmentName} />
            <InfoRow icon="pricetag-outline" label="Invoice Number" value={bill.invoiceNumber} />
            <InfoRow icon="calendar-outline" label="Invoice Date" value={formatDate(bill.invoiceDate)} />
            <InfoRow icon="cash-outline" label="Invoice Amount" value={`₹ ${bill.invoiceAmount.toLocaleString('en-IN')}`} />
            <InfoRow icon="calculator-outline" label="Taxable Amount" value={`₹ ${bill.taxableAmount.toLocaleString('en-IN')}`} />
            <InfoRow icon="calculator-outline" label="GST Amount" value={`₹ ${bill.gstAmount.toLocaleString('en-IN')}`} />
            <InfoRow icon="card-outline" label="Payment Terms" value={bill.paymentTerms} />
            <InfoRow icon="time-outline" label="Due Date" value={formatDate(bill.dueDate)} />
            {bill.remarks ? <InfoRow icon="chatbox-outline" label="Remarks" value={bill.remarks} /> : null}
          </View>

          {bill.accountsRemarks ? (
            <View className="mt-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-950">
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400">Accounts Remarks</Text>
              <Text className="mt-1 text-sm text-amber-900 dark:text-amber-200">{bill.accountsRemarks}</Text>
            </View>
          ) : null}

          <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="person-circle-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">By {bill.createdByName || '—'}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">Created {formatDate(bill.createdAt)}</Text>
            </View>
          </View>
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Invoice PDF</Text>
          {bill.invoiceFiles.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No invoice PDF uploaded yet.</Text>
          ) : (
            <>
              <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">
                {bill.invoiceFiles.length} version(s) — version history is kept, never overwritten.
              </Text>
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

        {/* Department User actions */}
        {isDepartmentUser && bill.status === 'draft' ? (
          <>
            <Button label="Edit Bill" onPress={() => navigation.navigate('EditBill', { billId: bill.id })} className="mt-5" />
            <Button label="Submit for AI Verification" variant="secondary" loading={isSubmitting} onPress={handleSubmit} className="mt-3" />
            <Button label="Delete Bill" variant="dangerOutline" loading={isDeleting} onPress={handleDelete} className="mt-3" />
          </>
        ) : null}

        {isDepartmentUser && bill.status === 'director_correction' ? (
          <>
            <View className="mt-5 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
              <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">Director Requested Correction</Text>
              {bill.directorFinancialRemarks ? (
                <Text className="mt-1.5 text-sm text-amber-700 dark:text-amber-400">{bill.directorFinancialRemarks}</Text>
              ) : null}
            </View>
            <Button label="Edit Bill" onPress={() => navigation.navigate('EditBill', { billId: bill.id })} className="mt-4" />
            <Button label="Resubmit for AI Verification" variant="secondary" loading={isResubmitting} onPress={handleResubmit} className="mt-3" />
          </>
        ) : null}

        {isDepartmentUser && bill.status === 'correction_requested' ? (
          <>
            <View className="mt-5 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
              <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">Accounts Requested Correction</Text>
              {bill.accountsRemarks ? (
                <Text className="mt-1.5 text-sm text-amber-700 dark:text-amber-400">{bill.accountsRemarks}</Text>
              ) : null}
            </View>
            <Button label="Edit Bill" onPress={() => navigation.navigate('EditBill', { billId: bill.id })} className="mt-4" />
            <Button label="Resubmit to Accounts" variant="secondary" loading={isResubmitting} onPress={handleResubmit} className="mt-3" />
          </>
        ) : null}

        {/* Status banners (Department User read-only) */}
        {isDepartmentUser && bill.status === 'submitted' ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="sparkles" size={20} color="#7C3AED" />
            <Text className="mt-1.5 text-center text-sm text-ink-muted dark:text-slate-400">
              AI verification in progress. You'll be notified when complete.
            </Text>
          </View>
        ) : null}

        {isDepartmentUser && bill.status === 'ai_verified' ? (
          <View className="mt-5 items-center rounded-xl bg-violet-50 p-4 dark:bg-violet-900/20">
            <Ionicons name="sparkles" size={20} color="#7C3AED" />
            <Text className="mt-1.5 text-center text-sm text-violet-700 dark:text-violet-300">
              AI verification complete. Sent to Accounts for verification.
            </Text>
          </View>
        ) : null}

        {isDepartmentUser && bill.status === 'director_approved' ? (
          <View className="mt-5 items-center rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text className="mt-1.5 text-center text-sm text-green-700 dark:text-green-300">
              Sent to Accounts for verification.
            </Text>
          </View>
        ) : null}

        {isDepartmentUser && bill.status === 'director_rejected' ? (
          <View className="mt-5 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
            <Text className="text-sm font-semibold text-red-700 dark:text-red-400">Director Rejected</Text>
            {bill.directorFinancialRemarks ? (
              <Text className="mt-1.5 text-sm text-red-600 dark:text-red-400">{bill.directorFinancialRemarks}</Text>
            ) : null}
          </View>
        ) : null}

        {bill.status === 'verified' ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="checkmark-circle-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-sm text-ink-muted dark:text-slate-400">Verified — ready for Payment processing.</Text>
          </View>
        ) : null}

        {/* Recurring — set up once a bill is Director-approved (a recurring cycle's own Bill
            already carries recurringExpenseId, so this never offers to make one recurring). */}
        {isDepartmentUser && !bill.recurringExpenseId
        && (bill.status === 'verified' || bill.status === 'payment_pending' || bill.status === 'paid' || bill.status === 'completed') ? (
          <Button
            label="Make Recurring"
            variant="secondary"
            onPress={() => navigation.navigate('CreateRecurringExpense')}
            className="mt-3"
          />
        ) : null}

        {bill.recurringExpenseId ? (
          <View className="mt-5 flex-row items-center gap-2 rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
            <Ionicons name="repeat" size={18} color="#1e88e5" />
            <Text className="flex-1 text-sm text-blue-700 dark:text-blue-300">
              Recurring — {bill.recurringExpenseTitle ?? 'this series'}
              {bill.recurringExpenseThresholdPercent !== undefined ? ` (${bill.recurringExpenseThresholdPercent}% threshold)` : ''}
            </Text>
          </View>
        ) : null}

        {/* No Vendor record exists for a reimbursement payee — this is where Payment
            Department finds the account to actually transfer the money to. */}
        {bill.reimbursementBankDetails ? (
          <View className="mt-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted dark:text-slate-400">
              Reimburse To — Bank Details
            </Text>
            <Text className="text-sm text-ink dark:text-slate-200">{bill.reimbursedToName ?? 'Employee'}</Text>
            <Text className="mt-1 text-sm text-ink-muted dark:text-slate-400">{bill.reimbursementBankDetails.bankName}</Text>
            <Text className="text-sm text-ink-muted dark:text-slate-400">
              A/C: {bill.reimbursementBankDetails.accountHolderName} · {bill.reimbursementBankDetails.accountNumber}
            </Text>
            <Text className="text-sm text-ink-muted dark:text-slate-400">IFSC: {bill.reimbursementBankDetails.ifscCode}</Text>
            {bill.reimbursementBankDetails.upiId ? (
              <Text className="text-sm text-ink-muted dark:text-slate-400">UPI: {bill.reimbursementBankDetails.upiId}</Text>
            ) : null}
          </View>
        ) : null}

        {bill.status === 'payment_pending' || bill.status === 'paid' || bill.status === 'completed' ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="cash-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-sm text-ink-muted dark:text-slate-400">{STATUS_LABEL[bill.status]}</Text>
          </View>
        ) : null}

        {bill.status === 'rejected' ? (
          <View className="mt-5 items-center rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            <Text className="mt-1.5 text-sm text-red-700 dark:text-red-400">This bill was rejected by Accounts.</Text>
          </View>
        ) : null}

        {/* Bill History — every status change, AI run, approval, remark, actor, and timestamp */}
        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Bill History</Text>
          <View className="mt-2">
            <BillHistoryList events={timeline?.events ?? []} />
          </View>
        </DashboardCard>
      </ScrollView>
    </Screen>
  );
}
