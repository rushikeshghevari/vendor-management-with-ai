import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { DirectorReviewDecisionSheet } from '@/components/requirements/DirectorReviewDecisionSheet';
import { env } from '@/config/env';
import { ROLES } from '@/constants/roles';
import {
  useDecideDirectorReviewMutation,
  useGetDirectorReviewQuery,
} from '@/features/directorReview/api/directorReviewApi';
import type { DirectorReviewDecidable } from '@/features/directorReview/types';
import { useSetPreparedQuotationMutation } from '@/features/requirements/api/requirementsApi';
import type { Requirement, RequirementStatus } from '@/features/requirements/types';
import { useGetRequirementQuotationsQuery } from '@/features/quotations/api/quotationsApi';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { RequirementsStackParamList } from '@/navigation/types';

interface RequirementCardProps {
  requirement: Requirement;
  onPress?: (requirement: Requirement) => void;
  /** Land this card already expanded — used when arriving from a notification tap. */
  initiallyExpanded?: boolean;
}

const STATUS_LABEL: Record<RequirementStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  quotation_collection: 'Collecting Quotations',
  quotation_comparison: 'Submitted to Director',
  director_review: 'Director Review',
  approved: 'Approved',
  rejected: 'Rejected',
  vendor_finalized: 'Vendor Finalized',
  closed: 'Closed',
};

const STATUS_VARIANT: Record<RequirementStatus, 'primary' | 'success' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  submitted: 'primary',
  quotation_collection: 'primary',
  quotation_comparison: 'primary',
  director_review: 'primary',
  approved: 'success',
  rejected: 'danger',
  vendor_finalized: 'success',
  closed: 'neutral',
};

export function RequirementCard({ requirement, onPress, initiallyExpanded }: RequirementCardProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RequirementsStackParamList>>();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded ?? false);
  const [pendingDecision, setPendingDecision] = useState<DirectorReviewDecidable | null>(null);
  const [approvingQuotationId, setApprovingQuotationId] = useState<string | null>(null);

  const { user, hasRole } = useAuth();
  const isDirector = hasRole(ROLES.DIRECTOR);
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const isDepartmentUser = hasRole(ROLES.DEPARTMENT_USER);
  const isHod = hasRole(ROLES.HOD);
  const canAct = isDirector || isSuperAdmin;
  // Marking a quotation "Prepared" is the collecting department's own call, not the Director's
  // — purely informational (shown to the Director as a signal, never restricts what they can
  // approve), so it's available to whoever is actually gathering quotations.
  const canMarkPrepared = isDepartmentUser || isHod || isSuperAdmin;
  const isReviewable = requirement.status === 'quotation_comparison' || requirement.status === 'director_review';
  const [setPreparedQuotation, { isLoading: isTogglingPrepared }] = useSetPreparedQuotationMutation();

  // Lazy per-card fetch — `skip` keeps every collapsed card from ever hitting the network;
  // only a card the user actually expands calls getRequirementQuotations, so a page of
  // N cards never fires more than the one already-loaded list request plus, at most, one
  // extra request per manually expanded card.
  const { data: quotations, isFetching } = useGetRequirementQuotationsQuery(requirement.id, {
    skip: !isExpanded,
  });

  // Piggybacks on the same expand-to-fetch trigger as the quotations list above — a Director/
  // Super Admin expanding a card already signals intent to look closer, so this is the one
  // point it's safe to also pull the review package (needed for the dual-approval "already
  // decided" check and the AI-comparison note in the confirm sheet) without an N+1 fetch
  // storm across a mostly-collapsed list. Never fetched for other roles or collapsed cards.
  const { data: reviewData } = useGetDirectorReviewQuery(requirement.id, {
    skip: !isExpanded || !canAct || !isReviewable,
  });
  const [decide, { isLoading: isDeciding }] = useDecideDirectorReviewMutation();

  // Mirrors DirectorReviewScreen.tsx's canDecide exactly: a Director may act only while their
  // own entry in the dual-approval roster is still pending (a Super Admin is unaffected).
  // Uses `reviewData.requirement.status`, not the list's own `requirement.status` — opening
  // the review package auto-advances quotation_comparison -> director_review server-side, so
  // the freshly fetched status is the one that actually governs whether a decision is allowed.
  const myApprovalEntry = isDirector && reviewData ? reviewData.review.approvals.find((entry) => entry.directorId === user?.id) : undefined;
  const canDecide = canAct && !!reviewData && reviewData.requirement.status === 'director_review' && (isSuperAdmin || (isDirector && myApprovalEntry?.decision === 'pending'));

  const closeSheet = () => {
    setPendingDecision(null);
    setApprovingQuotationId(null);
  };

  const handleConfirmDecision = async (remarks?: string) => {
    if (!pendingDecision) return;
    try {
      const selectedQuotationId = pendingDecision === 'approved' ? approvingQuotationId ?? undefined : undefined;
      await decide({ requirementId: requirement.id, input: { decision: pendingDecision, remarks, selectedQuotationId } }).unwrap();
      closeSheet();
    } catch (err) {
      Alert.alert('Could Not Record Decision', getErrorMessage(err));
    }
  };

  const approvingQuotation = approvingQuotationId ? quotations?.find((q) => q.id === approvingQuotationId) : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={requirement.requirementNumber}
      // A Director/Super Admin can act entirely from this card (quotations + Approve/Reject/
      // Send Back below), so tapping the card itself expands it — no separate toggle row needed.
      // Every other role still has no in-card actions, so the card keeps navigating to
      // Requirement Details, and the small toggle row below remains their way to peek at
      // quotations without leaving the list.
      onPress={() => (canAct ? setIsExpanded((prev) => !prev) : onPress?.(requirement))}
      android_ripple={{ color: '#e2e8f0' }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-ink dark:text-white">{requirement.requirementNumber}</Text>
          <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400" numberOfLines={1}>{requirement.title}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Badge label={STATUS_LABEL[requirement.status]} variant={STATUS_VARIANT[requirement.status]} />
          <Ionicons name={canAct ? (isExpanded ? 'chevron-up-outline' : 'chevron-down-outline') : 'chevron-forward'} size={16} color="#94a3b8" />
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-1.5">
        <Ionicons name="cash-outline" size={13} color="#5f5f5f" />
        <Text className="text-sm text-ink-muted dark:text-slate-500">
          Budget ₹{requirement.budget.toLocaleString()}
        </Text>
      </View>

      <View className="mt-1.5 flex-row items-center gap-1.5">
        <Ionicons name="business-outline" size={13} color="#5f5f5f" />
        <Text className="text-sm text-ink-muted dark:text-slate-500" numberOfLines={1}>
          {requirement.departmentName} · {requirement.createdByName}
          {requirement.createdByDepartmentName && requirement.createdByDepartmentName !== requirement.departmentName
            ? ` (from ${requirement.createdByDepartmentName})`
            : ''}
        </Text>
      </View>

      {canAct ? (
        <View className="mt-3 flex-row items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Ionicons name="document-text-outline" size={13} color="#5f5f5f" />
          <Text className="text-sm text-ink-muted dark:text-slate-500">
            {requirement.quotationCount} {requirement.quotationCount === 1 ? 'Quotation' : 'Quotations'}
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Hide quotations' : 'View quotations'}
          onPress={(event) => {
            event.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800"
        >
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="document-text-outline" size={13} color="#5f5f5f" />
            <Text className="text-sm text-ink-muted dark:text-slate-500">
              {requirement.quotationCount} {requirement.quotationCount === 1 ? 'Quotation' : 'Quotations'}
            </Text>
          </View>
          <Ionicons name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={14} color="#5f5f5f" />
        </Pressable>
      )}

      {isExpanded ? (
        <View className="mt-2 gap-2">
          {isFetching ? (
            <ActivityIndicator size="small" color="#1e88e5" />
          ) : quotations && quotations.length > 0 ? (
            quotations.map((quotation) => {
              const latestAttachment = quotation.attachments[quotation.attachments.length - 1];
              const isPrepared = requirement.preparedQuotationId === quotation.id;
              return (
                <View
                  key={quotation.id}
                  className={`rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 ${isPrepared ? 'border-2 border-success-500' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-semibold text-ink dark:text-slate-200" numberOfLines={1}>
                          {quotation.vendorName}
                        </Text>
                        {isPrepared ? (
                          <View className="flex-row items-center gap-0.5 rounded-full bg-success-100 px-1.5 py-0.5 dark:bg-success-900/30">
                            <Ionicons name="star" size={10} color="#16a34a" />
                            <Text className="text-xs font-semibold text-success-700 dark:text-success-400">Prepared</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-500">
                        {quotation.quotationCode} • {quotation.currency} {quotation.amount.toLocaleString()}
                      </Text>
                      <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-500">
                        {new Date(quotation.quotationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    {latestAttachment ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View attachment for ${quotation.quotationCode}`}
                        onPress={(event) => {
                          event.stopPropagation();
                          navigation.navigate('PdfViewer', {
                            url: `${env.apiUrl.replace('/api/v1', '')}${latestAttachment.url}`,
                            title: quotation.quotationCode,
                          });
                        }}
                        className="flex-row items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 dark:bg-primary-900/20"
                      >
                        <Ionicons name="eye-outline" size={13} color="#1e88e5" />
                        <Text className="text-sm font-semibold text-primary-600">View</Text>
                      </Pressable>
                    ) : (
                      <Text className="text-xs text-red-600 dark:text-red-400">No attachment uploaded</Text>
                    )}
                  </View>

                  {canMarkPrepared ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isPrepared ? `Unmark ${quotation.quotationCode} as prepared` : `Mark ${quotation.quotationCode} as prepared`}
                      disabled={isTogglingPrepared}
                      onPress={(event) => {
                        event.stopPropagation();
                        setPreparedQuotation({ requirementId: requirement.id, quotationId: quotation.id, prepared: !isPrepared }).catch(() => null);
                      }}
                      className={`mt-2 flex-row items-center justify-center gap-1 rounded-lg py-1.5 ${
                        isPrepared ? 'bg-success-500 active:bg-success-600' : 'border border-slate-300 bg-white active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      <Ionicons name={isPrepared ? 'star' : 'star-outline'} size={13} color={isPrepared ? '#fff' : '#5f5f5f'} />
                      <Text className={`text-sm font-semibold ${isPrepared ? 'text-white' : 'text-ink-muted dark:text-slate-400'}`}>
                        {isPrepared ? 'Prepared — Tap to Unmark' : 'Mark as Prepared'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {canDecide ? (
                    <View className="mt-2 gap-1.5">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Approve requirement with ${quotation.quotationCode}`}
                        onPress={(event) => {
                          event.stopPropagation();
                          setApprovingQuotationId(quotation.id);
                          setPendingDecision('approved');
                        }}
                        className="flex-row items-center justify-center gap-1 rounded-lg bg-success-500 py-1.5 active:bg-success-600"
                      >
                        <Ionicons name="checkmark-circle" size={13} color="#fff" />
                        <Text className="text-sm font-semibold text-white">Approve</Text>
                      </Pressable>
                      <View className="flex-row gap-1.5">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Send requirement back"
                          onPress={(event) => {
                            event.stopPropagation();
                            setPendingDecision('sent_back');
                          }}
                          className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-amber-500 py-1.5 active:bg-amber-600"
                        >
                          <Ionicons name="arrow-undo" size={13} color="#fff" />
                          <Text className="text-sm font-semibold text-white">Send Back</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Reject requirement"
                          onPress={(event) => {
                            event.stopPropagation();
                            setPendingDecision('rejected');
                          }}
                          className="flex-1 flex-row items-center justify-center gap-1 rounded-lg border-2 border-red-300 bg-red-50 py-1.5 active:bg-red-100 dark:border-red-800 dark:bg-red-950/20"
                        >
                          <Ionicons name="close-circle" size={13} color="#dc2626" />
                          <Text className="text-sm font-semibold text-red-600 dark:text-red-400">Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text className="text-sm text-ink-muted dark:text-slate-500">No quotations uploaded yet.</Text>
          )}

          <View className="mt-1 flex-row gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View full pipeline"
              onPress={(event) => {
                event.stopPropagation();
                navigation.navigate('RequirementPipeline', { requirementId: requirement.id });
              }}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 dark:bg-slate-800"
            >
              <Ionicons name="git-network-outline" size={13} color="#1e88e5" />
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">Full Pipeline</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View AI comparison"
              onPress={(event) => {
                event.stopPropagation();
                navigation.navigate('AiComparison', { requirementId: requirement.id });
              }}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 dark:bg-slate-800"
            >
              <Ionicons name="git-compare-outline" size={13} color="#1e88e5" />
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">AI Comparison</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <DirectorReviewDecisionSheet
        decision={pendingDecision}
        isSubmitting={isDeciding}
        winningQuotationLabel={approvingQuotation ? `${approvingQuotation.quotationCode} — ${approvingQuotation.vendorName}` : undefined}
        aiComparisonAvailable={reviewData ? reviewData.comparison !== null : undefined}
        onConfirm={handleConfirmDecision}
        onClose={closeSheet}
      />
    </Pressable>
  );
}
