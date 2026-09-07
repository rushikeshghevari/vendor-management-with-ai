export type AiAuditRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type AiAuditRecommendation = 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';

export interface AiAuditLogEntry {
  id: string;
  purchaseOrderId?: string;
  billId?: string;
  triggeredByRole: string;
  executionTimeMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  matchPercentage: number;
  risk: AiAuditRisk;
  recommendation: AiAuditRecommendation;
  confidence: number;
  differenceCount: number;
  modelVersion: string;
  promptVersion: string;
  success: boolean;
  errorMessage?: string;
  usedFallback: boolean;
  createdAt: string;
}
