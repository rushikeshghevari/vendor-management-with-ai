import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DirectorApprovalHistory } from '@/components/quotations/DirectorApprovalHistory';
import { DirectorApprovalSummary } from '@/components/quotations/DirectorApprovalSummary';
import { DirectorDecisionSheet } from '@/components/quotations/DirectorDecisionSheet';
import { PaymentSummaryCard } from '@/components/payments/PaymentSummaryCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { env } from '@/config/env';
import {
  useDecideQuotationMutation,
  useDeleteQuotationMutation,
  useGetQuotationsQuery,
  useSubmitQuotationMutation,
} from '@/features/quotations/api/quotationsApi';
import { useGetPurchaseOrderByQuotationQuery } from '@/features/purchaseOrders/api/purchaseOrdersApi';
import type { DirectorDecision, QuotationStatus } from '@/features/quotations/types';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { DepartmentUserTabParamList, DirectorTabParamList, PurchaseOrderStackParamList, QuotationsStackParamList } from '@/navigation/types';

// Mirrors the backend's `DECIDABLE_STATUSES` in quotation.service.ts — a Director can weigh
// in any time before the quotation is Billed, even after another Director has already acted.
const DECIDABLE_STATUSES: QuotationStatus[] = ['submitted', 'negotiation', 'resubmitted', 'approved', 'rejected'];

type Props = NativeStackScreenProps<QuotationsStackParamList, 'QuotationDetails'>;

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

export function QuotationDetailsScreen({ navigation, route }: Props) {
  const { quotationId } = route.params;
  const { user, hasRole } = useAuth();
  // Only a Department User may ever edit/submit/delete a quotation or create a Bill from
  // one — the backend already enforces this (authorize(DEPARTMENT_USER) on every mutation
  // route), this just keeps the same actions from dangling in front of a Director.
  const isDepartmentUser = hasRole(ROLES.DEPARTMENT_USER);
  const isDirector = hasRole(ROLES.DIRECTOR);
  const isCeo = hasRole(ROLES.CEO);
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<DirectorDecision | null>(null);

  const { data: quotations, isLoading } = useGetQuotationsQuery();
  const [submitQuotation, { isLoading: isSubmitting }] = useSubmitQuotationMutation();
  const [deleteQuotation] = useDeleteQuotationMutation();
  const [decideQuotation, { isLoading: isDeciding }] = useDecideQuotationMutation();
  // A Bill can only be created once a Purchase Order exists for this Quotation (see
  // billService.create — it now requires one). Checked unconditionally (hook-order rule);
  // the result is only relevant once the quotation is loaded and Approved.
  const { data: linkedPo, isLoading: isLoadingPo } = useGetPurchaseOrderByQuotationQuery(quotationId, {
    skip: !quotationId,
  });

  const quotation = quotations?.find((item) => item.id === quotationId);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Quotation Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!quotation) {
    return (
      <Screen padded={false}>
        <AppHeader title="Quotation Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Quotation not found.</Text>
      </Screen>
    );
  }

  const handleSubmit = async () => {
    try {
      await submitQuotation(quotation.id).unwrap();
    } catch (error) {
      Alert.alert('Could Not Submit Quotation', getErrorMessage(error));
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Quotation', `"${quotation.quotationCode}" will be permanently removed from your drafts.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteQuotation(quotation.id).unwrap();
            navigation.goBack();
          } catch (error) {
            Alert.alert('Could Not Delete Quotation', getErrorMessage(error));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const latestPdf = quotation.pdfFiles[quotation.pdfFiles.length - 1];

  // Defensive default: a quotation object fetched under an older app version (e.g. a
  // Fast-Refresh-preserved RTK Query cache entry) may not carry this field yet.
  const directorApprovals = quotation.directorApprovals ?? [];
  const myApproval = directorApprovals.find((entry) => entry.directorId === user?.id);
  const hasAlreadyDecided = Boolean(myApproval && myApproval.decision !== 'pending');
  // Once a Director has acted the buttons stay available so they can update their own
  // decision (see quotation.service.ts decide() — it upserts, never blocks a second call
  // from the same Director); only another Director's entry is ever off-limits.
  // Which role can actually decide depends on the live amount-vs-CEO-Approval-Limit route
  // (see quotationService.resolveApprovalRoute) — a Director is never authorized on a
  // CEO-routed quotation and vice versa, mirrored here so the buttons never dangle.
  const isCeoRoute = quotation.approvalRoute === 'ceo';
  const canDecide = (isDirector && !isCeoRoute) || (isCeo && isCeoRoute);
  const canDirectorDecide = canDecide && DECIDABLE_STATUSES.includes(quotation.status);

  const handleConfirmDecision = async (remarks?: string) => {
    if (!pendingDecision) return;
    try {
      await decideQuotation({ id: quotation.id, decision: pendingDecision, remarks }).unwrap();
      setPendingDecision(null);
    } catch (error) {
      Alert.alert('Could Not Record Decision', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Quotation Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard>
          <Text className="text-xs font-medium text-ink-muted dark:text-slate-500">Approval Route</Text>
          <Text className="mt-0.5 text-sm font-semibold text-ink dark:text-white">
            {isCeoRoute ? 'CEO Approval Required' : 'Directors Approval Required'}
          </Text>
        </DashboardCard>

        {isDirector || isCeo || isSuperAdmin ? (
          <DashboardCard className="mt-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Director Approval Summary</Text>
            <View className="mt-3">
              <DirectorApprovalSummary approvals={directorApprovals} />
            </View>
          </DashboardCard>
        ) : null}

        {/* CEO/Director never get a Payments tab — this is their only window into Payment
            data, read-only, renders nothing until a Payment actually exists for this quotation. */}
        {isCeo || isDirector ? <PaymentSummaryCard quotationId={quotation.id} /> : null}

        <DashboardCard className="mt-4">
          <View className="flex-row items-start justify-between">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
              <Ionicons name="document-text" size={26} color="#1e88e5" />
            </View>
            <Badge label={STATUS_LABEL[quotation.status]} variant={STATUS_VARIANT[quotation.status]} />
          </View>

          <Text className="mt-3 text-xl font-bold text-ink dark:text-white">{quotation.quotationCode}</Text>
          <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">
            {quotation.vendorName} ({quotation.vendorCode})
          </Text>

          <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <InfoRow icon="business-outline" label="Department" value={quotation.departmentName} />
            <InfoRow icon="calendar-outline" label="Quotation Date" value={formatDate(quotation.quotationDate)} />
            <InfoRow icon="time-outline" label="Required Date" value={formatDate(quotation.requiredDate)} />
            <InfoRow
              icon="cash-outline"
              label="Total Amount"
              value={`${quotation.currency} ${quotation.amount.toLocaleString()} (+${quotation.gst}% GST)`}
            />
            <InfoRow icon="card-outline" label="Payment Terms" value={quotation.paymentTerms} />
            <InfoRow icon="cube-outline" label="Delivery Terms" value={quotation.deliveryTerms} />
            <InfoRow icon="flag-outline" label="Priority" value={quotation.priority} />
            {quotation.description ? <InfoRow icon="document-text-outline" label="Description" value={quotation.description} /> : null}
            {quotation.remarks ? <InfoRow icon="chatbox-outline" label="Remarks" value={quotation.remarks} /> : null}
          </View>

          <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="person-circle-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">By {quotation.createdByName || '—'}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">Created {formatDate(quotation.createdAt)}</Text>
            </View>
          </View>
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Quotation PDF</Text>
          {quotation.pdfFiles.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No PDF uploaded yet.</Text>
          ) : (
            <>
              <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">
                {quotation.pdfFiles.length} version(s) — version history is kept, never overwritten.
              </Text>
              {quotation.pdfFiles.map((pdf) => (
                <Text
                  key={pdf.version}
                  onPress={() => Linking.openURL(`${env.apiUrl.replace('/api/v1', '')}${pdf.url}`)}
                  className="mt-2 text-sm text-primary-600 underline"
                >
                  v{pdf.version} — {pdf.fileName} ({formatDate(pdf.uploadedAt)})
                  {pdf.version === latestPdf?.version ? '  (current)' : ''}
                </Text>
              ))}
            </>
          )}
        </DashboardCard>

        {isDirector || isCeo || isSuperAdmin ? (
          <DashboardCard className="mt-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Director Approval History</Text>
            <View className="mt-3">
              <DirectorApprovalHistory approvals={directorApprovals} />
            </View>
          </DashboardCard>
        ) : null}

        {/* Read-only for the Department User who owns this quotation — they can see who
            reviewed it and what was said, but never act on it (no buttons render here). */}
        {isDepartmentUser ? (
          <DashboardCard className="mt-4">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Director Review</Text>
            <View className="mt-3">
              {directorApprovals.some((entry) => entry.decision !== 'pending') ? (
                <DirectorApprovalHistory approvals={directorApprovals} />
              ) : (
                <Text className="text-sm text-ink-muted dark:text-slate-400">No Director review available yet.</Text>
              )}
            </View>
          </DashboardCard>
        ) : null}

        <DashboardCard className="mt-4">
          <View className="flex-row items-center gap-2">
            <Text style={{ fontSize: 20 }}>🤖</Text>
            <Text className="flex-1 text-sm font-semibold text-ink dark:text-slate-200">AI Insights</Text>
            <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Coming Soon</Text>
            </View>
          </View>
          <Text className="mt-2 text-xs text-ink-muted dark:text-slate-400">
            AI-powered risk analysis, vendor insights, and approval recommendations will appear here.
          </Text>
        </DashboardCard>

        {canDecide && hasAlreadyDecided ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="checkmark-done-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-center text-sm text-ink-muted dark:text-slate-400">
              You have already taken action on this quotation. You may still update your decision below.
            </Text>
          </View>
        ) : null}

        {canDirectorDecide ? (
          <>
            <Button label={hasAlreadyDecided ? 'Update to Approved' : 'Approve'} onPress={() => setPendingDecision('approved')} className="mt-3" />
            <Button
              label={hasAlreadyDecided ? 'Update to Negotiation' : 'Negotiation'}
              variant="secondary"
              onPress={() => setPendingDecision('negotiation')}
              className="mt-3"
            />
            <Button
              label={hasAlreadyDecided ? 'Update to Rejected' : 'Reject'}
              variant="dangerOutline"
              onPress={() => setPendingDecision('rejected')}
              className="mt-3"
            />
          </>
        ) : null}

        {isDepartmentUser && quotation.status === 'draft' ? (
          <>
            <Button label="Edit Quotation" onPress={() => navigation.navigate('EditQuotation', { quotationId: quotation.id })} className="mt-5" />
            <Button label="Submit to Director" variant="secondary" loading={isSubmitting} onPress={handleSubmit} className="mt-3" />
            <Button label="Delete Quotation" variant="dangerOutline" loading={isDeleting} onPress={handleDelete} className="mt-3" />
          </>
        ) : null}

        {isDepartmentUser && quotation.status === 'negotiation' ? (
          <Button label="Edit & Resubmit" onPress={() => navigation.navigate('EditQuotation', { quotationId: quotation.id })} className="mt-5" />
        ) : null}

        {!isDepartmentUser && !isDirector && !isCeo && quotation.status === 'negotiation' ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="hourglass-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-sm text-ink-muted dark:text-slate-400">
              Sent back for changes — awaiting the Department User's resubmission.
            </Text>
          </View>
        ) : null}

        {/* The decider role gets the precise Approve/Negotiation/Reject buttons (or the
            "already acted" message) above instead of this generic line — see `canDecide`. */}
        {!canDecide && (quotation.status === 'submitted' || quotation.status === 'resubmitted') ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="hourglass-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-sm text-ink-muted dark:text-slate-400">
              {isDepartmentUser
                ? `Awaiting ${isCeoRoute ? 'CEO' : 'Director'} review.`
                : `Awaiting a ${isCeoRoute ? 'CEO' : 'Director'} decision.`}
            </Text>
          </View>
        ) : null}

        {isDepartmentUser && quotation.status === 'approved' && !isLoadingPo ? (
          linkedPo ? (
            <Button
              label="Create Bill"
              onPress={() =>
                navigation
                  .getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>()
                  ?.navigate('Bills', { screen: 'CreateBill', params: { quotationId: quotation.id } })
              }
              className="mt-5"
            />
          ) : (
            <View className="mt-5 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
              <View className="flex-row items-center gap-2">
                <Ionicons name="alert-circle-outline" size={18} color="#d97706" />
                <Text className="flex-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Purchase Order required
                </Text>
              </View>
              <Text className="mt-1.5 text-xs text-amber-700 dark:text-amber-500">
                A Purchase Order must be generated for this Quotation before a Bill can be created.
              </Text>
              <Button
                label="Generate Purchase Order"
                onPress={() =>
                  navigation
                    .getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>()
                    ?.navigate('PurchaseOrders', { screen: 'CreatePurchaseOrder', params: { quotationId: quotation.id } })
                }
                className="mt-3"
              />
            </View>
          )
        ) : null}

        {isDirector && (quotation.status === 'approved' || quotation.status === 'billed') && !isLoadingPo && linkedPo ? (
          <View className="mt-5 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <View className="flex-row items-center gap-2">
              <Ionicons name="clipboard-outline" size={18} color="#059669" />
              <Text className="flex-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Purchase Order Generated
              </Text>
            </View>
            <Text className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-500">
              {linkedPo.poNumber} · ₹{linkedPo.grandTotal.toLocaleString()} · {linkedPo.status.replace(/_/g, ' ')}
            </Text>
            <Button
              label="View Purchase Order"
              variant="secondary"
              onPress={() =>
                navigation
                  .getParent<BottomTabNavigationProp<DirectorTabParamList>>()
                  ?.navigate('PurchaseOrders', { screen: 'PurchaseOrderDetails', params: { purchaseOrderId: linkedPo.id } })
              }
              className="mt-3"
            />
          </View>
        ) : null}

        {quotation.status === 'billed' ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="receipt-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-sm text-ink-muted dark:text-slate-400">Bill already created for this quotation.</Text>
          </View>
        ) : null}

        {quotation.status === 'rejected' ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Text className="text-sm text-ink-muted dark:text-slate-400">
              {isDepartmentUser ? 'This quotation was rejected. You can create a fresh quotation if needed.' : 'This quotation was rejected.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <DirectorDecisionSheet
        decision={pendingDecision}
        isSubmitting={isDeciding}
        onConfirm={handleConfirmDecision}
        onClose={() => setPendingDecision(null)}
      />
    </Screen>
  );
}
