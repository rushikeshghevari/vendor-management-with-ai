import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { DirectorReviewDecisionSheet } from '@/components/requirements/DirectorReviewDecisionSheet';
import { DirectorReviewHistory } from '@/components/requirements/DirectorReviewHistory';
import { Loader } from '@/components/ui/Loader';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Screen } from '@/components/ui/Screen';
import { env } from '@/config/env';
import { ROLES } from '@/constants/roles';
import {
  useDecideDirectorReviewMutation,
  useGetDirectorReviewQuery,
  useUpdateDirectorReviewRemarksMutation,
} from '@/features/directorReview/api/directorReviewApi';
import type { DirectorReviewDecidable } from '@/features/directorReview/types';
import type { Quotation } from '@/features/quotations/types';
import { useAuth } from '@/hooks/useAuth';
import type { RequirementsStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/utils/getErrorMessage';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'DirectorReview'>;

const OCR_BADGE: Record<string, { label: string; variant: 'primary' | 'success' | 'danger' | 'neutral' }> = {
  not_started: { label: 'OCR Not Started', variant: 'neutral' },
  processing: { label: 'OCR Processing…', variant: 'primary' },
  completed: { label: 'OCR Complete', variant: 'success' },
  failed: { label: 'OCR Failed', variant: 'danger' },
};

const OBSERVATION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle-outline',
  warning: 'warning-outline',
  critical: 'alert-circle-outline',
};

const OBSERVATION_COLOR: Record<string, string> = {
  info: '#5f5f5f',
  warning: '#d97706',
  critical: '#dc2626',
};

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(value: number | undefined, currency?: string): string {
  if (value === undefined) return '—';
  return `${currency ?? ''} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`.trim();
}

function formatActionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-t border-slate-100 py-2.5 dark:border-slate-800">
      <Text className="text-sm text-ink-muted dark:text-slate-400">{label}</Text>
      <Text className="max-w-[58%] text-right text-sm font-medium text-ink dark:text-slate-200">{value}</Text>
    </View>
  );
}

/** Compact label-over-value pair used inside quotation cards — unlike `DetailRow`, several
 *  of these sit side by side in a wrapping row instead of stacking full-width. */
function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[28%]">
      <Text className="text-[10px] uppercase tracking-wide text-ink-muted dark:text-slate-500">{label}</Text>
      <Text className="mt-0.5 text-xs font-medium text-ink dark:text-slate-200" numberOfLines={1}>{value}</Text>
    </View>
  );
}

/** The true total payable — OCR-extracted grand total when available, else the manually
 *  entered amount plus GST. Mirrors comparisonEngine.buildSnapshot()'s exact fallback on the
 *  backend, so "Lowest/Highest Price" ranking here always agrees with the AI engine's own
 *  numbers when a comparison exists, and degrades to the same math when one doesn't. */
function effectivePrice(quotation: Quotation): number {
  const ocrTotal = quotation.ocr?.structuredData?.grandTotal;
  return ocrTotal ?? quotation.amount + (quotation.amount * quotation.gst) / 100;
}

/** Best-effort day count from a free-text field like "Within 5 Days" or "Net 30" — same
 *  regex approach as the backend's comparisonEngine.parseDeliveryDays, reimplemented here
 *  since this screen must still rank quotations when no AI comparison has been generated. */
function parseDaysFromText(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(day|days|week|weeks|month|months)?/i);
  if (!match || !match[1]) return undefined;
  const value = parseInt(match[1], 10);
  if (!Number.isFinite(value)) return undefined;
  const unit = (match[2] ?? 'day').toLowerCase();
  if (unit.startsWith('week')) return value * 7;
  if (unit.startsWith('month')) return value * 30;
  return value;
}

type ComparisonBadgeColor = 'green' | 'red' | 'blue' | 'purple';
const COMPARISON_BADGE_STYLE: Record<ComparisonBadgeColor, { bg: string; text: string }> = {
  green: { bg: '#16a34a', text: '#ffffff' },
  red: { bg: '#dc2626', text: '#ffffff' },
  blue: { bg: '#2563eb', text: '#ffffff' },
  purple: { bg: '#9333ea', text: '#ffffff' },
};

/** One colored highlight chip on a quotation card — green/lowest, red/highest, blue/fastest
 *  delivery, purple/best payment terms. Deliberately its own small component (not the shared
 *  `Badge`, which only has 4 semantic variants) since these need exact, immediately
 *  recognizable colors regardless of theme. */
function ComparisonBadge({ color, icon, label }: { color: ComparisonBadgeColor; icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const style = COMPARISON_BADGE_STYLE[color];
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: style.bg }}>
      <Ionicons name={icon} size={11} color={style.text} />
      <Text className="text-[11px] font-bold" style={{ color: style.text }}>{label}</Text>
    </View>
  );
}

const APPROVAL_STATUS_BADGE: Record<string, { label: string; variant: 'primary' | 'success' | 'danger' | 'neutral' }> = {
  pending: { label: 'Pending', variant: 'neutral' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  sent_back: { label: 'Sent Back', variant: 'primary' },
};

/** "Overall Status" for the dual-approval panel — distinct from the raw Requirement.status
 *  enum (which never gained a new value for this feature): while still `director_review`,
 *  this distinguishes "nobody has decided yet" from "one Director approved, waiting on the
 *  other" purely from the approvals already on hand, with no extra API call. */
function overallStatusLabel(requirementStatus: string, approvals: { decision: string }[]): string {
  if (requirementStatus === 'approved') return 'Approved';
  if (requirementStatus === 'rejected') return 'Rejected';
  if (requirementStatus === 'quotation_collection') return 'Sent Back for Revision';
  if (requirementStatus === 'director_review') {
    return approvals.some((entry) => entry.decision !== 'pending') ? 'Waiting for Director Approvals' : 'Pending Review';
  }
  return requirementStatus.replace(/_/g, ' ');
}

export function DirectorReviewScreen({ navigation, route }: Props) {
  const { requirementId, readOnly = false } = route.params;
  const { user, hasRole } = useAuth();
  const isDirector = hasRole(ROLES.DIRECTOR);
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const canAct = isDirector || isSuperAdmin;

  const [pendingDecision, setPendingDecision] = useState<DirectorReviewDecidable | null>(null);
  const [remarksDraft, setRemarksDraft] = useState('');
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [expandedOcrIds, setExpandedOcrIds] = useState<Set<string>>(new Set());
  // The Director's own explicit override of the winning quotation, chosen by tapping a
  // quotation card below. Null until they tap one — falls back to whatever the review already
  // has stored (a prior round's pick) and then to the AI/earliest default, so the visual
  // "Selected for Approval" state always matches what Approve would actually finalize even if
  // the Director never touches it.
  const [chosenQuotationId, setChosenQuotationId] = useState<string | null>(null);

  const toggleOcrDetails = (quotationId: string) => {
    setExpandedOcrIds((prev) => {
      const next = new Set(prev);
      if (next.has(quotationId)) next.delete(quotationId);
      else next.add(quotationId);
      return next;
    });
  };

  // pollingInterval — without it, the other Director's decision (or a second Director
  // finishing the dual approval) never appears here until the screen is closed and reopened,
  // since RTK Query cache invalidation from their device never reaches this one.
  const { data, isLoading, error } = useGetDirectorReviewQuery(requirementId, { pollingInterval: 15000 });
  const [decide, { isLoading: isDeciding }] = useDecideDirectorReviewMutation();
  const [updateRemarks, { isLoading: isSavingRemarks }] = useUpdateDirectorReviewRemarksMutation();

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Director Review" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen padded={false}>
        <AppHeader title="Director Review" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="git-compare-outline" size={48} color="#94a3b8" />
          <Text className="mt-3 text-center text-base font-medium text-ink-muted dark:text-slate-400">
            Director Review isn't available yet.
          </Text>
          <Text className="mt-1 text-center text-xs text-ink-muted dark:text-slate-500">{getErrorMessage(error)}</Text>
        </View>
      </Screen>
    );
  }

  const { requirement, comparison, quotations, activityLogs, review } = data;
  // A Director may decide only once per round — a Super Admin's decision is a full-access
  // override, unaffected by where the individual Directors' own entries stand (see
  // directorReviewService.decide). See docs/WORKFLOW_DUAL_DIRECTOR_APPROVAL.md.
  const myApprovalEntry = isDirector ? review.approvals.find((entry) => entry.directorId === user?.id) : undefined;
  const iAlreadyDecided = isDirector && !!myApprovalEntry && myApprovalEntry.decision !== 'pending';
  const canDecide = !readOnly && requirement.status === 'director_review' && (isSuperAdmin || (isDirector && myApprovalEntry?.decision === 'pending'));

  // Pure AI pick — shown only as an informational suggestion inside the AI Comparison
  // Summary card below. It is never used to auto-finalize anything anymore — the Director
  // must explicitly select a quotation (see "Select for Approval" below); there is no
  // AI/earliest-quotation default (matches directorReview.validation.ts's mandatory
  // `selectedQuotationId` on Approve and vendorRegistrationService.resolveWinningQuotation()).
  const aiRecommendedQuotationId = comparison?.recommendation.quotationId;
  const aiRecommendedQuotation = aiRecommendedQuotationId ? quotations.find((q) => q.id === aiRecommendedQuotationId) : undefined;

  // What Approve will actually finalize: only the Director's own explicit tap (this session),
  // or whatever the review already has stored (reopening a review that was previously
  // decided-and-selected). Undefined until the Director picks one — Approve is disabled below
  // until then.
  const effectiveQuotationId = chosenQuotationId ?? review.selectedQuotationId;
  const effectiveQuotation = effectiveQuotationId ? quotations.find((q) => q.id === effectiveQuotationId) : undefined;

  // Price/delivery/payment-terms ranking across every quotation — computed here (not just
  // read off `comparison`) so the highlight badges below work identically whether or not an
  // AI comparison has been generated yet.
  const pricedQuotations = quotations.map((quotation) => ({ quotation, price: effectivePrice(quotation) }));
  const lowestPriceEntry = pricedQuotations.length > 0 ? pricedQuotations.reduce((min, cur) => (cur.price < min.price ? cur : min)) : undefined;
  const highestPriceEntry = pricedQuotations.length > 0 ? pricedQuotations.reduce((max, cur) => (cur.price > max.price ? cur : max)) : undefined;
  const showHighestBadge = !!highestPriceEntry && !!lowestPriceEntry && highestPriceEntry.quotation.id !== lowestPriceEntry.quotation.id;
  const priceDifference = lowestPriceEntry && highestPriceEntry ? highestPriceEntry.price - lowestPriceEntry.price : undefined;

  const deliveryEntries = quotations
    .map((quotation) => ({ quotation, days: parseDaysFromText(quotation.deliveryTerms) }))
    .filter((entry): entry is { quotation: Quotation; days: number } => entry.days !== undefined);
  const fastestDeliveryId = deliveryEntries.length > 0 ? deliveryEntries.reduce((min, cur) => (cur.days < min.days ? cur : min)).quotation.id : undefined;

  // "Best" payment terms means longest net period for the buyer (more time before paying) —
  // a judgment call in the absence of an explicit rule, matching standard procurement
  // practice (Net 60 is better for the buyer's cash flow than Net 15).
  const paymentEntries = quotations
    .map((quotation) => ({ quotation, days: parseDaysFromText(quotation.paymentTerms) }))
    .filter((entry): entry is { quotation: Quotation; days: number } => entry.days !== undefined);
  const bestPaymentTermsId = paymentEntries.length > 0 ? paymentEntries.reduce((max, cur) => (cur.days > max.days ? cur : max)).quotation.id : undefined;

  const handleConfirmDecision = async (remarks?: string) => {
    if (!pendingDecision) return;
    try {
      // Only sent when the Director actually tapped "Select for Approval" on a quotation other
      // than the AI/earliest default — omitting it otherwise keeps the backend's existing
      // AI-recommendation-then-earliest fallback exactly as it was before this feature.
      const selectedQuotationId = pendingDecision === 'approved' ? chosenQuotationId ?? undefined : undefined;
      await decide({ requirementId, input: { decision: pendingDecision, remarks, selectedQuotationId } }).unwrap();
      setPendingDecision(null);
      setChosenQuotationId(null);
    } catch (err) {
      Alert.alert('Could Not Record Decision', getErrorMessage(err));
    }
  };

  const handleSaveRemarks = async () => {
    if (remarksDraft.trim().length === 0) return;
    try {
      await updateRemarks({ requirementId, remarks: remarksDraft.trim() }).unwrap();
      setIsEditingRemarks(false);
      setRemarksDraft('');
    } catch (err) {
      Alert.alert('Could Not Save Remarks', getErrorMessage(err));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Director Review" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} rightSlot={<NotificationBell />} />

      {/* ── Fixed top section ── */}
      <View className="bg-surface-muted px-4 pt-4 pb-3 dark:bg-surface-dark">
        <View className="overflow-hidden rounded-2xl bg-primary-600 px-5 pt-5 pb-4 shadow-lg" style={{ elevation: 4 }}>
          <View className="flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-widest text-white/60">{requirement.requirementNumber}</Text>
              <Text className="mt-1 text-xl font-bold text-white" numberOfLines={2}>{requirement.title}</Text>
              <Text className="mt-1 text-sm text-white/70">
                Budget: ₹{requirement.budget.toLocaleString()}
              </Text>
            </View>
            <Badge label={requirement.status.replace(/_/g, ' ')} variant={requirement.status === 'approved' ? 'success' : requirement.status === 'rejected' ? 'danger' : 'primary'} />
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <View className="self-start rounded-full bg-white/15 px-3 py-1">
              <Text className="text-xs font-semibold text-white">🏢 {requirement.departmentName}</Text>
            </View>
            <View className="self-start rounded-full bg-white/15 px-3 py-1">
              <Text className="text-xs font-semibold text-white">👤 {requirement.createdByName}</Text>
            </View>
          </View>
        </View>

        {canDecide ? (
          <>
            {effectiveQuotation ? (
              <View className="mt-3 flex-row items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 dark:bg-amber-950/30">
                <Ionicons name="star" size={16} color="#d97706" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs leading-5 text-amber-800 dark:text-amber-300">
                  {`Approving this Requirement will finalize ${effectiveQuotation.quotationCode} (${effectiveQuotation.vendorName}) as the winning quotation. Tap a different quotation below to change it.`}
                </Text>
              </View>
            ) : (
              <View className="mt-3 flex-row items-start gap-2 rounded-xl bg-slate-100 px-3.5 py-3 dark:bg-slate-800">
                <Ionicons name="information-circle-outline" size={16} color="#94a3b8" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs leading-5 text-ink-muted dark:text-slate-400">
                  Select a quotation below — a Director must explicitly choose the winning quotation before this Requirement can be approved.
                </Text>
              </View>
            )}
            <View className="mt-2.5 flex-row gap-2.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Approve requirement"
                disabled={!effectiveQuotationId}
                className={`flex-1 flex-row items-center justify-center rounded-xl py-4 ${effectiveQuotationId ? 'bg-success-500 active:bg-success-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                onPress={() => setPendingDecision('approved')}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text className="ml-2 text-base font-bold text-white">Approve</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send requirement back"
                className="flex-1 flex-row items-center justify-center rounded-xl bg-amber-500 py-4 active:bg-amber-600"
                onPress={() => setPendingDecision('sent_back')}
              >
                <Ionicons name="arrow-undo" size={20} color="#fff" />
                <Text className="ml-2 text-base font-bold text-white">Send Back</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reject requirement"
              className="mt-2 flex-row items-center justify-center rounded-xl border-2 border-red-300 bg-red-50 py-3.5 active:bg-red-100 dark:border-red-800 dark:bg-red-950/20"
              onPress={() => setPendingDecision('rejected')}
            >
              <Ionicons name="close-circle" size={20} color="#dc2626" />
              <Text className="ml-2 text-base font-bold text-red-600 dark:text-red-400">Reject</Text>
            </Pressable>
          </>
        ) : (
          <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
            <Ionicons name="information-circle-outline" size={22} color="#94a3b8" />
            <Text className="flex-1 text-sm text-ink-muted dark:text-slate-400">
              {iAlreadyDecided && requirement.status === 'director_review'
                ? `You already submitted your decision (${APPROVAL_STATUS_BADGE[myApprovalEntry!.decision]?.label ?? myApprovalEntry!.decision}). Waiting for the other Director to review.`
                : canAct
                  ? `No action available — current status is "${requirement.status.replace(/_/g, ' ')}".`
                  : 'Read only — only a Director or Super Admin can approve, reject, or send this requirement back.'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Scrollable detail section ── */}
      <ScrollView className="flex-1 bg-surface-muted dark:bg-surface-dark" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Requirement Details</Text>
          <DetailRow label="Department" value={requirement.departmentName} />
          <DetailRow label="Requested By" value={requirement.createdByName} />
          <DetailRow label="Priority" value={requirement.priority} />
          <DetailRow label="Required Date" value={formatDate(requirement.requiredDate)} />
          <DetailRow label="Budget" value={formatCurrency(requirement.budget)} />
          {requirement.description ? <DetailRow label="Description" value={requirement.description} /> : null}
          {requirement.remarks ? <DetailRow label="Remarks" value={requirement.remarks} /> : null}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Director Approvals</Text>
            <Badge
              label={overallStatusLabel(requirement.status, review.approvals)}
              variant={
                requirement.status === 'approved' ? 'success'
                : requirement.status === 'rejected' ? 'danger'
                : review.approvals.some((entry) => entry.decision !== 'pending') ? 'primary'
                : 'neutral'
              }
            />
          </View>

          {review.approvals.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No Directors are currently active to review this requirement.</Text>
          ) : (
            review.approvals.map((entry, index) => {
              const badge = APPROVAL_STATUS_BADGE[entry.decision] ?? APPROVAL_STATUS_BADGE.pending!;
              const isMe = isDirector && entry.directorId === user?.id;
              const isRedacted = entry.decision !== 'pending' && !entry.remarks && !isMe && myApprovalEntry?.decision === 'pending';
              return (
                <View key={entry.directorId} className={`mt-3 pt-3 ${index > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-ink dark:text-white">
                      Director {index + 1} — {entry.directorName}{isMe ? ' (You)' : ''}
                    </Text>
                    <Badge label={badge.label} variant={badge.variant} />
                  </View>
                  {entry.remarks ? (
                    <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">"{entry.remarks}"</Text>
                  ) : isRedacted ? (
                    <Text className="mt-1 text-xs italic text-ink-muted dark:text-slate-500">Remarks hidden until you submit your own decision.</Text>
                  ) : null}
                </View>
              );
            })
          )}

          {myApprovalEntry ? (
            <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <Text className="text-sm text-ink-muted dark:text-slate-400">Your Decision</Text>
              <Badge
                label={(APPROVAL_STATUS_BADGE[myApprovalEntry.decision] ?? APPROVAL_STATUS_BADGE.pending!).label}
                variant={(APPROVAL_STATUS_BADGE[myApprovalEntry.decision] ?? APPROVAL_STATUS_BADGE.pending!).variant}
              />
            </View>
          ) : null}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Requirement Items ({requirement.items.length})</Text>
          {requirement.items.map((item, index) => (
            <View key={`${item.itemName}-${index}`} className={`mt-3 pt-3 ${index > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-sm font-medium text-ink dark:text-white">{item.itemName}</Text>
                <Text className="text-sm text-ink-muted dark:text-slate-400">{item.quantity} {item.unit}</Text>
              </View>
              <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">
                Rate ₹{item.estimatedRate.toLocaleString()} · Est. ₹{item.estimatedAmount.toLocaleString()}
              </Text>
            </View>
          ))}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Quotation Summary</Text>
          <View className="mt-3 flex-row flex-wrap gap-3">
            <View className="min-w-[28%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <Text className="text-[11px] text-ink-muted dark:text-slate-500">Total Quotations</Text>
              <Text className="mt-1 text-xl font-extrabold text-ink dark:text-white">{quotations.length}</Text>
            </View>
            <View className="min-w-[28%] flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
              <View className="flex-row items-center gap-1">
                <Ionicons name="trending-down" size={12} color="#16a34a" />
                <Text className="text-[11px] font-semibold text-green-700 dark:text-green-400">Lowest Price</Text>
              </View>
              <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400" numberOfLines={1}>
                {lowestPriceEntry ? (lowestPriceEntry.quotation.temporaryVendor?.name ?? lowestPriceEntry.quotation.vendorName) : '—'}
              </Text>
              <Text className="text-base font-extrabold text-ink dark:text-white">
                {lowestPriceEntry ? formatCurrency(lowestPriceEntry.price, lowestPriceEntry.quotation.currency) : '—'}
              </Text>
            </View>
            <View className="min-w-[28%] flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}>
              <View className="flex-row items-center gap-1">
                <Ionicons name="trending-up" size={12} color="#dc2626" />
                <Text className="text-[11px] font-semibold text-red-700 dark:text-red-400">Highest Price</Text>
              </View>
              <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400" numberOfLines={1}>
                {highestPriceEntry ? (highestPriceEntry.quotation.temporaryVendor?.name ?? highestPriceEntry.quotation.vendorName) : '—'}
              </Text>
              <Text className="text-base font-extrabold text-ink dark:text-white">
                {highestPriceEntry ? formatCurrency(highestPriceEntry.price, highestPriceEntry.quotation.currency) : '—'}
              </Text>
            </View>
            <View className="min-w-[28%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <Text className="text-[11px] text-ink-muted dark:text-slate-500">Price Difference</Text>
              <Text className="mt-1 text-base font-extrabold text-ink dark:text-white">
                {priceDifference !== undefined ? formatCurrency(priceDifference, lowestPriceEntry?.quotation.currency) : '—'}
              </Text>
            </View>
          </View>
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Quotations & OCR ({quotations.length})</Text>
          {quotations.map((quotation) => {
            const latestAttachment = quotation.attachments[quotation.attachments.length - 1];
            const ocrBadge = OCR_BADGE[quotation.ocr?.status ?? 'not_started'] ?? OCR_BADGE.not_started!;
            const structured = quotation.ocr?.structuredData;
            const isOcrExpanded = expandedOcrIds.has(quotation.id);
            const price = effectivePrice(quotation);
            const isSelected = quotation.id === effectiveQuotationId;
            const isLowest = lowestPriceEntry?.quotation.id === quotation.id;
            const isHighest = showHighestBadge && highestPriceEntry?.quotation.id === quotation.id;
            const deliveryDays = parseDaysFromText(quotation.deliveryTerms);
            const isFastestDelivery = fastestDeliveryId === quotation.id;
            const isBestPayment = bestPaymentTermsId === quotation.id;
            const uploadedBy = quotation.submittedByName ?? quotation.createdByName;

            return (
              <View
                key={quotation.id}
                className={`mt-3 overflow-hidden rounded-2xl border-2 ${isSelected ? 'border-amber-400 dark:border-amber-500' : 'border-slate-100 dark:border-slate-800'}`}
              >
                {isSelected ? (
                  <View className="flex-row items-center justify-center gap-1.5 py-1.5" style={{ backgroundColor: '#d4af37' }}>
                    <Ionicons name="star" size={13} color="#1f2937" />
                    <Text className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900">Selected for Approval</Text>
                  </View>
                ) : null}

                <View className="p-3.5">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-ink dark:text-white" numberOfLines={1}>
                        {quotation.temporaryVendor?.name ?? quotation.vendorName}
                        {quotation.temporaryVendor ? ' (Temporary)' : ''}
                      </Text>
                      <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">Quotation #{quotation.quotationCode}</Text>
                    </View>
                    <Badge label={ocrBadge.label} variant={ocrBadge.variant} />
                  </View>

                  <Text className="mt-2 text-3xl font-extrabold text-ink dark:text-white">{formatCurrency(price, quotation.currency)}</Text>

                  {isLowest || isHighest || isFastestDelivery || isBestPayment ? (
                    <View className="mt-2 flex-row flex-wrap gap-1.5">
                      {isLowest ? <ComparisonBadge color="green" icon="trending-down" label="Lowest Price" /> : null}
                      {isHighest ? <ComparisonBadge color="red" icon="trending-up" label="Highest Price" /> : null}
                      {isFastestDelivery && deliveryDays !== undefined ? (
                        <ComparisonBadge color="blue" icon="rocket-outline" label={`Fastest · ${deliveryDays}d`} />
                      ) : null}
                      {isBestPayment ? <ComparisonBadge color="purple" icon="wallet-outline" label={`Best Terms · ${quotation.paymentTerms}`} /> : null}
                    </View>
                  ) : null}

                  <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <DetailChip label="GST" value={`${quotation.gst}%`} />
                    <DetailChip label="Discount" value={structured?.discount !== undefined ? formatCurrency(structured.discount, structured.currency ?? quotation.currency) : '—'} />
                    <DetailChip label="Delivery Time" value={quotation.deliveryTerms || '—'} />
                    <DetailChip label="Payment Terms" value={quotation.paymentTerms || '—'} />
                    <DetailChip label="Quotation Date" value={formatDate(quotation.quotationDate)} />
                    <DetailChip label="Uploaded By" value={uploadedBy || '—'} />
                  </View>

                  {quotation.remarks ? (
                    <View className="mt-2.5 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
                      <Text className="text-[10px] uppercase tracking-wide text-ink-muted dark:text-slate-500">Remarks</Text>
                      <Text className="mt-0.5 text-xs text-ink dark:text-slate-300">{quotation.remarks}</Text>
                    </View>
                  ) : null}

                  {latestAttachment ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Download quotation attachment"
                      className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary-50 py-2.5 dark:bg-primary-900/20"
                      onPress={() => Linking.openURL(`${env.apiUrl.replace('/api/v1', '')}${latestAttachment.url}`)}
                    >
                      <Ionicons name="download-outline" size={15} color="#1e88e5" />
                      <Text className="text-sm font-semibold text-primary-600">Download Attachment</Text>
                    </Pressable>
                  ) : (
                    <Text className="mt-3 text-xs text-red-600 dark:text-red-400">No attachment uploaded</Text>
                  )}

                  {quotation.ocr ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View OCR details"
                      className="mt-2.5 flex-row items-center gap-1.5"
                      onPress={() => toggleOcrDetails(quotation.id)}
                    >
                      <Ionicons name={isOcrExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={14} color="#5f5f5f" />
                      <Text className="text-xs font-semibold text-ink-muted dark:text-slate-400">
                        {isOcrExpanded ? 'Hide OCR Details' : 'View OCR Details'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {canDecide && !isSelected ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${quotation.quotationCode} as the winning quotation`}
                      className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl border border-amber-300 py-2.5 dark:border-amber-700"
                      onPress={() => setChosenQuotationId(quotation.id)}
                    >
                      <Ionicons name="star-outline" size={15} color="#b45309" />
                      <Text className="text-sm font-semibold text-amber-700 dark:text-amber-400">Select for Approval</Text>
                    </Pressable>
                  ) : null}

                  {isOcrExpanded ? (
                    <View className="mt-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <DetailChip label="OCR Status" value={ocrBadge.label} />
                      <DetailChip label="OCR Confidence" value={quotation.ocr?.confidence !== undefined ? `${quotation.ocr.confidence}%` : '—'} />
                      {quotation.ocr?.status === 'failed' ? (
                        <Text className="mt-1.5 text-xs text-red-600 dark:text-red-400">{quotation.ocr.error ?? 'OCR could not process this attachment.'}</Text>
                      ) : structured ? (
                        <>
                          <View className="mt-1.5 flex-row flex-wrap gap-x-4 gap-y-1.5">
                            <DetailChip label="OCR Vendor Name" value={structured.vendorName ?? '—'} />
                            <DetailChip label="OCR Quotation No." value={structured.quotationNumber ?? '—'} />
                            <DetailChip label="OCR Subtotal" value={formatCurrency(structured.subtotal, structured.currency)} />
                            <DetailChip label="OCR Grand Total" value={formatCurrency(structured.grandTotal, structured.currency)} />
                          </View>
                          {structured.items.length > 0 ? (
                            <View className="mt-2">
                              {structured.items.map((item, index) => (
                                <View key={`${item.description}-${index}`} className={`flex-row items-center justify-between py-1 ${index > 0 ? 'border-t border-slate-200 dark:border-slate-700' : ''}`}>
                                  <Text className="flex-1 text-xs text-ink dark:text-slate-300" numberOfLines={1}>{item.description}</Text>
                                  <Text className="text-xs text-ink-muted dark:text-slate-500">{item.quantity ?? '—'} {item.unit ?? ''} · {formatCurrency(item.amount, structured.currency)}</Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <Text className="mt-1.5 text-xs text-ink-muted dark:text-slate-500">OCR has not extracted structured data for this attachment yet.</Text>
                      )}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </DashboardCard>

        <DashboardCard className="mt-4 border border-primary-100 dark:border-primary-900/40">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles-outline" size={18} color="#1e88e5" />
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">AI Comparison Summary</Text>
            </View>
            <Button
              label="View Full Comparison"
              variant="secondary"
              onPress={() => navigation.navigate('AiComparison', { requirementId })}
            />
          </View>

          {comparison ? (
            <>
              <View className="mt-3 flex-row flex-wrap gap-3">
                <View className="min-w-[30%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <Text className="text-[11px] text-ink-muted dark:text-slate-500">Lowest Price</Text>
                  <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">{formatCurrency(comparison.statistics.lowestPrice)}</Text>
                </View>
                <View className="min-w-[30%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <Text className="text-[11px] text-ink-muted dark:text-slate-500">Highest Price</Text>
                  <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">{formatCurrency(comparison.statistics.highestPrice)}</Text>
                </View>
                <View className="min-w-[30%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <Text className="text-[11px] text-ink-muted dark:text-slate-500">Average Price</Text>
                  <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">{formatCurrency(comparison.statistics.averagePrice)}</Text>
                </View>
                <View className="min-w-[30%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <Text className="text-[11px] text-ink-muted dark:text-slate-500">Budget Variance</Text>
                  <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">
                    {comparison.statistics.budgetVariancePercent !== undefined
                      ? `${comparison.statistics.budgetVariancePercent > 0 ? '+' : ''}${comparison.statistics.budgetVariancePercent.toFixed(1)}%`
                      : '—'}
                  </Text>
                </View>
                <View className="min-w-[30%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <Text className="text-[11px] text-ink-muted dark:text-slate-500">Total Quotations</Text>
                  <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">{comparison.statistics.totalQuotations}</Text>
                </View>
              </View>

              <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="star" size={14} color="#d97706" />
                  <Text className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">AI Recommendation · Winning Quotation</Text>
                </View>
                {comparison.recommendation.quotationCode ? (
                  <Text className="mt-1.5 text-sm font-semibold text-ink dark:text-white">
                    {comparison.recommendation.quotationCode}
                    {aiRecommendedQuotation ? ` — ${aiRecommendedQuotation.vendorName}` : ''}
                  </Text>
                ) : null}
                <Text className="mt-1 text-sm text-ink-muted dark:text-slate-400">AI Reasoning: {comparison.recommendation.reason}</Text>
              </View>

              {comparison.observations.length > 0 ? (
                <View className="mt-3">
                  <Text className="text-xs font-semibold text-ink-muted dark:text-slate-500">AI Observations ({comparison.observations.length})</Text>
                  {comparison.observations.map((observation, index) => (
                    <View key={`${observation.type}-${index}`} className="mt-2 flex-row items-start gap-2">
                      <Ionicons name={OBSERVATION_ICON[observation.severity] ?? 'ellipse-outline'} size={14} color={OBSERVATION_COLOR[observation.severity] ?? '#5f5f5f'} style={{ marginTop: 1 }} />
                      <Text className="flex-1 text-xs text-ink dark:text-slate-300">{observation.message}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View className="mt-3 flex-row items-start gap-2 rounded-xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <Ionicons name="information-circle-outline" size={20} color="#94a3b8" style={{ marginTop: 1 }} />
              <Text className="flex-1 text-sm text-ink-muted dark:text-slate-400">
                AI Comparison is currently unavailable. Please review the quotations manually.
              </Text>
            </View>
          )}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Review History & Remarks</Text>
            {canAct && requirement.status === 'director_review' && !isEditingRemarks ? (
              <Button label="Add Remarks" variant="secondary" onPress={() => setIsEditingRemarks(true)} />
            ) : null}
          </View>

          {isEditingRemarks ? (
            <View className="mt-3">
              <TextInput
                value={remarksDraft}
                onChangeText={setRemarksDraft}
                placeholder="Add a remark without deciding yet..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                className="h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <View className="mt-2 flex-row gap-2">
                <Button label="Save" loading={isSavingRemarks} onPress={handleSaveRemarks} className="flex-1" />
                <Button label="Cancel" variant="ghost" onPress={() => { setIsEditingRemarks(false); setRemarksDraft(''); }} className="flex-1" />
              </View>
            </View>
          ) : null}

          <View className="mt-3">
            <DirectorReviewHistory history={review.history} />
          </View>
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Activity Logs</Text>
          {activityLogs.length === 0 ? (
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">No activity recorded yet.</Text>
          ) : (
            activityLogs.map((log, index) => (
              <View key={log.id} className={`mt-2 pt-2 ${index > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
                <Text className="text-sm text-ink dark:text-slate-200">{formatActionLabel(log.action)}</Text>
                <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-500">
                  {log.performedByName} ({log.performedByRole.replace(/_/g, ' ')}) · {formatDate(log.createdAt)}
                </Text>
              </View>
            ))
          )}
        </DashboardCard>
      </ScrollView>

      <DirectorReviewDecisionSheet
        decision={pendingDecision}
        isSubmitting={isDeciding}
        winningQuotationLabel={effectiveQuotation ? `${effectiveQuotation.quotationCode} — ${effectiveQuotation.temporaryVendor?.name ?? effectiveQuotation.vendorName}` : undefined}
        aiComparisonAvailable={comparison !== null}
        onConfirm={handleConfirmDecision}
        onClose={() => setPendingDecision(null)}
      />
    </Screen>
  );
}
