import { baseApi } from '@/store/baseApi';
import type { BillReview } from '@/features/director/types';

export const directorApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getBillReview: builder.query<BillReview, string>({
      query: (billId) => ({ url: `/director/bills/${billId}/review`, method: 'GET' }),
      providesTags: (_result, _error, billId) => [{ type: 'Bill' as const, id: `REVIEW-${billId}` }],
    }),
  }),
});

export const { useGetBillReviewQuery } = directorApi;
