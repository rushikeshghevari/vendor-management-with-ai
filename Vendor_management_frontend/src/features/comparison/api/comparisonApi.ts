import { baseApi } from '@/store/baseApi';
import type {
  Comparison,
  ComparisonItemComparison,
  ComparisonItemEntry,
  ComparisonObservation,
  ComparisonQuotationSnapshot,
  ComparisonRecommendation,
  ComparisonStatistics,
} from '@/features/comparison/types';

export interface RawComparison {
  _id: string;
  requirement: string;
  quotations: Array<Omit<ComparisonQuotationSnapshot, 'quotationId'> & { quotation: string }>;
  statistics: ComparisonStatistics;
  itemComparison: Array<Omit<ComparisonItemComparison, 'quotationId' | 'items'> & { quotation: string; items: ComparisonItemEntry[] }>;
  observations: Array<Omit<ComparisonObservation, 'quotationId'> & { quotation?: string }>;
  recommendation: Omit<ComparisonRecommendation, 'quotationId'> & { quotation?: string };
  generatedAt: string;
  generatedBy: string;
}

export function toComparison(raw: RawComparison): Comparison {
  return {
    id: raw._id,
    requirementId: raw.requirement,
    quotations: raw.quotations.map((q) => ({ ...q, quotationId: q.quotation })),
    statistics: raw.statistics,
    itemComparison: raw.itemComparison.map((ic) => ({ ...ic, quotationId: ic.quotation })),
    observations: raw.observations.map((o) => ({ ...o, quotationId: o.quotation })),
    recommendation: { ...raw.recommendation, quotationId: raw.recommendation.quotation },
    generatedAt: raw.generatedAt,
    generatedBy: raw.generatedBy,
  };
}

export const comparisonApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getComparison: builder.query<Comparison, string>({
      query: (requirementId) => ({ url: `/requirements/${requirementId}/comparison`, method: 'GET' }),
      transformResponse: (raw: RawComparison) => toComparison(raw),
      providesTags: (_result, _error, requirementId) => [{ type: 'Comparison', id: requirementId }],
    }),

    generateComparison: builder.mutation<Comparison, string>({
      query: (requirementId) => ({ url: `/requirements/${requirementId}/comparison`, method: 'POST' }),
      transformResponse: (raw: RawComparison) => toComparison(raw),
      invalidatesTags: (_result, _error, requirementId) => [{ type: 'Comparison', id: requirementId }],
    }),
  }),
});

export const { useGetComparisonQuery, useGenerateComparisonMutation } = comparisonApi;
