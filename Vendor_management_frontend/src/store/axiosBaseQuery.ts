import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';

import { apiClient } from '@/services/apiClient';
import { normalizeApiError, type NormalizedApiError } from '@/services/apiError';

type AxiosBaseQueryArgs = Pick<AxiosRequestConfig, 'url' | 'method' | 'data' | 'params'>;

// Every backend response is wrapped as { success, message, data, pagination? }
// (see backend/src/utils/ApiResponse.ts) — unwrap it here once so every RTK Query
// endpoint receives the actual payload directly, instead of the envelope.
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, NormalizedApiError> =>
  async ({ url, method = 'GET', data, params }) => {
    try {
      // FormData (e.g. a PDF upload) must never carry the default 'application/json'
      // Content-Type — let axios/RN compute the multipart boundary on its own.
      const isFormData = data instanceof FormData;
      const result = await apiClient.request<ApiEnvelope<unknown>>({
        url,
        method,
        data,
        params,
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      });
      console.log(`[http] ${method} ${url} → ${result.status}`);
      // `meta` is RTK Query's own side channel (untouched by transformResponse's first arg) —
      // endpoints that need the true total (real server pagination, accurate dashboard counts)
      // read it via `transformResponse: (raw, meta) => ...`; every existing endpoint that only
      // reads the first arg is completely unaffected by this addition.
      return { data: result.data.data, meta: result.data.pagination };
    } catch (error) {
      const normalized = normalizeApiError(error);
      console.error(`[http] ${method} ${url} → ERROR`, JSON.stringify(normalized));
      return { error: normalized };
    }
  };
