import { baseApi } from '@/store/baseApi';
import { apiClient } from '@/services/apiClient';
import { normalizeApiError } from '@/services/apiError';
import type {
  AccountsPaymentStats,
  MyPaymentStats,
  Payment,
  PaymentDeptStats,
  PaymentFailureReason,
  PaymentMethod,
  PaymentStatus,
  SuperAdminPaymentStats,
} from '@/features/payments/types';
import type { ReimbursementBankDetails } from '@/features/recurringExpenses/types';
import type { Paged, PaginationMeta } from '@/types/pagination';

interface RawRef {
  _id: string;
  name?: string;
  billCode?: string;
  quotationCode?: string;
  status?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  requirementNumber?: string;
  grnNumber?: string;
}

interface RawHistoryEntry {
  status: PaymentStatus;
  remarks?: string;
  failureReason?: PaymentFailureReason;
  retryNumber?: number;
  changedBy: RawRef | string;
  changedAt: string;
}

interface RawPayment {
  _id: string;
  paymentCode: string;
  bill: RawRef | string;
  quotation: RawRef | string;
  vendor?: RawRef | string;
  reimbursedTo?: RawRef | string;
  recurringExpense?: (RawRef & { title?: string; reimbursementBankDetails?: ReimbursementBankDetails }) | string;
  department: RawRef | string;
  amount: number;
  gst: number;
  invoiceNumber: string;
  invoiceDate: string;
  paymentMethod?: PaymentMethod;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  utrNumber?: string;
  transactionReference?: string;
  chequeNumber?: string;
  paymentDate?: string;
  remarks?: string;
  status: PaymentStatus;
  retryCount: number;
  history: RawHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

function refId(ref: RawRef | string | undefined): string {
  if (!ref) return '';
  return typeof ref === 'object' ? ref._id : ref;
}

function refName(ref: RawRef | string | undefined): string {
  if (!ref || typeof ref !== 'object') return '';
  return ref.name ?? '';
}

function toPayment(raw: RawPayment): Payment {
  const bill = raw.bill;
  const isBillPopulated = typeof bill === 'object' && bill !== null;

  return {
    id: raw._id,
    paymentCode: raw.paymentCode,
    billId: isBillPopulated ? bill._id : bill,
    billCode: isBillPopulated ? (bill.billCode ?? '') : '',
    billStatus: isBillPopulated ? bill.status : undefined,
    requirementNumber: isBillPopulated ? bill.requirementNumber : undefined,
    grnNumber: isBillPopulated ? bill.grnNumber : undefined,
    quotationId: refId(raw.quotation),
    quotationCode: typeof raw.quotation === 'object' ? (raw.quotation.quotationCode ?? '') : '',
    vendorId: raw.vendor ? refId(raw.vendor) : undefined,
    vendorName: raw.vendor ? refName(raw.vendor) : undefined,
    reimbursedToName: raw.reimbursedTo ? refName(raw.reimbursedTo) : undefined,
    reimbursementBankDetails:
      raw.recurringExpense && typeof raw.recurringExpense === 'object' ? raw.recurringExpense.reimbursementBankDetails : undefined,
    recurringExpenseTitle: raw.recurringExpense && typeof raw.recurringExpense === 'object' ? raw.recurringExpense.title : undefined,
    departmentId: refId(raw.department),
    departmentName: refName(raw.department),
    amount: raw.amount,
    gst: raw.gst,
    invoiceNumber: raw.invoiceNumber,
    invoiceDate: raw.invoiceDate,
    paymentMethod: raw.paymentMethod,
    bankName: raw.bankName,
    accountNumber: raw.accountNumber,
    ifsc: raw.ifsc,
    upiId: raw.upiId,
    utrNumber: raw.utrNumber,
    transactionReference: raw.transactionReference,
    chequeNumber: raw.chequeNumber,
    paymentDate: raw.paymentDate,
    remarks: raw.remarks,
    status: raw.status,
    retryCount: raw.retryCount,
    history: (raw.history ?? []).map((entry) => ({
      status: entry.status,
      remarks: entry.remarks,
      failureReason: entry.failureReason,
      retryNumber: entry.retryNumber,
      changedById: refId(entry.changedBy),
      changedAt: entry.changedAt,
    })),
    verifiedById: isBillPopulated ? bill.verifiedBy : undefined,
    verifiedAt: isBillPopulated ? bill.verifiedAt : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface PaymentListFilters {
  status?: PaymentStatus;
  vendor?: string;
  department?: string;
  paymentMethod?: PaymentMethod;
  search?: string;
}

export const paymentsApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getPayments: builder.query<Payment[], PaymentListFilters | void>({
      query: (filters) => ({ url: '/payments', method: 'GET', params: { limit: 100, ...filters } }),
      transformResponse: (raw: RawPayment[]) => raw.map(toPayment),
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: 'Payment' as const, id: item.id })),
        { type: 'Payment' as const, id: 'LIST' },
      ],
    }),

    // Real server-side pagination/filter/search — used by PaymentListScreen (not `.length`
    // over the capped-at-100 `getPayments` above, which silently under-counts past 100 rows).
    // The filter fields already existed on `PaymentListFilters` (typed for the backend) but
    // were never actually sent by the screen until now.
    getPaymentsPage: builder.query<Paged<Payment>, PaymentListFilters & { page: number; limit: number }>({
      query: (params) => ({ url: '/payments', method: 'GET', params }),
      transformResponse: (raw: RawPayment[], meta): Paged<Payment> => ({
        items: raw.map(toPayment),
        meta: meta as PaginationMeta,
      }),
      providesTags: (result) => [
        ...(result?.items ?? []).map((item) => ({ type: 'Payment' as const, id: item.id })),
        { type: 'Payment' as const, id: 'LIST' },
      ],
    }),

    getPaymentById: builder.query<Payment, string>({
      query: (id) => ({ url: `/payments/${id}`, method: 'GET' }),
      transformResponse: (raw: RawPayment) => toPayment(raw),
      providesTags: (_result, _error, id) => [{ type: 'Payment', id }],
    }),

    getPaymentByQuotation: builder.query<Payment | null, string>({
      // 404 means "no payment created yet for this quotation" — a valid data state, not an
      // error. Using queryFn lets us intercept the 404 before axiosBaseQuery logs it as an
      // error and return null instead of putting the query into isError state.
      queryFn: async (quotationId) => {
        try {
          const res = await apiClient.request<{ success: boolean; message: string; data: RawPayment }>({
            url: `/payments/by-quotation/${quotationId}`,
            method: 'GET',
          });
          return { data: toPayment(res.data.data) };
        } catch (err) {
          const normalized = normalizeApiError(err);
          if (normalized.status === 404) return { data: null };
          return { error: normalized };
        }
      },
      providesTags: (_result, _error, quotationId) => [{ type: 'Payment', id: `QUOTATION_${quotationId}` }],
    }),

    getPaymentDeptStats: builder.query<PaymentDeptStats, void>({
      query: () => ({ url: '/payments/stats/payment-department', method: 'GET' }),
      providesTags: [{ type: 'Payment', id: 'PAYMENT_DEPT_STATS' }],
    }),

    getAccountsPaymentStats: builder.query<AccountsPaymentStats, void>({
      query: () => ({ url: '/payments/stats/accounts', method: 'GET' }),
      providesTags: [{ type: 'Payment', id: 'ACCOUNTS_STATS' }],
    }),

    getSuperAdminPaymentStats: builder.query<SuperAdminPaymentStats, void>({
      query: () => ({ url: '/payments/stats/super-admin', method: 'GET' }),
      providesTags: [{ type: 'Payment', id: 'SUPER_ADMIN_STATS' }],
    }),

    getMyPaymentStats: builder.query<MyPaymentStats, void>({
      query: () => ({ url: '/payments/stats/my-payments', method: 'GET' }),
      providesTags: [{ type: 'Payment', id: 'MY_STATS' }],
    }),

    createPayment: builder.mutation<Payment, { bill: string }>({
      query: (body) => ({ url: '/payments', method: 'POST', data: body }),
      transformResponse: (raw: RawPayment) => toPayment(raw),
      invalidatesTags: [
        { type: 'Payment', id: 'LIST' },
        { type: 'Payment', id: 'PAYMENT_DEPT_STATS' },
        { type: 'Payment', id: 'ACCOUNTS_STATS' },
        { type: 'Payment', id: 'SUPER_ADMIN_STATS' },
        { type: 'Bill', id: 'LIST' },
        { type: 'Bill', id: 'PAYMENT_STATS' },
      ],
    }),

    startProcessing: builder.mutation<
      Payment,
      { id: string; paymentMethod: PaymentMethod; bankName?: string; accountNumber?: string; ifsc?: string; upiId?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/payments/${id}/start-processing`, method: 'PATCH', data: body }),
      transformResponse: (raw: RawPayment) => toPayment(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Payment', id },
        { type: 'Payment', id: 'LIST' },
        { type: 'Payment', id: 'PAYMENT_DEPT_STATS' },
      ],
    }),

    markPaid: builder.mutation<
      Payment,
      { id: string; utrNumber?: string; transactionReference?: string; chequeNumber?: string; paymentDate: string; remarks?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/payments/${id}/mark-paid`, method: 'PATCH', data: body }),
      transformResponse: (raw: RawPayment) => toPayment(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Payment', id },
        { type: 'Payment', id: 'LIST' },
        { type: 'Payment', id: 'PAYMENT_DEPT_STATS' },
        { type: 'Payment', id: 'ACCOUNTS_STATS' },
        { type: 'Bill', id: 'LIST' },
        { type: 'Bill', id: 'PAYMENT_STATS' },
      ],
    }),

    markCompleted: builder.mutation<Payment, string>({
      query: (id) => ({ url: `/payments/${id}/mark-completed`, method: 'PATCH' }),
      transformResponse: (raw: RawPayment) => toPayment(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Payment', id },
        { type: 'Payment', id: 'LIST' },
        { type: 'Payment', id: 'PAYMENT_DEPT_STATS' },
        { type: 'Payment', id: 'ACCOUNTS_STATS' },
        { type: 'Payment', id: 'SUPER_ADMIN_STATS' },
        { type: 'Bill', id: 'LIST' },
        { type: 'Bill', id: 'PAYMENT_STATS' },
      ],
    }),

    markFailed: builder.mutation<Payment, { id: string; failureReason: PaymentFailureReason; remarks?: string }>({
      query: ({ id, ...body }) => ({ url: `/payments/${id}/mark-failed`, method: 'PATCH', data: body }),
      transformResponse: (raw: RawPayment) => toPayment(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Payment', id },
        { type: 'Payment', id: 'LIST' },
        { type: 'Payment', id: 'PAYMENT_DEPT_STATS' },
      ],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useGetPaymentsPageQuery,
  useGetPaymentByIdQuery,
  useGetPaymentByQuotationQuery,
  useGetPaymentDeptStatsQuery,
  useGetAccountsPaymentStatsQuery,
  useGetSuperAdminPaymentStatsQuery,
  useGetMyPaymentStatsQuery,
  useCreatePaymentMutation,
  useStartProcessingMutation,
  useMarkPaidMutation,
  useMarkCompletedMutation,
  useMarkFailedMutation,
} = paymentsApi;
