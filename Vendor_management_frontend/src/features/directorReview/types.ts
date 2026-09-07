import type { Comparison } from '@/features/comparison/types';
import type { Quotation } from '@/features/quotations/types';
import type { Requirement } from '@/features/requirements/types';

export const DIRECTOR_REVIEW_DECIDABLE = ['approved', 'rejected', 'sent_back'] as const;
export type DirectorReviewDecidable = (typeof DIRECTOR_REVIEW_DECIDABLE)[number];

export const DIRECTOR_REVIEW_DECISIONS = ['pending', ...DIRECTOR_REVIEW_DECIDABLE] as const;
export type DirectorReviewDecision = (typeof DIRECTOR_REVIEW_DECISIONS)[number];

export type DirectorReviewHistoryAction = 'viewed' | 'approved' | 'rejected' | 'sent_back' | 'remarks_updated';

export interface DirectorReviewHistoryEntry {
  action: DirectorReviewHistoryAction;
  decision?: DirectorReviewDecidable;
  remarks?: string;
  performedByName: string;
  performedAt: string;
}

/** One Director's own, independent decision — parallel dual-approval (both Directors must
 *  approve before the requirement is Approved; either one can Reject or Send Back
 *  immediately). `remarks` is omitted by the API (not just an empty string) whenever the
 *  viewing Director hasn't submitted their own decision yet — never render a missing
 *  `remarks` as "no remarks" without checking whether it's actually hidden vs genuinely
 *  blank; see DirectorReviewScreen. */
export interface DirectorApprovalEntry {
  directorId: string;
  directorName: string;
  decision: DirectorReviewDecision;
  remarks?: string;
  decidedAt?: string;
}

export interface DirectorReview {
  id: string;
  requirementId: string;
  /** The AGGREGATE outcome across every entry in `approvals` — stays 'pending' until either
   *  every Director has approved, or any single one has rejected or sent it back. */
  decision: DirectorReviewDecision;
  remarks?: string;
  decisionDate?: string;
  /** The quotation a Director explicitly picked as the winner when approving — overrides the
   *  AI Comparison recommendation / earliest-uploaded fallback at Vendor Registration time.
   *  Unset means no Director has made an explicit override yet (the default). */
  selectedQuotationId?: string;
  approvals: DirectorApprovalEntry[];
  history: DirectorReviewHistoryEntry[];
  version: number;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  performedByName: string;
  performedByRole: string;
  createdAt: string;
}

/** Everything the Director Review screen needs in one response — requirement, its AI
 *  comparison, every quotation (OCR data included), recent activity log entries, and the
 *  review record itself. `comparison` is null whenever no AI Comparison has been generated
 *  for this requirement (no AI provider is configured yet) — Director Review always works
 *  from the quotations directly in that case; see DirectorReviewScreen's null handling. */
export interface ReviewPackage {
  requirement: Requirement;
  comparison: Comparison | null;
  quotations: Quotation[];
  activityLogs: ActivityLogEntry[];
  review: DirectorReview;
}
