import { toComparison, type RawComparison } from '@/features/comparison/api/comparisonApi';
import type {
  ActivityLogEntry,
  DirectorApprovalEntry,
  DirectorReview,
  DirectorReviewDecidable,
  ReviewPackage,
} from '@/features/directorReview/types';
import { toQuotation, type RawQuotation } from '@/features/quotations/api/quotationsApi';
import { toRequirement, type RawRequirement } from '@/features/requirements/api/requirementsApi';
import type { Requirement } from '@/features/requirements/types';
import { baseApi } from '@/store/baseApi';

interface RawActivityLog {
  _id: string;
  action: string;
  performedByName: string;
  performedByRole: string;
  createdAt: string;
}

interface RawDirectorReviewHistoryEntry {
  action: string;
  decision?: string;
  remarks?: string;
  performedByName: string;
  performedAt: string;
}

interface RawDirectorApprovalEntry {
  director: string;
  directorName: string;
  decision: string;
  remarks?: string;
  decidedAt?: string;
}

interface RawDirectorReview {
  _id: string;
  requirement: string;
  decision: string;
  remarks?: string;
  decisionDate?: string;
  selectedQuotation?: string;
  approvals: RawDirectorApprovalEntry[];
  history: RawDirectorReviewHistoryEntry[];
  version: number;
}

interface RawReviewPackage {
  requirement: RawRequirement;
  comparison: RawComparison | null;
  quotations: RawQuotation[];
  activityLogs: RawActivityLog[];
  review: RawDirectorReview;
}

function toDirectorApprovalEntry(raw: RawDirectorApprovalEntry): DirectorApprovalEntry {
  return {
    directorId: raw.director,
    directorName: raw.directorName,
    decision: raw.decision as DirectorApprovalEntry['decision'],
    remarks: raw.remarks,
    decidedAt: raw.decidedAt,
  };
}

function toDirectorReview(raw: RawDirectorReview): DirectorReview {
  return {
    id: raw._id,
    requirementId: raw.requirement,
    decision: raw.decision as DirectorReview['decision'],
    remarks: raw.remarks,
    decisionDate: raw.decisionDate,
    selectedQuotationId: raw.selectedQuotation,
    version: raw.version,
    approvals: (raw.approvals ?? []).map(toDirectorApprovalEntry),
    history: raw.history.map((h) => ({
      action: h.action as DirectorReview['history'][number]['action'],
      decision: h.decision as DirectorReview['history'][number]['decision'],
      remarks: h.remarks,
      performedByName: h.performedByName,
      performedAt: h.performedAt,
    })),
  };
}

function toActivityLogEntry(raw: RawActivityLog): ActivityLogEntry {
  return { id: raw._id, action: raw.action, performedByName: raw.performedByName, performedByRole: raw.performedByRole, createdAt: raw.createdAt };
}

function toReviewPackage(raw: RawReviewPackage): ReviewPackage {
  return {
    requirement: toRequirement(raw.requirement),
    comparison: raw.comparison ? toComparison(raw.comparison) : null,
    quotations: raw.quotations.map(toQuotation),
    activityLogs: raw.activityLogs.map(toActivityLogEntry),
    review: toDirectorReview(raw.review),
  };
}

export interface DecisionInput {
  decision: DirectorReviewDecidable;
  remarks?: string;
  /** Only sent (and only meaningful) when `decision === 'approved'` — the Director's explicit
   *  pick of the winning quotation. Omit entirely for reject/send_back. */
  selectedQuotationId?: string;
}

export const directorReviewApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getDirectorReview: builder.query<ReviewPackage, string>({
      query: (requirementId) => ({ url: `/requirements/${requirementId}/director-review`, method: 'GET' }),
      transformResponse: (raw: RawReviewPackage) => toReviewPackage(raw),
      providesTags: (_result, _error, requirementId) => [
        { type: 'Requirement', id: requirementId },
        { type: 'Comparison', id: requirementId },
      ],
    }),

    decideDirectorReview: builder.mutation<{ requirement: Requirement; review: DirectorReview }, { requirementId: string; input: DecisionInput }>({
      query: ({ requirementId, input }) => ({ url: `/requirements/${requirementId}/director-review/decision`, method: 'POST', data: input }),
      transformResponse: (raw: { requirement: RawRequirement; review: RawDirectorReview }) => ({
        requirement: toRequirement(raw.requirement),
        review: toDirectorReview(raw.review),
      }),
      invalidatesTags: (_result, _error, { requirementId }) => [
        { type: 'Requirement', id: requirementId },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),

    updateDirectorReviewRemarks: builder.mutation<DirectorReview, { requirementId: string; remarks: string }>({
      query: ({ requirementId, remarks }) => ({ url: `/requirements/${requirementId}/director-review/remarks`, method: 'PATCH', data: { remarks } }),
      transformResponse: (raw: RawDirectorReview) => toDirectorReview(raw),
      invalidatesTags: (_result, _error, { requirementId }) => [{ type: 'Requirement', id: requirementId }],
    }),
  }),
});

export const {
  useGetDirectorReviewQuery,
  useDecideDirectorReviewMutation,
  useUpdateDirectorReviewRemarksMutation,
} = directorReviewApi;
