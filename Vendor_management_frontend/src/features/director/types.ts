import type { AiDifference, AiRecommendation, AiRisk, AiTokenUsage } from '@/features/purchaseOrders/types';
import type { BillFileVersion, BillStatus, DirectorFinancialDecision } from '@/features/bills/types';

export type ComparisonStatus = 'matched' | 'low' | 'medium' | 'high' | 'not_tracked' | 'not_verified';

export interface ComparisonRow {
  field: string;
  quotation: unknown;
  purchaseOrder: unknown;
  bill: unknown;
  status: ComparisonStatus;
  note?: string;
}

export interface TimelineEvent {
  key: string;
  label: string;
  status: 'completed' | 'pending';
  timestamp: string | null;
  actor?: string;
}

interface RefSummary {
  _id: string;
  name?: string;
  code?: string;
  email?: string;
}

interface VendorSummary extends RefSummary {
  gstNumber?: string;
  panNumber?: string;
  bankDetails?: {
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  };
}

export interface ReviewBill {
  id: string;
  billCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  paymentTerms: string;
  dueDate: string;
  status: BillStatus;
  vendor: VendorSummary | null;
  department: RefSummary | null;
  uploadedBy: RefSummary | null;
  invoiceFiles: BillFileVersion[];
  supportingDocuments: BillFileVersion[];
  remarks?: string;
  directorFinancialDecision: DirectorFinancialDecision | null;
  directorFinancialBy: RefSummary | string | null;
  directorFinancialAt: string | null;
  directorFinancialRemarks: string | null;
  directorApprovals?: {
    directorId: string;
    directorName: string;
    decision: 'pending' | 'approved' | 'rejected' | 'correction_required';
    remarks?: string;
    decidedAt: string | null;
  }[];
  // Set only when this Bill is one cycle of a Recurring Expense — it has no PO/GRN, so the
  // AI-verification and comparison-table sections above are never populated for it.
  recurringExpense?: { _id: string; title: string; mode: 'vendor_bill' | 'reimbursement'; thresholdPercent: number; baselineAmount: number } | null;
  reimbursedTo?: RefSummary | null;
}

export interface ReviewQuotation {
  id: string;
  quotationCode: string;
  amount: number;
  gst: number;
  grandTotal: number;
  currency: string;
  paymentTerms: string;
  vendor: VendorSummary | null;
  department: RefSummary | string | null;
  createdBy: RefSummary | string | null;
  submittedBy: RefSummary | string | null;
  approvalDate: string | null;
  approvedBy: RefSummary | string | null;
  pdfFiles: { version: number; fileName: string; url: string; uploadedAt: string }[];
}

export interface PreviousBillSummary {
  _id: string;
  billCode: string;
  invoiceNumber: string;
  invoiceAmount: number;
  status: string;
  isDeleted: boolean;
  createdAt: string;
  directorFinancialDecision?: string | null;
}

export interface ReviewPurchaseOrder {
  id: string;
  poNumber: string;
  poDate: string;
  grandTotal: number;
  createdBy: RefSummary | string | null;
  alreadyBilled: number;
  remainingBalance: number | null;
  availableBalance: number | null;
  status: string;
  pdfDownloadPath: string;
  previousBills: PreviousBillSummary[];
}

export interface ReviewAiVerification {
  available: boolean;
  matchPercentage?: number;
  quotationMatch?: number | null;
  purchaseOrderMatch?: number | null;
  risk?: AiRisk;
  recommendation?: AiRecommendation;
  confidence?: number;
  summary?: string;
  ruleEngineScore?: number;
  verifiedAt?: string;
  executionTimeMs?: number | null;
  modelVersion?: string | null;
  promptVersion?: string | null;
  tokenUsage?: AiTokenUsage | null;
  aiProvider?: 'gemini' | 'rule_engine_only' | null;
}

export interface BillReview {
  bill: ReviewBill;
  quotation: ReviewQuotation | null;
  purchaseOrder: ReviewPurchaseOrder | null;
  aiVerification: ReviewAiVerification;
  comparisonTable: ComparisonRow[];
  differences: AiDifference[];
  differencesBySeverity: { high: AiDifference[]; medium: AiDifference[]; low: AiDifference[] };
  timeline: TimelineEvent[];
  approvalHistory: {
    quotationApprovals: { director: RefSummary | string; decision: string; remarks?: string; decidedAt: string }[];
    directorFinancial: { decision: DirectorFinancialDecision; by: RefSummary | string; at: string; remarks?: string } | null;
    accountsDecisions: { decision: string; remarks?: string; decidedBy: RefSummary | string; decidedAt: string }[];
  };
  recommendationBand: 'green' | 'warning' | 'red' | null;
  canDecide: boolean;
  canTriggerAiVerification: boolean;
}
