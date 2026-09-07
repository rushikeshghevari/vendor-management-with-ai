export const COMPARISON_OBSERVATION_TYPES = [
  'lowest_quotation',
  'highest_quotation',
  'missing_documents',
  'suspicious_price_difference',
  'quantity_inconsistency',
  'duplicate_quotation',
  'ocr_confidence_warning',
] as const;
export type ComparisonObservationType = (typeof COMPARISON_OBSERVATION_TYPES)[number];

export type ComparisonObservationSeverity = 'info' | 'warning' | 'critical';

export interface ComparisonQuotationSnapshot {
  quotationId: string;
  quotationCode: string;
  vendorName: string;
  hasAttachment: boolean;
  ocrStatus: string;
  ocrConfidence?: number;
  currency?: string;
  grandTotal?: number;
  grandTotalSource: 'ocr' | 'quotation';
  gstAmount?: number;
  discount?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  deliveryDays?: number;
  quotationDate?: string;
  /** Always undefined today — neither the Quotation nor the OCR schema tracks a validity
   *  period yet. Kept so the UI has a stable place to show it once a future phase adds it. */
  validity?: string;
  itemCount: number;
}

export interface ComparisonItemEntry {
  itemName: string;
  status: 'matched' | 'missing' | 'extra';
  requirementQuantity?: number;
  quotationQuantity?: number;
  quantityMismatch: boolean;
  requirementRate?: number;
  quotationUnitPrice?: number;
  unitPriceDifference?: number;
  requirementAmount?: number;
  quotationAmount?: number;
  amountMismatch: boolean;
}

export interface ComparisonItemComparison {
  quotationId: string;
  quotationCode: string;
  items: ComparisonItemEntry[];
  missingItemCount: number;
  extraItemCount: number;
  quantityMismatchCount: number;
}

export interface ComparisonObservation {
  type: ComparisonObservationType;
  severity: ComparisonObservationSeverity;
  message: string;
  quotationId?: string;
}

export interface ComparisonStatistics {
  totalQuotations: number;
  lowestPrice?: number;
  highestPrice?: number;
  averagePrice?: number;
  costDifference?: number;
  budgetVarianceAmount?: number;
  budgetVariancePercent?: number;
}

export interface ComparisonRecommendation {
  quotationId?: string;
  quotationCode?: string;
  reason: string;
  isAdvisoryOnly: true;
}

export interface Comparison {
  id: string;
  requirementId: string;
  quotations: ComparisonQuotationSnapshot[];
  statistics: ComparisonStatistics;
  itemComparison: ComparisonItemComparison[];
  observations: ComparisonObservation[];
  recommendation: ComparisonRecommendation;
  generatedAt: string;
  generatedBy: string;
}
