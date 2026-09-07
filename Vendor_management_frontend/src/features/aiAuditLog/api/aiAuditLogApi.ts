import { baseApi } from '@/store/baseApi';
import type { AiAuditLogEntry, AiAuditRecommendation, AiAuditRisk } from '@/features/aiAuditLog/types';
import type { Paged, PaginationMeta } from '@/types/pagination';

interface RawRef {
  _id: string;
  poNumber?: string;
  billCode?: string;
}

interface RawAiAuditLog {
  _id: string;
  purchaseOrder?: RawRef | string;
  bill?: RawRef | string;
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

function idOf(ref?: RawRef | string): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'object' ? ref._id : ref;
}

function toAiAuditLogEntry(raw: RawAiAuditLog): AiAuditLogEntry {
  return {
    id: raw._id,
    purchaseOrderId: idOf(raw.purchaseOrder),
    billId: idOf(raw.bill),
    triggeredByRole: raw.triggeredByRole,
    executionTimeMs: raw.executionTimeMs,
    inputTokens: raw.inputTokens,
    outputTokens: raw.outputTokens,
    totalTokens: raw.totalTokens,
    matchPercentage: raw.matchPercentage,
    risk: raw.risk,
    recommendation: raw.recommendation,
    confidence: raw.confidence,
    differenceCount: raw.differenceCount,
    modelVersion: raw.modelVersion,
    promptVersion: raw.promptVersion,
    success: raw.success,
    errorMessage: raw.errorMessage,
    usedFallback: raw.usedFallback,
    createdAt: raw.createdAt,
  };
}

export interface AiAuditLogPageParams {
  page: number;
  limit: number;
  success?: boolean;
  usedFallback?: boolean;
  risk?: AiAuditRisk;
}

export const aiAuditLogApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getAiAuditLogsPage: builder.query<Paged<AiAuditLogEntry>, AiAuditLogPageParams>({
      query: ({ success, usedFallback, ...rest }) => ({
        url: '/ai-audit-logs',
        method: 'GET',
        params: {
          ...rest,
          success: success === undefined ? undefined : String(success),
          usedFallback: usedFallback === undefined ? undefined : String(usedFallback),
        },
      }),
      transformResponse: (raw: RawAiAuditLog[], meta): Paged<AiAuditLogEntry> => ({
        items: raw.map(toAiAuditLogEntry),
        meta: meta as PaginationMeta,
      }),
      providesTags: [{ type: 'AuditLog' as const, id: 'AI_LIST' }],
    }),
  }),
});

export const { useGetAiAuditLogsPageQuery } = aiAuditLogApi;
