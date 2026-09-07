import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { AiVerificationCard } from '@/features/aiVerification/components/AiVerificationCard';
import { Badge } from '@/components/ui/Badge';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DirectorApprovalHistory } from '@/components/quotations/DirectorApprovalHistory';
import { DirectorApprovalSummary } from '@/components/quotations/DirectorApprovalSummary';
import { DirectorDecisionSheet } from '@/components/quotations/DirectorDecisionSheet';
import { Loader } from '@/components/ui/Loader';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { PaymentSummaryCard } from '@/components/payments/PaymentSummaryCard';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { env } from '@/config/env';
import { useDecideQuotationMutation, useGetQuotationByIdQuery } from '@/features/quotations/api/quotationsApi';
import { useGetPurchaseOrderByQuotationQuery } from '@/features/purchaseOrders/api/purchaseOrdersApi';
import type { DirectorDecision, QuotationStatus } from '@/features/quotations/types';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { RootStackParamList } from '@/navigation/types';

const DECIDABLE_STATUSES: QuotationStatus[] = ['submitted', 'negotiation', 'resubmitted', 'approved', 'rejected'];

type Props = NativeStackScreenProps<RootStackParamList, 'QuotationApproval'>;

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

// Short labels for the linked Bill's status, shown in the Linked Documents card — a subset
// of BillStatus rendered here, so an unmapped value just falls back to the raw string.
const STATUS_LABEL_BILL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  ai_verified: 'AI Verified',
  director_approved: 'Dir. Approved',
  director_rejected: 'Dir. Rejected',
  director_correction: 'Correction',
  verified: 'Verified',
  correction_requested: 'Correction',
  rejected: 'Rejected',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  completed: 'Completed',
};

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'INR') {
    return `₹ ${amount.toLocaleString('en-IN')}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Two-column info chip used inside the priority card
function InfoChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="mb-3 w-1/2 pr-4">
      <View className="mb-0.5 flex-row items-center gap-1">
        <Ionicons name={icon} size={11} color="rgba(255,255,255,0.5)" />
        <Text className="text-[10px] uppercase tracking-wider text-white/50">{label}</Text>
      </View>
      <Text className="text-sm font-semibold text-white" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// Single-row label/value used in the scrollable detail cards
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-t border-slate-100 py-2.5 dark:border-slate-800">
      <Text className="text-sm text-ink-muted dark:text-slate-400">{label}</Text>
      <Text className="max-w-[58%] text-right text-sm font-medium text-ink dark:text-slate-200">{value}</Text>
    </View>
  );
}

export function QuotationApprovalScreen({ navigation, route }: Props) {
  const { quotationId } = route.params;
  const { user, hasRole } = useAuth();
  const isDirector  = hasRole(ROLES.DIRECTOR);
  const isCeo       = hasRole(ROLES.CEO);
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const [pendingDecision, setPendingDecision] = useState<DirectorDecision | null>(null);

  const { data: quotation, isLoading } = useGetQuotationByIdQuery(quotationId, { skip: !quotationId });
  const [decideQuotation, { isLoading: isDeciding }] = useDecideQuotationMutation();
  // Fetch linked PO (if generated) to surface AI verification results to the Director.
  // 404 is handled gracefully by the queryFn — returns null, not an error.
  const { data: linkedPo } = useGetPurchaseOrderByQuotationQuery(quotationId, {
    skip: !quotationId,
  });

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader
          title="Quotation Approval"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
          rightSlot={<NotificationBell />}
        />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!quotation) {
    return (
      <Screen padded={false}>
        <AppHeader
          title="Quotation Approval"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
          <Text className="mt-3 text-center text-base font-medium text-ink-muted dark:text-slate-400">
            Quotation not found.
          </Text>
          <Text className="mt-1 text-center text-xs text-ink-muted dark:text-slate-500">
            It may have been deleted or the link is invalid.
          </Text>
        </View>
      </Screen>
    );
  }

  const directorApprovals = quotation.directorApprovals ?? [];
  const myApproval = directorApprovals.find((entry) => entry.directorId === user?.id);
  const hasAlreadyDecided = Boolean(myApproval && myApproval.decision !== 'pending');
  const isCeoRoute = quotation.approvalRoute === 'ceo';
  // A Director can only decide Director-routed quotations; CEO only CEO-routed ones.
  const canDecide = (isDirector && !isCeoRoute) || (isCeo && isCeoRoute);
  const canDirectorDecide = canDecide && DECIDABLE_STATUSES.includes(quotation.status);

  const totalWithGst = Math.round(quotation.amount * (1 + quotation.gst / 100));
  const latestPdf = quotation.pdfFiles[quotation.pdfFiles.length - 1];

  const handleConfirmDecision = async (remarks?: string) => {
    if (!pendingDecision) return;
    try {
      await decideQuotation({ id: quotation.id, decision: pendingDecision, remarks }).unwrap();
      setPendingDecision(null);
      // Brief pause so the success state registers before leaving the screen
      setTimeout(() => navigation.goBack(), 500);
    } catch (error) {
      Alert.alert('Could Not Record Decision', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader
        title="Quotation Approval"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightSlot={<NotificationBell />}
      />

      {/* ── Fixed top section — always visible, no scroll required ── */}
      <View className="bg-surface-muted px-4 pt-4 pb-3 dark:bg-surface-dark">

        {/* Priority Card */}
        <View
          className="overflow-hidden rounded-2xl bg-primary-600 shadow-lg"
          style={{ elevation: 4 }}
        >
          {/* Amount stripe */}
          <View className="px-5 pt-5 pb-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  Total Amount
                </Text>
                <Text
                  className="mt-1 text-4xl font-bold text-white"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatCurrency(quotation.amount, quotation.currency)}
                </Text>
                {quotation.gst > 0 ? (
                  <Text className="mt-1 text-sm text-white/70">
                    +{quotation.gst}% GST = {formatCurrency(totalWithGst, quotation.currency)}
                  </Text>
                ) : null}
              </View>
              <Badge label={STATUS_LABEL[quotation.status]} variant={STATUS_VARIANT[quotation.status]} />
            </View>

            {/* Route & priority pills */}
            <View className="mt-3 flex-row gap-2">
              <View className="self-start rounded-full bg-white/15 px-3 py-1">
                <Text className="text-xs font-semibold text-white">
                  {isCeoRoute ? '👑 CEO Route' : '👔 Directors Route'}
                </Text>
              </View>
              <View className="self-start rounded-full bg-white/15 px-3 py-1">
                <Text className="text-xs font-semibold text-white">
                  {`⚑ ${capitalize(quotation.priority)}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Info grid on dark blue background */}
          <View className="flex-row flex-wrap bg-primary-700/60 px-5 pt-4 pb-2">
            <InfoChip icon="business-outline"      label="Department"   value={quotation.departmentName || '—'} />
            <InfoChip icon="document-text-outline" label="Quotation #"  value={quotation.quotationCode} />
            <InfoChip icon="storefront-outline"    label="Vendor"       value={quotation.vendorName || '—'} />
            <InfoChip icon="calendar-outline"      label="Date"         value={formatDate(quotation.quotationDate)} />
            <InfoChip icon="person-outline"        label="Created By"   value={quotation.createdByName || '—'} />
            {quotation.submittedByName && quotation.submittedByName !== quotation.createdByName ? (
              <InfoChip icon="paper-plane-outline" label="Submitted By" value={quotation.submittedByName} />
            ) : null}
            <InfoChip icon="time-outline"          label="Required By"  value={formatDate(quotation.requiredDate)} />
          </View>
        </View>

        {/* ── Action Buttons ── */}
        {canDirectorDecide ? (
          <>
            <View className="mt-3 flex-row gap-2.5">
              {/* Approve */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Approve quotation"
                className="flex-1 flex-row items-center justify-center rounded-xl bg-success-500 py-4 active:bg-success-600"
                onPress={() => setPendingDecision('approved')}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text className="ml-2 text-base font-bold text-white">
                  {hasAlreadyDecided ? 'Re-Approve' : 'Approve'}
                </Text>
              </Pressable>

              {/* Negotiation */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Request negotiation"
                className="flex-1 flex-row items-center justify-center rounded-xl bg-amber-500 py-4 active:bg-amber-600"
                onPress={() => setPendingDecision('negotiation')}
              >
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
                <Text className="ml-2 text-base font-bold text-white">
                  {hasAlreadyDecided ? 'Re-Negotiate' : 'Negotiate'}
                </Text>
              </Pressable>
            </View>

            {/* Reject — full width, outlined so it doesn't compete visually */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reject quotation"
              className="mt-2 flex-row items-center justify-center rounded-xl border-2 border-red-300 bg-red-50 py-3.5 active:bg-red-100 dark:border-red-800 dark:bg-red-950/20"
              onPress={() => setPendingDecision('rejected')}
            >
              <Ionicons name="close-circle" size={20} color="#dc2626" />
              <Text className="ml-2 text-base font-bold text-red-600 dark:text-red-400">
                {hasAlreadyDecided ? 'Re-Reject' : 'Reject'}
              </Text>
            </Pressable>

            {/* "Already decided" notice */}
            {hasAlreadyDecided ? (
              <View className="mt-2 flex-row items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 dark:bg-amber-900/20">
                <Ionicons name="refresh-outline" size={14} color="#d97706" />
                <Text className="flex-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  You have already acted. Buttons above will update your decision.
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          /* Non-actionable state */
          <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
            <Ionicons
              name={quotation.status === 'approved' ? 'checkmark-circle' : 'information-circle-outline'}
              size={22}
              color={quotation.status === 'approved' ? '#43a047' : '#94a3b8'}
            />
            <Text className="flex-1 text-sm text-ink-muted dark:text-slate-400">
              {!canDecide
                ? `This quotation requires ${isCeoRoute ? 'CEO' : 'Director'} approval. You are not authorized to act on it.`
                : `No action available — current status is "${STATUS_LABEL[quotation.status]}".`}
            </Text>
          </View>
        )}
      </View>

      {/* ── Scrollable detail section ── */}
      <ScrollView
        className="flex-1 bg-surface-muted dark:bg-surface-dark"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Approval Summary */}
        {isDirector || isCeo || isSuperAdmin ? (
          <DashboardCard className="mt-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Approval Summary</Text>
            <View className="mt-3">
              <DirectorApprovalSummary approvals={directorApprovals} />
            </View>
          </DashboardCard>
        ) : null}

        {/* Approval History */}
        {(isDirector || isCeo || isSuperAdmin) && directorApprovals.length > 0 ? (
          <DashboardCard className="mt-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Approval History</Text>
            <View className="mt-3">
              <DirectorApprovalHistory approvals={directorApprovals} />
            </View>
          </DashboardCard>
        ) : null}

        {/* Payment summary — CEO/Director read-only window into Payment data */}
        {isCeo || isDirector ? <PaymentSummaryCard quotationId={quotation.id} /> : null}

        {/* Quotation Details */}
        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Quotation Details</Text>
          <DetailRow label="Vendor"           value={`${quotation.vendorName} (${quotation.vendorCode})`} />
          <DetailRow label="Department"       value={quotation.departmentName} />
          <DetailRow label="Quotation Date"   value={formatDate(quotation.quotationDate)} />
          <DetailRow label="Required By"      value={formatDate(quotation.requiredDate)} />
          <DetailRow label="Payment Terms"    value={quotation.paymentTerms} />
          <DetailRow label="Delivery Terms"   value={quotation.deliveryTerms} />
          {quotation.description ? (
            <DetailRow label="Description" value={quotation.description} />
          ) : null}
          {quotation.remarks ? (
            <DetailRow label="Remarks" value={quotation.remarks} />
          ) : null}
        </DashboardCard>

        {/* PDF Attachments */}
        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Quotation PDF</Text>
          {quotation.pdfFiles.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No PDF uploaded yet.</Text>
          ) : (
            <>
              <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">
                {quotation.pdfFiles.length} version(s) — full history is kept.
              </Text>
              {quotation.pdfFiles.map((pdf) => (
                <Pressable
                  key={pdf.version}
                  accessibilityRole="link"
                  className="mt-2 flex-row items-center gap-2"
                  onPress={() => Linking.openURL(`${env.apiUrl.replace('/api/v1', '')}${pdf.url}`)}
                >
                  <Ionicons name="document-attach-outline" size={15} color="#1e88e5" />
                  <Text className="flex-1 text-sm font-medium text-primary-600 underline" numberOfLines={1}>
                    v{pdf.version} — {pdf.fileName}
                    {pdf.version === latestPdf?.version ? '  ✓ current' : ''}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
        </DashboardCard>

        {/* Linked Documents — Purchase Order and Bill generated against this Quotation, so a
            Director can trace Quotation → PO → Bill without leaving this screen. */}
        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Linked Documents</Text>
          <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 py-2.5 dark:border-slate-800">
            <View className="flex-row items-center gap-2">
              <Ionicons name="cart-outline" size={15} color={linkedPo ? '#1e88e5' : '#94a3b8'} />
              <Text className="text-sm text-ink dark:text-slate-200">Purchase Order</Text>
            </View>
            {linkedPo ? (
              <Pressable onPress={() => navigation.getParent()?.navigate('PurchaseOrders', { screen: 'PurchaseOrderDetails', params: { purchaseOrderId: linkedPo.id } })}>
                <Text className="text-sm font-semibold text-primary-600">{linkedPo.poNumber}</Text>
              </Pressable>
            ) : (
              <Text className="text-sm text-ink-muted dark:text-slate-500">Not generated yet</Text>
            )}
          </View>
          {linkedPo ? (
            <View className="flex-row items-center justify-between border-t border-slate-100 py-2.5 dark:border-slate-800">
              <Text className="text-sm text-ink dark:text-slate-200">Remaining Balance</Text>
              <Text className="text-sm font-semibold text-ink dark:text-white">
                ₹ {(linkedPo.grandTotal - (quotation.linkedBill?.invoiceAmount ?? 0)).toLocaleString('en-IN')} of ₹ {linkedPo.grandTotal.toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between border-t border-slate-100 py-2.5 dark:border-slate-800">
            <View className="flex-row items-center gap-2">
              <Ionicons name="receipt-outline" size={15} color={quotation.linkedBill ? '#1e88e5' : '#94a3b8'} />
              <Text className="text-sm text-ink dark:text-slate-200">Bill</Text>
            </View>
            {quotation.linkedBill ? (
              <Text className="text-sm font-semibold text-ink dark:text-white">
                {quotation.linkedBill.billCode} · {STATUS_LABEL_BILL[quotation.linkedBill.status] ?? quotation.linkedBill.status}
              </Text>
            ) : (
              <Text className="text-sm text-ink-muted dark:text-slate-500">Not uploaded yet</Text>
            )}
          </View>
        </DashboardCard>

        {/* AI Verification — shows live Gemini results if the linked PO has been verified */}
        <DashboardCard className="mt-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="sparkles" size={16} color="#7C3AED" />
            <Text className="flex-1 text-sm font-semibold text-ink dark:text-slate-200">
              AI Risk Analysis
            </Text>
            {linkedPo?.aiVerification ? (
              <View className="rounded-full bg-violet-100 px-2 py-0.5 dark:bg-violet-900/30">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                  {linkedPo.aiVerification.aiProvider === 'gemini' ? 'Gemini' : 'Rule Engine'}
                </Text>
              </View>
            ) : (
              <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Pending
                </Text>
              </View>
            )}
          </View>

          {linkedPo?.aiVerification ? (
            // Live AI result from the PO vs Bill comparison
            <AiVerificationCard aiVerification={linkedPo.aiVerification} />
          ) : linkedPo ? (
            // PO exists but AI hasn't run yet (Bill not submitted or still pending)
            <View className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
              <View className="mb-2 flex-row items-center gap-2">
                <Ionicons name="hourglass-outline" size={16} color="#d97706" />
                <Text className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  AI Verification Pending
                </Text>
              </View>
              <Text className="text-xs text-amber-700 dark:text-amber-500">
                Purchase Order {linkedPo.poNumber} has been generated. AI verification will run
                once a Bill is submitted and Accounts triggers the comparison.
              </Text>
              <View className="mt-3 flex-row items-center gap-2 opacity-60">
                {['Quotation', 'PO', 'Bill', 'AI', 'Accounts'].map((stage, i) => (
                  <View key={stage} className="flex-row items-center">
                    <View className={`rounded-full px-2 py-0.5 ${i <= 1 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <Text className={`text-[10px] font-bold ${i <= 1 ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                        {stage}
                      </Text>
                    </View>
                    {i < 4 && <Ionicons name="chevron-forward" size={10} color="#d97706" style={{ marginHorizontal: 1 }} />}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            // No PO yet — quotation is at approval stage, PO comes after
            <View className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <View className="mb-2 flex-row items-center gap-2">
                <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                <Text className="text-sm font-semibold text-ink-muted dark:text-slate-400">
                  AI Verification — Next Stage
                </Text>
              </View>
              <Text className="text-xs text-ink-muted dark:text-slate-500">
                After this quotation is approved and a Purchase Order is generated, Gemini AI
                will compare the PO against the vendor invoice for fraud detection, GST
                validation, and amount verification.
              </Text>
              <View className="mt-3 flex-row items-center gap-1 opacity-50">
                {['Quotation ✓', 'PO', 'Bill', 'AI Analysis', 'Accounts'].map((stage, i) => (
                  <View key={stage} className="flex-row items-center">
                    <View className={`rounded-full px-2 py-0.5 ${i === 0 ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <Text className={`text-[10px] font-bold ${i === 0 ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                        {stage}
                      </Text>
                    </View>
                    {i < 4 && <Ionicons name="chevron-forward" size={10} color="#94a3b8" style={{ marginHorizontal: 1 }} />}
                  </View>
                ))}
              </View>
            </View>
          )}
        </DashboardCard>
      </ScrollView>

      {/* Decision bottom sheet — reused from QuotationDetailsScreen unchanged */}
      <DirectorDecisionSheet
        decision={pendingDecision}
        isSubmitting={isDeciding}
        onConfirm={handleConfirmDecision}
        onClose={() => setPendingDecision(null)}
      />
    </Screen>
  );
}
