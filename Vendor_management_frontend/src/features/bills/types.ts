export const BILL_STATUSES = [
  'draft',
  'submitted',
  'ai_failed',
  'ai_verified',
  'director_approved',
  'director_rejected',
  'director_correction',
  'verified',
  'correction_requested',
  'rejected',
  'payment_pending',
  'paid',
  'completed',
] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const DIRECTOR_FINANCIAL_DECISIONS = ['approved', 'rejected', 'correction_required'] as const;
export type DirectorFinancialDecision = (typeof DIRECTOR_FINANCIAL_DECISIONS)[number];

export interface DirectorBillStats {
  pendingFinancialApprovals: number;
  approvedToday: number;
  rejectedToday: number;
  correctionToday: number;
  highRiskBills: number;
}

export interface BillFileVersion {
  version: number;
  fileName: string;
  url: string;
  uploadedAt: string;
}

export const BILL_DECISIONS = ['verified', 'correction_requested', 'rejected'] as const;
export type BillDecision = (typeof BILL_DECISIONS)[number];

export interface BillDecisionRecord {
  decision: BillStatus;
  remarks?: string;
  decidedById: string;
  decidedByName: string;
  decidedAt: string;
}

export interface Bill {
  id: string;
  billCode: string;
  quotationId: string;
  quotationCode: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  departmentId: string;
  departmentName: string;
  createdById: string;
  createdByName: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  // Phase 9 — Requirement/Goods-Receipt lineage, set only for a Requirement-originated PO's
  // Bill. Denormalized on the Bill document itself (see bill.model.ts) — no extra lookup.
  requirementId?: string;
  requirementNumber?: string;
  goodsReceiptId?: string;
  grnNumber?: string;
  // Denormalized AI summary — set once AI verification completes (see director.service.ts /
  // bill.service.ts runAiPipelineForBill). The full result lives on the linked Purchase Order.
  aiMatchPercentage?: number;
  aiRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  aiRecommendation?: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
  aiVerifiedAt?: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxableAmount: number;
  gstAmount: number;
  paymentTerms: string;
  creditPeriod?: number;
  dueDate: string;
  invoiceFiles: BillFileVersion[];
  supportingDocuments: BillFileVersion[];
  remarks?: string;
  accountsRemarks?: string;
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  decisionHistory: BillDecisionRecord[];
  // Director Financial Approval (Approval 2 — after 3-Way AI)
  directorFinancialDecision?: DirectorFinancialDecision;
  directorFinancialBy?: string;
  directorFinancialAt?: string;
  directorFinancialRemarks?: string;
  directorApprovals?: {
    directorId: string;
    directorName: string;
    decision: 'pending' | 'approved' | 'rejected' | 'correction_required';
    remarks?: string;
    decidedAt: string | null;
  }[];
  status: BillStatus;
  // Set only when this Bill is one cycle of a Recurring Expense (see the recurringExpenses
  // feature) — the vendor 3-way-match/Director-Financial-Approval flow above never applies to
  // these; they're auto-verified or sent for one-shot Director approval based on the % vs.
  // baselineAmount instead (see recurringExpenseNote below, set only when over threshold).
  recurringExpenseId?: string;
  recurringExpenseTitle?: string;
  recurringExpenseMode?: 'vendor_bill' | 'reimbursement';
  recurringExpenseThresholdPercent?: number;
  recurringExpenseBaselineAmount?: number;
  // Reimbursement-mode recurring Bills have no vendor — this is who actually gets paid instead.
  reimbursedToName?: string;
  reimbursementBankDetails?: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AccountsBillStats {
  pendingVerification: number;
  correctionRequested: number;
  verifiedToday: number;
  rejected: number;
  total: number;
  totalVerified: number;
}

export interface PaymentBillStats {
  readyForPayment: number;
  paymentPending: number;
  paidToday: number;
  completed: number;
}

export type BillTimelineEventType = 'bill_event' | 'accounts_decision' | 'ai_run';

export interface BillTimelineEvent {
  type: BillTimelineEventType;
  event: string;
  status?: string;
  remarks?: string;
  actorName?: string;
  actorRole?: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface BillTimeline {
  billId: string;
  billCode: string;
  events: BillTimelineEvent[];
}
