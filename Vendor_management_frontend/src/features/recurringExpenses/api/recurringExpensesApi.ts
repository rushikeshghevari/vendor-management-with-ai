import { baseApi } from '@/store/baseApi';
import type { Bill } from '@/features/bills/types';
import type { RecurringExpense, RecurringFrequency, RecurringMode, ReimbursementBankDetails } from '@/features/recurringExpenses/types';

interface RawRef {
  _id: string;
  name?: string;
  code?: string;
  email?: string;
}

interface RawRecurringExpense {
  _id: string;
  title: string;
  mode: RecurringMode;
  department: RawRef | string;
  vendor?: RawRef | string;
  reimbursedTo?: RawRef | string;
  reimbursementBankDetails?: ReimbursementBankDetails;
  frequency: RecurringFrequency;
  baselineAmount: number;
  thresholdPercent: number;
  nextDueDate: string;
  isActive: boolean;
  createdBy: RawRef | string;
  createdAt: string;
  updatedAt: string;
}

function refId(ref: RawRef | string | undefined): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'object' ? ref._id : ref;
}

function refName(ref: RawRef | string | undefined): string | undefined {
  if (!ref || typeof ref !== 'object') return undefined;
  return ref.name;
}

function toRecurringExpense(raw: RawRecurringExpense): RecurringExpense {
  const department = raw.department;
  const isDeptPopulated = typeof department === 'object' && department !== null;
  const createdBy = raw.createdBy;
  const isCreatedByPopulated = typeof createdBy === 'object' && createdBy !== null;

  return {
    id: raw._id,
    title: raw.title,
    mode: raw.mode,
    departmentId: isDeptPopulated ? department._id : department,
    departmentName: isDeptPopulated ? (department.name ?? '') : '',
    vendorId: refId(raw.vendor),
    vendorName: refName(raw.vendor),
    reimbursedToId: refId(raw.reimbursedTo),
    reimbursedToName: refName(raw.reimbursedTo),
    reimbursementBankDetails: raw.reimbursementBankDetails,
    frequency: raw.frequency,
    baselineAmount: raw.baselineAmount,
    thresholdPercent: raw.thresholdPercent,
    nextDueDate: raw.nextDueDate,
    isActive: raw.isActive,
    createdById: isCreatedByPopulated ? createdBy._id : createdBy,
    createdByName: isCreatedByPopulated ? (createdBy.name ?? '') : '',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface CreateRecurringExpenseInput {
  title: string;
  mode: RecurringMode;
  vendor?: string;
  reimbursedTo?: string;
  reimbursementBankDetails?: ReimbursementBankDetails;
  frequency: RecurringFrequency;
  baselineAmount: number;
  thresholdPercent?: number;
  nextDueDate: string;
}

export interface GenerateRecurringCycleInput {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxableAmount?: number;
  gstAmount?: number;
  paymentTerms?: string;
  remarks?: string;
}

interface RawBillForRecurring {
  _id: string;
}

export const recurringExpensesApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getRecurringExpenses: builder.query<RecurringExpense[], { isActive?: boolean } | void>({
      query: (params) => ({ url: '/recurring-expenses', method: 'GET', params: { limit: 100, ...params } }),
      transformResponse: (raw: RawRecurringExpense[]) => raw.map(toRecurringExpense),
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: 'RecurringExpense' as const, id: item.id })),
        { type: 'RecurringExpense' as const, id: 'LIST' },
      ],
    }),

    getRecurringExpenseById: builder.query<RecurringExpense, string>({
      query: (id) => ({ url: `/recurring-expenses/${id}`, method: 'GET' }),
      transformResponse: (raw: RawRecurringExpense) => toRecurringExpense(raw),
      providesTags: (_result, _error, id) => [{ type: 'RecurringExpense', id }],
    }),

    createRecurringExpense: builder.mutation<RecurringExpense, CreateRecurringExpenseInput>({
      query: (body) => ({ url: '/recurring-expenses', method: 'POST', data: body }),
      transformResponse: (raw: RawRecurringExpense) => toRecurringExpense(raw),
      invalidatesTags: [{ type: 'RecurringExpense', id: 'LIST' }],
    }),

    deactivateRecurringExpense: builder.mutation<RecurringExpense, string>({
      query: (id) => ({ url: `/recurring-expenses/${id}`, method: 'PATCH', data: { isActive: false } }),
      transformResponse: (raw: RawRecurringExpense) => toRecurringExpense(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'RecurringExpense', id },
        { type: 'RecurringExpense', id: 'LIST' },
      ],
    }),

    // Returns the newly created draft Bill's id — the caller navigates to the existing
    // EditBill screen with it to attach the real invoice/receipt and submit.
    generateRecurringCycle: builder.mutation<Bill, { id: string; body: GenerateRecurringCycleInput }>({
      query: ({ id, body }) => ({ url: `/recurring-expenses/${id}/generate-cycle`, method: 'POST', data: body }),
      transformResponse: (raw: RawBillForRecurring) => ({ id: raw._id }) as Bill,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'RecurringExpense', id },
        { type: 'RecurringExpense', id: 'LIST' },
        { type: 'Bill', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetRecurringExpensesQuery,
  useGetRecurringExpenseByIdQuery,
  useCreateRecurringExpenseMutation,
  useDeactivateRecurringExpenseMutation,
  useGenerateRecurringCycleMutation,
} = recurringExpensesApi;
