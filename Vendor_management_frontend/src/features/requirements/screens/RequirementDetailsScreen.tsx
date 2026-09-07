import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { QuotationSearch } from '@/components/quotations/QuotationSearch';
import { ROLES } from '@/constants/roles';
import { env } from '@/config/env';
import { useGetDirectorReviewQuery } from '@/features/directorReview/api/directorReviewApi';
import { useGetPurchaseOrderByRequirementQuery } from '@/features/purchaseOrders/api/purchaseOrdersApi';
import { useGetRequirementQuotationsQuery } from '@/features/quotations/api/quotationsApi';
import type { Quotation, QuotationStatus } from '@/features/quotations/types';
import {
  useDeleteRequirementMutation,
  useGetRequirementByIdQuery,
  useSubmitRequirementMutation,
  useSubmitRequirementToDirectorMutation,
} from '@/features/requirements/api/requirementsApi';
import type { RequirementStatus } from '@/features/requirements/types';
import { useGetVendorRegistrationStatusQuery, useLinkExistingVendorMutation } from '@/features/vendorRegistration/api/vendorRegistrationApi';
import {
  useGenerateVendorRegistrationLinkMutation,
  useGetVendorRegistrationLinkStatusQuery,
} from '@/features/vendorRegistrationLink/api/vendorRegistrationLinkApi';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { RequirementsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'RequirementDetails'>;

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

// The six checkpoints a requirement actually passes through on its main path. `quotation_comparison`
// (set once the Department User presses "Submit to Director" — see docs/WORKFLOW_ENHANCEMENT_
// DIRECTOR_SUBMISSION.md) folds into the same position as `quotation_collection`, since both are
// still "with the Department User, not yet opened by a Director"; `closed` (never set by any
// backend code today) folds into `vendor_finalized` — neither gets its own timeline node.
const TIMELINE_STEPS: { status: RequirementStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'submitted', label: 'Submitted' },
  { status: 'quotation_collection', label: 'Quotations' },
  { status: 'director_review', label: 'Director Review' },
  { status: 'approved', label: 'Approved' },
  { status: 'vendor_finalized', label: 'Vendor Finalized' },
];

function timelineStepIndex(status: RequirementStatus): number {
  switch (status) {
    case 'draft': return 0;
    case 'submitted': return 1;
    case 'quotation_collection':
    case 'quotation_comparison': return 2;
    case 'director_review': return 3;
    case 'approved':
    case 'rejected': return 4;
    case 'vendor_finalized':
    case 'closed': return 5;
    default: return 0;
  }
}

const QUOTATION_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

type QuotationStatusTab = (typeof QUOTATION_STATUS_OPTIONS)[number]['value'];
type SortMode = 'latest' | 'lowest' | 'highest';

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const OCR_BADGE: Record<string, { label: string; variant: 'primary' | 'success' | 'danger' | 'neutral' }> = {
  not_started: { label: 'OCR Not Started', variant: 'neutral' },
  processing: { label: 'OCR Processing…', variant: 'primary' },
  completed: { label: 'OCR Complete', variant: 'success' },
  failed: { label: 'OCR Failed', variant: 'danger' },
};

function OcrStatusBadge({ status }: { status?: string }) {
  const badge = OCR_BADGE[status ?? 'not_started'] ?? OCR_BADGE.not_started!;
  return <Badge label={badge.label} variant={badge.variant} />;
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="mt-2.5 flex-row items-start gap-2">
      <Ionicons name={icon} size={14} color="#5f5f5f" style={{ marginTop: 1 }} />
      <View className="flex-1">
        <Text className="text-xs text-ink-muted dark:text-slate-500">{label}</Text>
        <Text className="text-base text-ink dark:text-slate-200">{value}</Text>
      </View>
    </View>
  );
}

export function RequirementDetailsScreen({ navigation, route }: Props) {
  const { requirementId } = route.params;
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const isHod = hasRole(ROLES.HOD);
  const isDirector = hasRole(ROLES.DIRECTOR);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quotationStatus, setQuotationStatus] = useState<QuotationStatusTab>('all');
  const [sortMode, setSortMode] = useState<SortMode>('latest');

  // Looked up by its own id (not scanned out of the capped-at-100 list query) so an older
  // requirement never silently vanishes from its own details screen once an org/department
  // has more than 100 requirements.
  const { data: requirement, isLoading } = useGetRequirementByIdQuery(requirementId);
  const { data: quotations = [], isLoading: isLoadingQuotations } = useGetRequirementQuotationsQuery(requirementId);
  const [submitRequirement, { isLoading: isSubmitting }] = useSubmitRequirementMutation();
  const [submitToDirector, { isLoading: isSubmittingToDirector }] = useSubmitRequirementToDirectorMutation();
  const [deleteRequirement] = useDeleteRequirementMutation();

  // Which quotation the Director actually picked — relevant from `director_review` onward
  // (a Director may have already selected one before the other Director's own decision
  // resolves the requirement), used to show "Approved Quotation" and to anchor Generate PO /
  // Generate Vendor Link to the specific quotation that was decided on, not just any of them.
  const { data: reviewPackage } = useGetDirectorReviewQuery(requirementId, {
    skip: !requirement || !['director_review', 'approved', 'vendor_finalized'].includes(requirement.status),
    pollingInterval: 15000,
  });
  const approvedQuotation = quotations.find((q) => q.id === reviewPackage?.review.selectedQuotationId);

  // Phase 7 — only relevant once a vendor has been registered; skipped otherwise so this
  // never fires a request for a requirement that could never have a Purchase Order yet.
  const { data: linkedPurchaseOrder } = useGetPurchaseOrderByRequirementQuery(requirementId, {
    skip: requirement?.status !== 'vendor_finalized',
  });

  // Vendor Public Self-Registration Link — only relevant once Approved and only for the
  // roles that can generate/verify one (Department User own / HOD department / Super Admin);
  // read-only viewers simply never see this card render its action.
  const { data: registrationLink } = useGetVendorRegistrationLinkStatusQuery(requirementId, {
    skip: requirement?.status !== 'approved',
    // The vendor submits through the public, unauthenticated link — no in-app mutation ever
    // fires to invalidate this tag, so without a forced refetch on every mount this card would
    // show stale "pending" forever once cached, even after the vendor has actually submitted.
    refetchOnMountOrArgChange: true,
  });
  const [generateLink, { isLoading: isGeneratingLink }] = useGenerateVendorRegistrationLinkMutation();

  // Checked the moment a requirement becomes Approved — tells us whether the Director-picked
  // winning quotation's vendor is already sitting in the Vendor list (by a direct vendor
  // reference, or by matching email/phone). While this is loading/undefined the Register/Link
  // cards below still render as before, so there's no flicker; once it resolves `true` they're
  // replaced by the "Vendor Already Registered" card instead.
  const { data: vendorStatus } = useGetVendorRegistrationStatusQuery(requirementId, {
    skip: requirement?.status !== 'approved',
  });
  const [linkExistingVendor, { isLoading: isLinkingVendor }] = useLinkExistingVendorMutation();

  // Hoisted above the isLoading/!requirement early returns below — neither depends on
  // `requirement`, and a hook must never be called conditionally (Rules of Hooks): the first
  // render (isLoading true) returned before these two useMemo calls used to run, while a later
  // render (requirement loaded) reached them, so the hook count differed between renders and
  // React threw "Rendered more hooks than during the previous render."
  const filteredQuotations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const nextItems = quotations.filter((item) => {
      const matchesStatus = quotationStatus === 'all' || item.status === quotationStatus;
      const matchesQuery =
        normalizedQuery.length === 0
        || item.quotationCode.toLowerCase().includes(normalizedQuery)
        || item.vendorName.toLowerCase().includes(normalizedQuery)
        || (item.temporaryVendor?.contactPerson ?? '').toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });

    return [...nextItems].sort((a, b) => {
      if (sortMode === 'lowest') return a.amount - b.amount;
      if (sortMode === 'highest') return b.amount - a.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [quotations, quotationStatus, searchQuery, sortMode]);

  const quotationStats = useMemo(() => {
    if (quotations.length === 0) return { lowest: 0, highest: 0, average: 0 };
    const amounts = quotations.map((item) => item.amount);
    const total = amounts.reduce((sum, value) => sum + value, 0);
    return {
      lowest: Math.min(...amounts),
      highest: Math.max(...amounts),
      average: total / quotations.length,
    };
  }, [quotations]);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Requirement Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!requirement) {
    return (
      <Screen padded={false}>
        <AppHeader title="Requirement Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Requirement not found.</Text>
      </Screen>
    );
  }

  // Only the creator (or Super Admin) can edit/submit/delete — mirrors the backend's
  // ownershipFilter in requirement.service.ts. Draft-stage actions stay creator-only even
  // after routing — the receiving department only starts operationally owning the
  // requirement once it's submitted (see isRoutedIntoMyDept below).
  const isOwner = requirement.createdById === user?.id;
  const canManage = (isOwner || isSuperAdmin) && requirement.status === 'draft';
  // True once this requirement was routed (via targetDepartment) into the viewer's own
  // department — mirrors the backend's `routedIntoOwnDepartment` in requirement.service.ts.
  // A same-department co-worker's own (non-routed) requirement does NOT count — matches the
  // backend keeping that private to its creator (+ HOD/Super Admin as usual).
  const isRoutedIntoMyDept = !!user?.department
    && user.department === requirement.departmentId
    && requirement.requestedByDepartmentId !== requirement.departmentId;
  // Quotation upload is only ever open while the requirement is still with the Department
  // User — locked the moment "Submit to Director" is pressed (quotation_comparison and
  // beyond), reopened only by a Director's Send Back (back to quotation_collection). Mirrors
  // the backend gate in quotation.service.ts's createForRequirement exactly: HOD is always
  // allowed for their own department; a plain Department User needs to either own it or have
  // it routed in.
  const canAddQuotation = (isOwner || isSuperAdmin || isHod || isRoutedIntoMyDept)
    && (requirement.status === 'submitted' || requirement.status === 'quotation_collection');
  // The hand-off to Director Review — the only way a requirement reaches it now. Mirrors the
  // backend's `departmentWriteFilter` in requirement.service.ts: the creator, or (once
  // genuinely routed in) whoever in the receiving department gathered the quotations —
  // Department User or HOD alike. See docs/WORKFLOW_ENHANCEMENT_DIRECTOR_SUBMISSION.md.
  const canSubmitToDirector = (isOwner || isSuperAdmin || isRoutedIntoMyDept) && requirement.status === 'quotation_collection';
  // Same role set as the backend's `LINK_ROLES` in vendorRegistrationLink.service.ts —
  // HOD's own scoping already confines `requirement` to their department, so no extra
  // department check is needed here beyond `isHod`.
  const canManageLink = isOwner || isSuperAdmin || isHod;
  // A Director never acts on Submit to Director / Vendor Registration / Vendor Public Link —
  // those cards are hidden entirely for a Director (see RequirementDetailsScreen simplification
  // request) rather than shown read-only, to cut clutter on the way to Director Review.
  const isDirectorReviewDecidable = requirement.status === 'quotation_comparison' || requirement.status === 'director_review';
  const isDirectorReviewPriority = isDirector && isDirectorReviewDecidable;

  const handleLinkExistingVendor = async () => {
    if (!vendorStatus?.vendor) return;
    try {
      await linkExistingVendor({ requirementId: requirement.id, vendorId: vendorStatus.vendor.id }).unwrap();
    } catch (error) {
      Alert.alert('Could Not Link Vendor', getErrorMessage(error));
    }
  };

  const handleGenerateLink = async () => {
    try {
      const link = await generateLink(requirement.id).unwrap();
      const publicUrl = `${env.apiUrl.replace('/api/v1', '')}/vendor-registration.html?token=${link.token}`;
      await Share.share({ message: `Please complete your vendor registration using this link: ${publicUrl}` });
    } catch (error) {
      Alert.alert('Could Not Generate Link', getErrorMessage(error));
    }
  };

  const handleSubmit = async () => {
    try {
      await submitRequirement(requirement.id).unwrap();
    } catch (error) {
      Alert.alert('Could Not Submit Requirement', getErrorMessage(error));
    }
  };

  const handleSubmitToDirector = async () => {
    try {
      await submitToDirector(requirement.id).unwrap();
      Alert.alert('Submitted', 'The requirement has been submitted to the Director for review.');
    } catch (error) {
      Alert.alert('Could Not Submit to Director', getErrorMessage(error));
    }
  };

  // Shared element rendered in exactly one of two positions below (prominent, right after
  // Requirement Items, or in its original spot) depending on isDirectorReviewPriority — never both.
  const directorReviewCard = (
    <DashboardCard
      className={`mt-4 ${isDirectorReviewPriority ? 'border-2 border-primary-300 bg-primary-50/40 dark:border-primary-700 dark:bg-primary-900/10' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {isDirectorReviewPriority ? (
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40">
              <Ionicons name="ribbon-outline" size={16} color="#1e88e5" />
            </View>
          ) : (
            <Ionicons name="ribbon-outline" size={18} color="#1e88e5" />
          )}
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Director Review</Text>
        </View>
        <Button
          label="Open Review"
          variant="secondary"
          onPress={() => navigation.navigate('DirectorReview', { requirementId: requirement.id })}
        />
      </View>
      <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
        Full procurement package — requirement, quotations, OCR data, AI comparison, and
        approval history. {isSuperAdmin || isHod ? 'Read-only unless you are a Director or Super Admin acting on it.' : ''}
      </Text>
    </DashboardCard>
  );

  const handleDelete = () => {
    Alert.alert('Delete Requirement', `"${requirement.requirementNumber}" will be permanently removed from your drafts.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteRequirement(requirement.id).unwrap();
            navigation.goBack();
          } catch (error) {
            Alert.alert('Could Not Delete Requirement', getErrorMessage(error));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Requirement Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard>
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Timeline</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
            <View className="flex-row items-center">
              {TIMELINE_STEPS.map((step, index) => {
                const currentStepIndex = timelineStepIndex(requirement.status);
                const isRejectedNode = requirement.status === 'rejected' && index === currentStepIndex;
                const isFilled = index <= currentStepIndex;
                const isLast = index === TIMELINE_STEPS.length - 1;
                const label = isRejectedNode ? 'Rejected' : step.label;
                return (
                  <View key={step.status} className="flex-row items-center">
                    <View className="items-center" style={{ width: 88 }}>
                      <View
                        className={`h-3 w-3 rounded-full ${
                          isRejectedNode ? 'bg-red-600' : isFilled ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                      <Text
                        className={`mt-1 text-center text-[11px] ${
                          isRejectedNode ? 'text-red-600' : 'text-ink-muted dark:text-slate-500'
                        }`}
                      >
                        {label}
                      </Text>
                    </View>
                    {!isLast ? (
                      <View className={`h-0.5 w-6 ${index < currentStepIndex ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </DashboardCard>

        <DashboardCard className="mt-4">
          <View className="flex-row items-start justify-between">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
              <Ionicons name="list" size={26} color="#1e88e5" />
            </View>
            <Badge label={STATUS_LABEL[requirement.status]} variant={STATUS_VARIANT[requirement.status]} />
          </View>

          <Text className="mt-3 text-2xl font-bold text-ink dark:text-white">{requirement.requirementNumber}</Text>
          <Text className="mt-0.5 text-base text-ink-muted dark:text-slate-400">{requirement.title}</Text>
          <Text className="mt-1 text-base font-medium text-ink dark:text-slate-200">
            {requirement.items.map((item) => `${item.itemName} — Qty: ${item.quantity} ${item.unit}`).join(', ')}
          </Text>

          <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <InfoRow icon="business-outline" label="Department" value={requirement.departmentName} />
              </View>
              <View className="flex-1">
                <InfoRow icon="cash-outline" label="Budget" value={`₹${requirement.budget.toLocaleString()}`} />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <InfoRow icon="time-outline" label="Required Date" value={formatDate(requirement.requiredDate)} />
              </View>
              <View className="flex-1">
                <InfoRow icon="flag-outline" label="Priority" value={requirement.priority} />
              </View>
            </View>
            {requirement.createdByDepartmentName && requirement.createdByDepartmentName !== requirement.departmentName ? (
              <InfoRow icon="swap-horizontal-outline" label="Requested From" value={requirement.createdByDepartmentName} />
            ) : null}
            {requirement.description ? <InfoRow icon="document-text-outline" label="Description" value={requirement.description} /> : null}
            {requirement.remarks ? <InfoRow icon="chatbox-outline" label="Remarks" value={requirement.remarks} /> : null}
          </View>

          <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="person-circle-outline" size={13} color="#5f5f5f" />
              <Text className="text-sm text-ink-muted dark:text-slate-500">By {requirement.createdByName || '—'}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
              <Text className="text-sm text-ink-muted dark:text-slate-500">Created {formatDate(requirement.createdAt)}</Text>
            </View>
          </View>
        </DashboardCard>

        <DashboardCard className="mt-4">
          <Text className="text-base font-semibold text-ink dark:text-slate-200">Items ({requirement.items.length})</Text>
          {requirement.items.map((item, index) => (
            <View
              key={`${item.itemName}-${index}`}
              className={`mt-3 pt-3 ${index > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-base font-medium text-ink dark:text-white">{item.itemName}</Text>
                <Text className="text-base text-ink-muted dark:text-slate-400">
                  {item.quantity} {item.unit}
                </Text>
              </View>
              {item.specification ? (
                <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-500">{item.specification}</Text>
              ) : null}
              <Text className="mt-1 text-sm text-ink-muted dark:text-slate-500">
                Rate ₹{item.estimatedRate.toLocaleString()} · Est. ₹{item.estimatedAmount.toLocaleString()}
              </Text>
            </View>
          ))}
        </DashboardCard>

        {isDirectorReviewPriority ? directorReviewCard : null}

        <DashboardCard className="mt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-ink dark:text-slate-200">Quotations ({quotations.length})</Text>
            {canAddQuotation ? (
              <Button
                label="Add Quotation"
                variant="secondary"
                onPress={() => navigation.navigate('CreateRequirementQuotation', { requirementId: requirement.id })}
              />
            ) : null}
          </View>

          <View className="mt-3 flex-row flex-wrap gap-3">
            <View className="min-w-[46%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <Text className="text-[11px] text-ink-muted dark:text-slate-500">Lowest Amount</Text>
              <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">₹{quotationStats.lowest.toLocaleString()}</Text>
            </View>
            <View className="min-w-[46%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <Text className="text-[11px] text-ink-muted dark:text-slate-500">Highest Amount</Text>
              <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">₹{quotationStats.highest.toLocaleString()}</Text>
            </View>
            <View className="min-w-[46%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <Text className="text-[11px] text-ink-muted dark:text-slate-500">Average Amount</Text>
              <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">₹{quotationStats.average.toLocaleString()}</Text>
            </View>
            <View className="min-w-[46%] flex-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <Text className="text-[11px] text-ink-muted dark:text-slate-500">Comparison</Text>
              <Text className="mt-1 text-sm font-semibold text-ink dark:text-white">
                {quotations.length >= 2 ? 'Ready soon' : 'Add more quotations'}
              </Text>
            </View>
          </View>

          <View className="mt-4">
            <QuotationSearch value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by quotation number or vendor..." />
          </View>

          <View className="mt-3">
            <FilterChipRow value={quotationStatus} options={[...QUOTATION_STATUS_OPTIONS]} onChange={setQuotationStatus} />
          </View>

          <View className="mt-3 flex-row gap-2">
            {([
              { value: 'latest', label: 'Latest' },
              { value: 'lowest', label: 'Lowest' },
              { value: 'highest', label: 'Highest' },
            ] as const).map((option) => {
              const isSelected = sortMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${option.label}`}
                  onPress={() => setSortMode(option.value)}
                  className={`rounded-full border px-3 py-2 ${
                    isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-ink dark:text-white'}`}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {isLoadingQuotations ? (
            <View className="mt-4">
              <Loader />
            </View>
          ) : filteredQuotations.length === 0 ? (
            <Text className="mt-4 text-sm text-ink-muted dark:text-slate-400">No quotations match the current search or filter.</Text>
          ) : (
            filteredQuotations.map((quotation) => {
              const latestAttachment = quotation.attachments[quotation.attachments.length - 1];
              return (
                <View key={quotation.id} className="mt-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-ink dark:text-white">{quotation.quotationCode}</Text>
                      <Text className="mt-1 text-sm text-ink dark:text-slate-200">{quotation.vendorName}</Text>
                      <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">
                        {quotation.temporaryVendor?.contactPerson || 'Temporary vendor'}{quotation.temporaryVendor?.phone ? ` · ${quotation.temporaryVendor.phone}` : ''}
                      </Text>
                    </View>
                    <Badge label={quotation.status} variant={quotation.status === 'approved' ? 'success' : quotation.status === 'rejected' ? 'danger' : 'primary'} />
                  </View>

                  <View className="mt-3">
                    <InfoRow icon="cash-outline" label="Amount" value={`₹${quotation.amount.toLocaleString()} (+${quotation.gst}% GST)`} />
                    <InfoRow icon="calendar-outline" label="Quotation Date" value={formatDate(quotation.quotationDate)} />
                    <InfoRow icon="flag-outline" label="Priority" value={quotation.priority} />
                    {quotation.temporaryVendor?.email ? <InfoRow icon="mail-outline" label="Email" value={quotation.temporaryVendor.email} /> : null}
                    {quotation.temporaryVendor?.address ? <InfoRow icon="location-outline" label="Address" value={quotation.temporaryVendor.address} /> : null}
                    <InfoRow icon="document-attach-outline" label="Attachment Count" value={String(quotation.attachments.length)} />
                  </View>

                  {latestAttachment ? (
                    <View className="mt-3 flex-row items-center justify-between">
                      <Text
                        onPress={() => Linking.openURL(`${env.apiUrl.replace('/api/v1', '')}${latestAttachment.url}`)}
                        className="text-sm text-primary-600 underline"
                      >
                        Open latest attachment
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => navigation.navigate('QuotationOcrResult', { requirementId: requirement.id, quotationId: quotation.id })}
                        className="flex-row items-center gap-1.5"
                      >
                        <OcrStatusBadge status={quotation.ocr?.status} />
                        <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </DashboardCard>

        <DashboardCard className="mt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="git-network-outline" size={18} color="#1e88e5" />
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">Full Pipeline</Text>
            </View>
            <Button
              label="View Full Pipeline"
              variant="secondary"
              onPress={() => navigation.navigate('RequirementPipeline', { requirementId: requirement.id })}
            />
          </View>
          <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
            See this requirement's entire journey — Quotations, Director Approval, Vendor
            Registration, Purchase Order, Goods Receipt, Bill, and Payment — in one place.
          </Text>
        </DashboardCard>

        {canSubmitToDirector && !isDirector ? (
          <Button
            label="Submit to Director"
            loading={isSubmittingToDirector}
            onPress={handleSubmitToDirector}
            className="mt-4"
          />
        ) : null}

        <DashboardCard className="mt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="git-compare-outline" size={18} color="#1e88e5" />
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">AI Comparison</Text>
            </View>
            <Button
              label="View Comparison"
              variant="secondary"
              onPress={() => navigation.navigate('AiComparison', { requirementId: requirement.id })}
            />
          </View>
          <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
            {requirement.status === 'approved' || requirement.status === 'rejected' || requirement.status === 'vendor_finalized' || requirement.status === 'closed'
              ? 'Read-only — a decision has already been made on this requirement.'
              : quotations.length >= 1
                ? 'Compare grand total, GST, items, and AI observations across every quotation on this requirement.'
                : 'Add at least one quotation before a comparison can be generated.'}
          </Text>
        </DashboardCard>

        {!isDirectorReviewPriority ? directorReviewCard : null}

        {approvedQuotation && (requirement.status === 'approved' || requirement.status === 'vendor_finalized') ? (
          <DashboardCard className="mt-4 border border-primary-200 dark:border-primary-900">
            <View className="flex-row items-center gap-2">
              <Ionicons name="ribbon-outline" size={18} color="#1e88e5" />
              <Text className="text-sm font-semibold text-ink dark:text-slate-200">Approved Quotation</Text>
            </View>
            <Text className="mt-2 text-sm font-semibold text-ink dark:text-white">
              {approvedQuotation.vendorName}
            </Text>
            <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">
              {approvedQuotation.quotationCode} • {approvedQuotation.currency} {approvedQuotation.amount.toLocaleString()}
            </Text>
            <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">
              This is the quotation the Director approved — Purchase Order and Vendor Registration/Link below act against it.
            </Text>
          </DashboardCard>
        ) : null}

        {requirement.status === 'approved' && !isDirector && vendorStatus?.alreadyRegistered ? (
          <DashboardCard className="mt-4 border border-success-200 dark:border-success-900">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text className="text-sm font-semibold text-ink dark:text-slate-200">Vendor Already Registered</Text>
              </View>
              {vendorStatus.vendor && (isOwner || isSuperAdmin) ? (
                <Button
                  label="Confirm & Continue"
                  variant="secondary"
                  loading={isLinkingVendor}
                  onPress={handleLinkExistingVendor}
                />
              ) : null}
            </View>
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
              {vendorStatus.vendor
                ? `${vendorStatus.vendor.name} (${vendorStatus.vendor.code}) is already in the vendor list — no need to register again or share a link. ${
                    isOwner || isSuperAdmin ? 'Confirm to finalize this Requirement against it and unlock Purchase Order.' : ''
                  }`
                : `${vendorStatus.winningVendorName} is already in the vendor list — no need to register again or share a link.`}
            </Text>
          </DashboardCard>
        ) : null}

        {(requirement.status === 'approved' || requirement.status === 'vendor_finalized') && !isDirector && !vendorStatus?.alreadyRegistered ? (
          <DashboardCard className="mt-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="business-outline" size={18} color="#1e88e5" />
                <Text className="text-sm font-semibold text-ink dark:text-slate-200">Vendor Registration</Text>
              </View>
              <Button
                label={requirement.status === 'vendor_finalized' ? 'View Vendor' : 'Register Vendor'}
                variant="secondary"
                onPress={() => navigation.navigate('VendorRegistration', { requirementId: requirement.id })}
              />
            </View>
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
              {requirement.status === 'vendor_finalized'
                ? 'A vendor has been registered for this requirement — ready for Purchase Order.'
                : isOwner || isSuperAdmin
                  ? 'Register the winning vendor from the AI Comparison recommendation and Director approval.'
                  : 'Read only — only the requesting Department User or Super Admin can register the vendor.'}
            </Text>
            {requirement.status === 'approved' && (isOwner || isSuperAdmin) ? (
              <Button
                label="Show Vendors"
                variant="secondary"
                onPress={() => navigation.navigate('SelectExistingVendor', { requirementId: requirement.id })}
                className="mt-3"
              />
            ) : null}
          </DashboardCard>
        ) : null}

        {requirement.status === 'approved' && !isDirector && !vendorStatus?.alreadyRegistered ? (
          <DashboardCard className="mt-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="link-outline" size={18} color="#1e88e5" />
                <Text className="text-sm font-semibold text-ink dark:text-slate-200">Vendor Public Registration Link</Text>
              </View>
              {canManageLink ? (
                registrationLink?.status === 'submitted' ? (
                  <Button
                    label="Verify Vendor Details"
                    variant="secondary"
                    onPress={() => navigation.navigate('VendorRegistrationLinkVerify', { requirementId: requirement.id })}
                  />
                ) : (
                  <Button
                    label={registrationLink?.status === 'pending' ? 'Share Vendor Link' : 'Generate Vendor Link'}
                    variant="secondary"
                    loading={isGeneratingLink}
                    onPress={handleGenerateLink}
                  />
                )
              ) : null}
            </View>
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
              {registrationLink?.status === 'submitted'
                ? 'The vendor has submitted their own details — review and Verify & Finalize to create the Vendor record.'
                : registrationLink?.status === 'pending'
                  ? 'A link is live — share it with the vendor to let them fill in their own company/bank details and documents.'
                  : canManageLink
                    ? 'Generate a link the vendor can open in any browser to fill in their own registration details — no app account needed.'
                    : 'Read only — only the requesting Department User, HOD, or a Super Admin can generate or verify this link.'}
            </Text>
          </DashboardCard>
        ) : null}

        {requirement.status === 'vendor_finalized' ? (
          <DashboardCard className="mt-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="receipt-outline" size={18} color="#1e88e5" />
                <Text className="text-sm font-semibold text-ink dark:text-slate-200">Purchase Order</Text>
              </View>
              <Button
                label={linkedPurchaseOrder ? 'View Purchase Order' : 'Generate Purchase Order'}
                variant="secondary"
                onPress={() => {
                  // A single `getParent()` call landed on a navigator that doesn't directly own
                  // `PurchaseOrders` (it's a Tab nested two levels below the Root Stack's own
                  // "Main" screen, not one), so `parent?.navigate('PurchaseOrders', ...)` was
                  // rejected by React Navigation ("action not handled by any navigator") — same
                  // nested-params shape already used by notificationDeepLink.ts's in-app router
                  // for jumping from anywhere to a sibling tab: climb to the root stack, then
                  // navigate through its "Main" screen with nested screen/params.
                  let nav = navigation as unknown as { getParent?: () => unknown; navigate: (name: string, params?: object) => void };
                  while (nav.getParent?.()) {
                    nav = nav.getParent!() as typeof nav;
                  }
                  const params = linkedPurchaseOrder
                    ? { screen: 'PurchaseOrderDetails', params: { purchaseOrderId: linkedPurchaseOrder.id } }
                    : { screen: 'CreatePurchaseOrder', params: { requirementId: requirement.id } };
                  nav.navigate('Main', { screen: 'PurchaseOrders', params });
                }}
              />
            </View>
            <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
              {linkedPurchaseOrder
                ? `${linkedPurchaseOrder.poNumber} — ${linkedPurchaseOrder.status.replace(/_/g, ' ')}.`
                : isOwner || isSuperAdmin
                  ? 'Generate a Purchase Order for the registered vendor — items are pre-filled from this requirement.'
                  : 'Read only — only the requesting Department User or Super Admin can generate the Purchase Order.'}
            </Text>
          </DashboardCard>
        ) : null}

        {canManage ? (
          <>
            <Button label="Edit Requirement" onPress={() => navigation.navigate('EditRequirement', { requirementId: requirement.id })} className="mt-5" />
            <Button label="Submit for Review" variant="secondary" loading={isSubmitting} onPress={handleSubmit} className="mt-3" />
            <Button label="Delete Requirement" variant="dangerOutline" loading={isDeleting} onPress={handleDelete} className="mt-3" />
          </>
        ) : null}

        {requirement.status === 'submitted' ? (
          <View className="mt-5 items-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <Ionicons name="hourglass-outline" size={20} color="#5f5f5f" />
            <Text className="mt-1.5 text-center text-sm text-ink-muted dark:text-slate-400">
              Submitted for review. You can start collecting quotations for this requirement now.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
