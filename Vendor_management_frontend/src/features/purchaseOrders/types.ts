export const PO_STATUSES = [
  'generated',
  'bill_uploaded',
  'ai_verification_pending',
  'ai_verified',
  'accounts_verified',
  'payment_pending',
  'paid',
  'closed',
] as const;
export type PurchaseOrderStatus = (typeof PO_STATUSES)[number];

export const AI_RISKS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type AiRisk = (typeof AI_RISKS)[number];

export const AI_RECOMMENDATIONS = ['APPROVE', 'MANUAL_REVIEW', 'REJECT'] as const;
export type AiRecommendation = (typeof AI_RECOMMENDATIONS)[number];

export interface PurchaseOrderItem {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  taxAmount: number;
  discount: number;
  total: number;
}

export interface AiDifference {
  field: string;
  purchaseOrder: unknown;
  bill: unknown;
  difference: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AiTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AiVerification {
  matchPercentage: number;
  // 3-way match scores (Gemini compares Quotation + PO + Bill simultaneously)
  quotationMatch?: number;
  purchaseOrderMatch?: number;
  risk: AiRisk;
  recommendation: AiRecommendation;
  confidence: number;
  summary: string;
  differences: AiDifference[];
  ruleEngineScore: number;
  verifiedAt: string;
  // v2 metadata fields (present when Gemini ran — absent for legacy/rule-engine-only records)
  executionTimeMs?: number;
  promptVersion?: string;
  modelVersion?: string;
  tokenUsage?: AiTokenUsage;
  aiProvider?: 'gemini' | 'rule_engine_only';
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  poDate: string;
  quotationId: string;
  quotationCode: string;
  vendorId: string;
  vendorName: string;
  vendorGst: string;
  vendorAddress: string;
  departmentId: string;
  departmentName: string;
  createdById: string;
  createdByName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  totalGst: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  terms?: string;
  notes?: string;
  status: PurchaseOrderStatus;
  billId?: string;
  billCode?: string;
  billStatus?: string;
  billInvoiceAmount?: number;
  aiVerification?: AiVerification;
  // Phase 7 — set only when this PO was generated directly from a vendor_finalized
  // Requirement rather than picked from an Approved Quotation. Absent for every PO created
  // via the original flow.
  requirementId?: string;
  requirementNumber?: string;
  // Phase 8 — set once a Goods Receipt has been recorded against this PO. `goodsReceiptId`
  // absent means "not recorded yet" — mandatory before a Bill can be created only when
  // `requirementId` is also set (see docs/PHASE8_GOODS_RECEIPT.md).
  goodsReceiptId?: string;
  grnNumber?: string;
  goodsReceiptDate?: string;
  goodsReceiptCondition?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderItem {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  taxAmount: number;
  discount: number;
  total: number;
}

// Phase 7 — a PO originates from EITHER an Approved Quotation OR a vendor_finalized
// Requirement; exactly one of the two ids must be provided (enforced server-side).
export interface CreatePurchaseOrderRequest {
  quotationId?: string;
  requirementId?: string;
  items: CreatePurchaseOrderItem[];
  terms?: string;
  notes?: string;
}

export interface EmailPurchaseOrderResult {
  sent: boolean;
  reason?: string;
  recipientEmail: string;
}

export interface PurchaseOrderStats {
  generated: number;
  billUploaded: number;
  aiVerificationPending: number;
  aiVerified: number;
  accountsVerified: number;
  paymentPending: number;
  paid: number;
  closed: number;
  total: number;
  // POs waiting on a next action, not a status value — see purchaseOrder.service.ts's getStats.
  pendingGoodsReceipt: number;
  pendingBill: number;
}

export interface AuditLog {
  id: string;
  purchaseOrderId: string;
  purchaseOrderNumber?: string;
  billId: string;
  billCode?: string;
  quotationId: string;
  aiRecommendation: AiRecommendation;
  aiConfidence: number;
  matchPercentage: number;
  quotationMatch?: number;
  purchaseOrderMatch?: number;
  risk: AiRisk;
  differenceCount: number;
  differences: AiDifference[];
  // Director Financial Approval snapshot
  directorFinancialDecision?: string;
  directorFinancialBy?: string;
  directorFinancialRemarks?: string;
  directorFinancialAt?: string;
  accountsDecision: 'verified' | 'correction_requested' | 'rejected';
  reason?: string;
  decidedById: string;
  decidedByName: string;
  decidedByRole: string;
  decidedAt: string;
  createdAt: string;
}
