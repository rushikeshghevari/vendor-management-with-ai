export const RECURRING_MODES = ['vendor_bill', 'reimbursement'] as const;
export type RecurringMode = (typeof RECURRING_MODES)[number];

export const RECURRING_FREQUENCIES = ['monthly', 'quarterly', 'half_yearly', 'yearly'] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export interface ReimbursementBankDetails {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
}

export interface RecurringExpense {
  id: string;
  title: string;
  mode: RecurringMode;
  departmentId: string;
  departmentName: string;
  vendorId?: string;
  vendorName?: string;
  reimbursedToId?: string;
  reimbursedToName?: string;
  reimbursementBankDetails?: ReimbursementBankDetails;
  frequency: RecurringFrequency;
  baselineAmount: number;
  thresholdPercent: number;
  nextDueDate: string;
  isActive: boolean;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
