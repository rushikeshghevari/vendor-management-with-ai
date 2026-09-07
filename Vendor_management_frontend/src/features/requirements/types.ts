export const REQUIREMENT_STATUSES = [
  'draft',
  'submitted',
  'quotation_collection',
  'quotation_comparison',
  'director_review',
  'approved',
  'rejected',
  'vendor_finalized',
  'closed',
] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const REQUIREMENT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type RequirementPriority = (typeof REQUIREMENT_PRIORITIES)[number];

export interface RequirementItem {
  itemName: string;
  specification?: string;
  quantity: number;
  unit: string;
  estimatedRate: number;
  estimatedAmount: number;
  remarks?: string;
}

export interface Requirement {
  id: string;
  requirementNumber: string;
  departmentId: string;
  departmentName: string;
  /** The requester's own department id — differs from `departmentId` only when this
   *  requirement was routed to a different department. Compare directly (not via
   *  `createdByDepartmentName`) to decide whether a viewer's own department "received" this
   *  requirement, mirroring the backend's `routedIntoOwnDepartment` in requirement.service.ts. */
  requestedByDepartmentId: string;
  createdById: string;
  createdByName: string;
  /** The creator's own department — only present (and worth showing) when it differs from
   *  `departmentName`, i.e. this requirement was routed to a different department. */
  createdByDepartmentName?: string;
  submittedByName?: string;
  title: string;
  description?: string;
  priority: RequirementPriority;
  budget: number;
  requiredDate: string;
  status: RequirementStatus;
  remarks?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  items: RequirementItem[];
  quotationCount: number;
  /** The Department User/HOD's own recommended pick among the collected quotations — purely
   *  informational, shown as a badge; never restricts what the Director can approve. */
  preparedQuotationId?: string;
  createdAt: string;
  updatedAt: string;
}
