export const QUOTATION_STATUSES = [
  'draft',
  'submitted',
  'negotiation',
  'resubmitted',
  'approved',
  'rejected',
  'billed',
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type QuotationPriority = (typeof QUOTATION_PRIORITIES)[number];

export const QUOTATION_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type QuotationCurrency = (typeof QUOTATION_CURRENCIES)[number];

export interface QuotationPdfVersion {
  version: number;
  fileName: string;
  url: string;
  uploadedAt: string;
}

export interface QuotationAttachmentVersion {
  version: number;
  fileName: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
}

export interface TemporaryVendorInfo {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface RequirementQuotationSummary {
  id: string;
  requirementNumber: string;
  title: string;
  requiredDate: string;
}

export interface DirectorQuotationStats {
  pending: number;
  negotiation: number;
  resubmitted: number;
  approvedToday: number;
  rejectedToday: number;
}

export interface CeoQuotationStats {
  pendingApprovals: number;
  approvedToday: number;
}

export const APPROVAL_ROUTES = ['ceo', 'directors'] as const;
export type ApprovalRoute = (typeof APPROVAL_ROUTES)[number];

export const DIRECTOR_DECISIONS = ['approved', 'negotiation', 'rejected'] as const;
export type DirectorDecision = (typeof DIRECTOR_DECISIONS)[number];

export type DirectorApprovalStatus = DirectorDecision | 'pending';

export interface DirectorApproval {
  directorId: string;
  directorName: string;
  decision: DirectorApprovalStatus;
  remarks?: string;
  decidedAt: string | null;
}

export interface LinkedPurchaseOrderSummary {
  id: string;
  poNumber: string;
  grandTotal: number;
  status: string;
  createdByName?: string;
}

export interface LinkedBillSummary {
  id: string;
  billCode: string;
  status: string;
  invoiceAmount: number;
  uploadedByName?: string;
  uploadedByRole?: string;
}

export const OCR_STATUSES = ['not_started', 'processing', 'completed', 'failed'] as const;
export type OcrStatus = (typeof OCR_STATUSES)[number];

export interface QuotationOcrItem {
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  amount?: number;
}

export interface QuotationOcrStructuredData {
  vendorName?: string;
  quotationNumber?: string;
  quotationDate?: string;
  currency?: string;
  subtotal?: number;
  gst?: number;
  discount?: number;
  grandTotal?: number;
  items: QuotationOcrItem[];
}

export interface QuotationOcr {
  status: OcrStatus;
  attachmentVersion?: number;
  provider?: string;
  startedAt?: string;
  completedAt?: string;
  confidence?: number;
  extractedText?: string;
  structuredData?: QuotationOcrStructuredData;
  error?: string;
}

export interface Quotation {
  id: string;
  quotationCode: string;
  vendorId?: string;
  vendorName: string;
  vendorCode: string;
  temporaryVendor?: TemporaryVendorInfo;
  requirement?: RequirementQuotationSummary | null;
  departmentId: string;
  departmentName: string;
  createdById: string;
  createdByName: string;
  submittedByName?: string;
  linkedPurchaseOrder?: LinkedPurchaseOrderSummary | null;
  linkedBill?: LinkedBillSummary | null;
  quotationDate: string;
  requiredDate: string;
  amount: number;
  gst: number;
  currency: QuotationCurrency;
  paymentTerms: string;
  deliveryTerms: string;
  creditPeriod: number;
  advanceAmount?: number;
  expectedDeliveryDate?: string;
  expectedPODate?: string;
  priority: QuotationPriority;
  description?: string;
  pdfFiles: QuotationPdfVersion[];
  attachments: QuotationAttachmentVersion[];
  ocr?: QuotationOcr;
  remarks?: string;
  directorRemarks?: string;
  directorApprovals: DirectorApproval[];
  approvalRoute: ApprovalRoute;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}
