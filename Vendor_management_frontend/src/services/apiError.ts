import { isAxiosError, type AxiosError } from 'axios';

export interface NormalizedApiError {
  status: number | null;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;

    if (axiosError.response) {
      const body = axiosError.response.data;
      return {
        status: axiosError.response.status,
        message: body?.message ?? 'Something went wrong. Please try again.',
        code: body?.code,
        fieldErrors: body?.errors,
      };
    }

    if (axiosError.request) {
      return {
        status: null,
        message: 'Unable to reach the server. Check your network connection.',
        code: 'NETWORK_ERROR',
      };
    }
  }

  if (error instanceof Error) {
    return { status: null, message: error.message };
  }

  return { status: null, message: 'An unexpected error occurred.' };
}
