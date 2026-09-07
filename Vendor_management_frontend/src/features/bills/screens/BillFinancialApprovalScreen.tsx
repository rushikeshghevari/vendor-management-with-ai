import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { ComparisonTable } from '@/components/director/ComparisonTable';
import { DifferencesPanel } from '@/components/director/DifferencesPanel';
import { FinancialDecisionSheet } from '@/components/director/FinancialDecisionSheet';
import { ReviewTimeline } from '@/components/director/ReviewTimeline';
import { ScoreGauge, recommendationBandCopy } from '@/components/director/ScoreGauge';
import { Loader } from '@/components/ui/Loader';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Screen } from '@/components/ui/Screen';
import { DirectorApprovalHistory } from '@/components/quotations/DirectorApprovalHistory';
import { env } from '@/config/env';
import { useDecideFinancialApprovalMutation } from '@/features/bills/api/billsApi';
import type { DirectorFinancialDecision } from '@/features/bills/types';
import { useGetBillReviewQuery } from '@/features/director/api/directorApi';
import { useTriggerAiVerificationMutation } from '@/features/purchaseOrders/api/purchaseOrdersApi';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BillFinancialApproval'>;

const RISK_COLOR = { LOW: '#059669', MEDIUM: '#D97706', HIGH: '#DC2626' } as const;
const RISK_BG = { LOW: '#ECFDF5', MEDIUM: '#FFFBEB', HIGH: '#FEF2F2' } as const;
const REC_LABEL = { APPROVE: 'Approve', MANUAL_REVIEW: 'Manual Review', REJECT: 'Reject' } as const;
const REC_COLOR = { APPROVE: '#059669', MANUAL_REVIEW: '#D97706', REJECT: '#DC2626' } as const;

function formatINR(amount?: number | null): string {
  if (amount == null) return '—';
  return `₹ ${amount.toLocaleString('en-IN')}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function refName(ref: { name?: string } | string | null | undefined): string {
  if (!ref || typeof ref === 'string') return '—';
  return ref.name ?? '—';
}

function fileUrl(url: string): string {
  return `${env.apiUrl.replace('/api/v1', '')}${url}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-t border-slate-100 py-2.5 dark:border-slate-800">
      <Text className="text-sm text-ink-muted dark:text-slate-400">{label}</Text>
      <Text className="max-w-[58%] text-right text-sm font-medium text-ink dark:text-slate-200">{value}</Text>
    </View>
  );
}

function PdfLink({ label, url, current }: { label: string; url: string; current?: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      className="mt-2 flex-row items-center gap-2"
      onPress={() => Linking.openURL(fileUrl(url))}
    >
      <Ionicons name="document-attach-outline" size={15} color="#1e88e5" />
      <Text className="flex-1 text-sm font-medium text-primary-600 underline" numberOfLines={1}>
        {label}{current ? '  ✓ current' : ''}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color="#1e88e5" />
      <Text className="text-sm font-semibold text-ink dark:text-slate-200">{title}</Text>
    </View>
  );
}

export function BillFinancialApprovalScreen({ navigation, route }: Props) {
  const { billId } = route.params;
  const [pendingDecision, setPendingDecision] = useState<DirectorFinancialDecision | null>(null);

  const { data: review, isLoading, isFetching, refetch } = useGetBillReviewQuery(billId);
  const [decideFinancialApproval, { isLoading: isDeciding }] = useDecideFinancialApprovalMutation();
  const [triggerAiVerification, { isLoading: isTriggeringAi }] = useTriggerAiVerificationMutation();

  const handleRunAiVerification = async () => {
    if (!review?.purchaseOrder) return;
    try {
      await triggerAiVerification(review.purchaseOrder.id).unwrap();
      refetch();
    } catch (err) {
      Alert.alert('Could Not Run AI Verification', getErrorMessage(err));
    }
  };

  const handleApprove = async () => {
    try {
      await decideFinancialApproval({ id: billId, decision: 'approved' }).unwrap();
      setTimeout(() => navigation.goBack(), 400);
    } catch (err) {
      Alert.alert('Could Not Approve', getErrorMessage(err));
    }
  };

  const handleConfirm = async (remarks?: string) => {
    if (!pendingDecision) return;
    try {
      await decideFinancialApproval({ id: billId, decision: pendingDecision, remarks }).unwrap();
      setPendingDecision(null);
      setTimeout(() => navigation.goBack(), 400);
    } catch (err) {
      Alert.alert('Could Not Record Decision', getErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader
          title="Financial Review"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
          rightSlot={<NotificationBell />}
        />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!review) {
    return (
      <Screen padded={false}>
        <AppHeader title="Financial Review" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
          <Text className="mt-3 text-center text-base font-medium text-ink-muted dark:text-slate-400">
            Bill not found.
          </Text>
        </View>
      </Screen>
    );
  }

  const { bill, quotation, purchaseOrder, aiVerification, comparisonTable, differencesBySeverity, timeline } = review;
  const alreadyDecided = Boolean(bill.directorFinancialDecision);
  const recurring = bill.recurringExpense;
  const overPercent = recurring && recurring.baselineAmount > 0
    ? ((bill.invoiceAmount - recurring.baselineAmount) / recurring.baselineAmount) * 100
    : null;
  const bandCopy = recommendationBandCopy(review.recommendationBand);
  const risk = (aiVerification.risk ?? 'MEDIUM') as keyof typeof RISK_COLOR;
  const rec = (aiVerification.recommendation ?? 'MANUAL_REVIEW') as keyof typeof REC_COLOR;
  const latestInvoice = bill.invoiceFiles[bill.invoiceFiles.length - 1];
  const latestQuotationPdf = quotation?.pdfFiles[quotation.pdfFiles.length - 1];

  return (
    <Screen padded={false}>
      <AppHeader
        title="Financial Review"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightSlot={<NotificationBell />}
      />

      <ScrollView
        className="flex-1 bg-surface-muted dark:bg-surface-dark"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AI Recommendation banner ── */}
        <View
          className="mb-4 flex-row items-center gap-3 rounded-2xl px-4 py-3"
          style={{ backgroundColor: bandCopy.bg }}
        >
          <Ionicons
            name={review.recommendationBand === 'red' ? 'alert-circle' : review.recommendationBand === 'warning' ? 'warning' : 'checkmark-circle'}
            size={20}
            color={bandCopy.color}
          />
          <Text className="flex-1 text-sm font-semibold" style={{ color: bandCopy.color }}>
            {bandCopy.label}
          </Text>
        </View>

        {/* ── Recurring Expense context — this bill has no PO/GRN; it's here purely because
            its amount exceeded the series' approved threshold. ── */}
        {recurring ? (
          <View className="mb-4 flex-row items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
            <Ionicons name="repeat" size={20} color="#1e88e5" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Recurring — {recurring.title}
              </Text>
              <Text className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
                Baseline ₹{recurring.baselineAmount.toLocaleString('en-IN')} · this cycle is
                {overPercent !== null ? ` ${overPercent.toFixed(1)}%` : ''} over the {recurring.thresholdPercent}% threshold — needs your approval.
              </Text>
              {recurring.mode === 'reimbursement' && bill.reimbursedTo ? (
                <Text className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">Reimburse to: {bill.reimbursedTo.name ?? '—'}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Bill Information ── */}
        <DashboardCard className="mb-4">
          <SectionTitle icon="receipt-outline" title="Bill Information" />
          <DetailRow label="Bill Number" value={bill.billCode} />
          <DetailRow label="Invoice Number" value={bill.invoiceNumber} />
          <DetailRow label="Invoice Date" value={formatDate(bill.invoiceDate)} />
          <DetailRow label="Vendor" value={bill.vendor?.name ?? '—'} />
          <DetailRow label="Department" value={bill.department?.name ?? '—'} />
          <DetailRow label="Uploaded By" value={bill.uploadedBy?.name ?? '—'} />
          <DetailRow label="Bill Amount" value={formatINR(bill.invoiceAmount)} />
          <DetailRow label="Taxable Amount" value={formatINR(bill.taxableAmount)} />
          <DetailRow label="GST" value={formatINR(bill.gstAmount)} />
          <DetailRow label="Grand Total" value={formatINR(bill.grandTotal)} />
          {latestInvoice ? (
            <PdfLink label={`Invoice PDF — v${latestInvoice.version}`} url={latestInvoice.url} current />
          ) : (
            <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">No invoice PDF uploaded.</Text>
          )}
        </DashboardCard>

        {/* ── Approved Quotation ── */}
        <DashboardCard className="mb-4">
          <SectionTitle icon="document-text-outline" title="Approved Quotation" />
          {quotation ? (
            <>
              <DetailRow label="Quotation Number" value={quotation.quotationCode} />
              <DetailRow label="Quotation Amount" value={formatINR(quotation.amount)} />
              <DetailRow label="GST" value={`${quotation.gst}%`} />
              <DetailRow label="Grand Total" value={formatINR(quotation.grandTotal)} />
              <DetailRow label="Vendor" value={quotation.vendor?.name ?? '—'} />
              <DetailRow label="Department" value={refName(quotation.department)} />
              <DetailRow label="Created By" value={refName(quotation.createdBy)} />
              <DetailRow label="Submitted By" value={refName(quotation.submittedBy)} />
              <DetailRow label="Approval Date" value={formatDate(quotation.approvalDate)} />
              {latestQuotationPdf ? (
                <PdfLink label={`Quotation PDF — v${latestQuotationPdf.version}`} url={latestQuotationPdf.url} current />
              ) : (
                <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">No quotation PDF uploaded.</Text>
              )}
            </>
          ) : (
            <Text className="text-xs text-ink-muted dark:text-slate-500">Quotation not found.</Text>
          )}
        </DashboardCard>

        {/* ── Purchase Order ── */}
        <DashboardCard className="mb-4">
          <SectionTitle icon="cart-outline" title="Purchase Order" />
          {purchaseOrder ? (
            <>
              <DetailRow label="PO Number" value={purchaseOrder.poNumber} />
              <DetailRow label="PO Amount" value={formatINR(purchaseOrder.grandTotal)} />
              <DetailRow label="Created By" value={refName(purchaseOrder.createdBy)} />
              <DetailRow label="Already Billed" value={formatINR(purchaseOrder.alreadyBilled)} />
              <DetailRow label="Remaining Balance" value={formatINR(purchaseOrder.remainingBalance)} />
              <DetailRow label="Available Balance" value={formatINR(purchaseOrder.availableBalance)} />
              <Pressable
                accessibilityRole="link"
                className="mt-2 flex-row items-center gap-2"
                onPress={() => Linking.openURL(fileUrl(purchaseOrder.pdfDownloadPath))}
              >
                <Ionicons name="download-outline" size={15} color="#1e88e5" />
                <Text className="text-sm font-medium text-primary-600 underline">Download PO PDF</Text>
              </Pressable>
            </>
          ) : (
            <Text className="text-xs text-ink-muted dark:text-slate-500">No Purchase Order linked yet.</Text>
          )}
        </DashboardCard>

        {/* ── Previous Bills under this PO — only one Bill is ever active per PO, but a prior
            Draft that was deleted and replaced still shows up here for full traceability. ── */}
        {purchaseOrder && purchaseOrder.previousBills.length > 0 ? (
          <DashboardCard className="mb-4">
            <SectionTitle icon="time-outline" title="Previous Bills Under This PO" />
            {purchaseOrder.previousBills.map((prev) => (
              <View key={prev._id} className="border-t border-slate-100 py-2.5 dark:border-slate-800">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-ink dark:text-slate-200">{prev.billCode}</Text>
                  <Text className="text-sm text-ink dark:text-white">{formatINR(prev.invoiceAmount)}</Text>
                </View>
                <View className="mt-0.5 flex-row items-center justify-between">
                  <Text className="text-xs text-ink-muted dark:text-slate-500">
                    {prev.invoiceNumber} · {formatDate(prev.createdAt)}
                  </Text>
                  <Text className="text-xs text-ink-muted dark:text-slate-500">
                    {prev.isDeleted ? 'Deleted' : prev.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
            ))}
          </DashboardCard>
        ) : null}

        {/* ── AI Verification Summary ── */}
        <DashboardCard className="mb-4">
          <SectionTitle icon="sparkles" title="AI Verification Summary" />
          {aiVerification.available ? (
            <>
              <View className="flex-row items-center gap-4">
                <ScoreGauge value={aiVerification.matchPercentage ?? 0} />
                <View className="flex-1 gap-2">
                  <View className="flex-row items-center gap-2">
                    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: RISK_BG[risk] }}>
                      <Text className="text-[11px] font-bold" style={{ color: RISK_COLOR[risk] }}>Risk: {risk}</Text>
                    </View>
                    <View className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                      <Text className="text-[11px] font-bold" style={{ color: REC_COLOR[rec] }}>
                        {REC_LABEL[rec]}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-ink-muted dark:text-slate-400">
                    Confidence: {aiVerification.confidence}% · Rule Engine: {aiVerification.ruleEngineScore}%
                  </Text>
                  <Text className="text-xs text-ink-muted dark:text-slate-400">
                    Match % — Quotation: {aiVerification.quotationMatch ?? '—'}% · PO: {aiVerification.purchaseOrderMatch ?? '—'}%
                  </Text>
                </View>
              </View>

              {aiVerification.summary ? (
                <Text className="mt-3 text-xs leading-5 text-ink dark:text-slate-300">{aiVerification.summary}</Text>
              ) : null}

              <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Text className="text-[11px] text-ink-muted dark:text-slate-500">
                  Execution Time: {aiVerification.executionTimeMs ? `${(aiVerification.executionTimeMs / 1000).toFixed(1)}s` : '—'}
                </Text>
                <Text className="text-[11px] text-ink-muted dark:text-slate-500">
                  Model: {aiVerification.modelVersion ?? '—'}
                </Text>
                <Text className="text-[11px] text-ink-muted dark:text-slate-500">
                  Tokens: {aiVerification.tokenUsage?.totalTokens ?? '—'}
                </Text>
                <Text className="text-[11px] text-ink-muted dark:text-slate-500">
                  Provider: {aiVerification.aiProvider === 'gemini' ? 'Gemini' : 'Rule Engine'}
                </Text>
              </View>
            </>
          ) : recurring ? (
            <View className="items-center gap-2 rounded-xl bg-slate-100 px-4 py-5 dark:bg-slate-800">
              <Ionicons name="information-circle-outline" size={22} color="#5f5f5f" />
              <Text className="text-center text-xs text-ink-muted dark:text-slate-400">
                Recurring expenses have no Purchase Order to verify against, so AI/3-way matching doesn't apply here.
              </Text>
            </View>
          ) : (
            <View className="items-center gap-3 rounded-xl bg-amber-50 px-4 py-5 dark:bg-amber-900/20">
              <Ionicons name="hourglass-outline" size={22} color="#d97706" />
              <Text className="text-center text-xs text-amber-700 dark:text-amber-400">
                AI verification has not been run for this bill yet.
              </Text>
              {review.canTriggerAiVerification ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isTriggeringAi}
                  onPress={handleRunAiVerification}
                  className="flex-row items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 active:bg-amber-600"
                >
                  <Ionicons name="play-outline" size={15} color="#fff" />
                  <Text className="text-xs font-bold text-white">
                    {isTriggeringAi ? 'Running…' : 'Run AI Verification'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </DashboardCard>

        {/* ── AI Comparison Table ── */}
        {aiVerification.available ? (
          <DashboardCard className="mb-4">
            <SectionTitle icon="grid-outline" title="AI Comparison Table" />
            <ComparisonTable rows={comparisonTable} />
          </DashboardCard>
        ) : null}

        {/* ── Differences ── */}
        {aiVerification.available ? (
          <DashboardCard className="mb-4">
            <SectionTitle icon="alert-circle-outline" title="Differences" />
            <DifferencesPanel bySeverity={differencesBySeverity} />
          </DashboardCard>
        ) : null}

        {/* ── Director Approvals Roster ── */}
        {bill.directorApprovals && bill.directorApprovals.length > 0 ? (
          <DashboardCard className="mb-4">
            <SectionTitle icon="people-outline" title="Director Approvals Roster" />
            <DirectorApprovalHistory approvals={bill.directorApprovals as any} />
          </DashboardCard>
        ) : null}

        {/* ── Timeline ── */}
        <DashboardCard className="mb-4">
          <SectionTitle icon="time-outline" title="Timeline" />
          <ReviewTimeline events={timeline} />
        </DashboardCard>

        {/* ── Previous decision (if any) ── */}
        {bill.directorFinancialRemarks ? (
          <DashboardCard className="mb-4 bg-amber-50 dark:bg-amber-900/10">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Your Previous Remarks</Text>
            <Text className="mt-2 text-sm leading-5 text-amber-800 dark:text-amber-300">
              {bill.directorFinancialRemarks}
            </Text>
          </DashboardCard>
        ) : null}

        {isFetching ? <Loader label="Refreshing…" /> : null}
      </ScrollView>

      {/* ── Sticky Approval Footer ── */}
      {review.canDecide ? (
        <View className="border-t border-slate-100 bg-white px-4 pb-6 pt-3 dark:border-slate-800 dark:bg-surface-dark">
          {alreadyDecided ? (
            <View className="mb-2 flex-row items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
              <Ionicons name="refresh-outline" size={12} color="#d97706" />
              <Text className="flex-1 text-[11px] text-amber-700 dark:text-amber-400">
                You already acted on this bill. Acting again will update your decision.
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={isDeciding}
            onPress={handleApprove}
            className="flex-row items-center justify-center rounded-xl bg-success-500 py-3.5 active:bg-success-600"
          >
            <Ionicons name="checkmark-circle" size={19} color="#fff" />
            <Text className="ml-2 text-sm font-bold text-white">{alreadyDecided ? 'Re-Approve' : 'Approve'}</Text>
          </Pressable>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={isDeciding}
              onPress={() => setPendingDecision('correction_required')}
              className="flex-1 flex-row items-center justify-center rounded-xl border-2 border-amber-300 bg-amber-50 py-3 active:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20"
            >
              <Ionicons name="return-up-back-outline" size={16} color="#d97706" />
              <Text className="ml-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">Send Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isDeciding}
              onPress={() => setPendingDecision('rejected')}
              className="flex-1 flex-row items-center justify-center rounded-xl border-2 border-red-300 bg-red-50 py-3 active:bg-red-100 dark:border-red-800 dark:bg-red-950/20"
            >
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text className="ml-1.5 text-xs font-bold text-red-600 dark:text-red-400">Reject</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="border-t border-slate-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-surface-dark">
          <View className="flex-row items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
            <Ionicons
              name={bill.directorFinancialDecision === 'approved' ? 'checkmark-circle' : 'information-circle-outline'}
              size={20}
              color={bill.directorFinancialDecision === 'approved' ? '#43a047' : '#94a3b8'}
            />
            <Text className="flex-1 text-xs text-ink-muted dark:text-slate-400">
              {bill.directorFinancialDecision === 'approved'
                ? 'You approved this bill. Forwarded to Accounts.'
                : bill.directorFinancialDecision === 'rejected'
                  ? 'This bill was rejected.'
                  : bill.directorFinancialDecision === 'correction_required'
                    ? 'Sent back to Department for correction.'
                    : `No action available — current status is "${bill.status}".`}
            </Text>
          </View>
        </View>
      )}

      <FinancialDecisionSheet
        decision={pendingDecision}
        isSubmitting={isDeciding}
        onConfirm={handleConfirm}
        onClose={() => setPendingDecision(null)}
      />
    </Screen>
  );
}
