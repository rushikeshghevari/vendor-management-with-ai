export const ACTIVITY_ACTIONS = [
  'department_created',
  'department_updated',
  'hod_assigned',
  'hod_transferred',
  'hod_removed',
  'department_user_created',
  'department_user_updated',
  'department_user_deactivated',
  'department_user_reactivated',
  'vendor_created',
  'vendor_updated',
  'quotation_created',
  'quotation_submitted',
  'quotation_approved',
  'quotation_rejected',
  'purchase_order_created',
  'po_shared',
  'bill_uploaded',
  'ai_completed',
  'director_approved',
  'director_rejected',
  'accounts_approved',
  'payment_completed',
  'password_reset',
  'requirement_created',
  'requirement_updated',
  'requirement_submitted',
  'quotation_ocr_completed',
  'quotation_ocr_failed',
  'comparison_generated',
  'director_review_viewed',
  'director_review_approved',
  'director_review_rejected',
  'director_review_sent_back',
  'director_review_remarks_updated',
  'vendor_registered',
  'po_emailed',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface ActivityLogEntry {
  id: string;
  action: ActivityAction;
  performedBy?: string;
  performedByName: string;
  performedByRole: string;
  departmentId?: string;
  departmentName?: string;
  targetId?: string;
  targetType?: string;
  ipAddress?: string;
  createdAt: string;
}
