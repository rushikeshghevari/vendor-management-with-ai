import { baseApi } from '@/store/baseApi';
import type {
  AccountsBillStats,
  Bill,
  BillDecision,
  BillFileVersion,
  BillStatus,
  BillTimeline,
  DirectorBillStats,
  DirectorFinancialDecision,
  PaymentBillStats,
} from '@/features/bills/types';
import type { ReimbursementBankDetails } from '@/features/recurringExpenses/types';
import type { Paged, PaginationMeta } from '@/types/pagination';

interface RawRef {
  _id: string;
  name?: string;
  code?: string;
  quotationCode?: string;
  poNumber?: string;
  grandTotal?: number;
  email?: string;
  status?: string;
  requirementNumber?: string;
  title?: string;
  grnNumber?: string;
  receivedDate?: string;
  overallCondition?: string;
}

interface RawDecisionRecord {
  decision: BillStatus;
  remarks?: string;
  decidedBy: RawRef | string;
  decidedAt: string;
}

interface RawBill {
  _id: string;
  billCode: string;
  quotation: RawRef | string;
  purchaseOrder?: RawRef | string;
  requirement?: RawRef | string;
  requirementNumber?: string;
  goodsReceipt?: RawRef | string;
  grnNumber?: string;
  vendor?: RawRef | string;
  recurringExpense?:
    | (RawRef & { title?: string; mode?: string; thresholdPercent?: number; baselineAmount?: number; reimbursementBankDetails?: ReimbursementBankDetails })
    | string;
  reimbursedTo?: RawRef | string;
  department: RawRef | string;
  createdBy: RawRef | string;
  uploadedByName?: string;
  uploadedByRole?: string;
  aiMatchPercentage?: number;
  aiRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  aiRecommendation?: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
  aiVerifiedAt?: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxableAmount: number;
  gstAmount: number;
  paymentTerms: string;
  creditPeriod?: number;
  dueDate: string;
  invoiceFiles: BillFileVersion[];
  supportingDocuments: BillFileVersion[];
  remarks?: string;
  accountsRemarks?: string;
  verifiedBy?: RawRef | string;
  verifiedAt?: string;
  decisionHistory?: RawDecisionRecord[];
  // Director Financial Approval (Approval 2 — after 3-Way AI)
  directorFinancialDecision?: DirectorFinancialDecision;
  directorFinancialBy?: RawRef | string;
  directorFinancialAt?: string;
  directorFinancialRemarks?: string;
  status: BillStatus;
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

function toBill(raw: RawBill): Bill {
  const quotation = raw.quotation;
  const purchaseOrder = raw.purchaseOrder;
  const vendor = raw.vendor;
  const department = raw.department;
  const createdBy = raw.createdBy;
  const isQuotationPopulated = typeof quotation === 'object' && quotation !== null;
  const isPoPopulated = typeof purchaseOrder === 'object' && purchaseOrder !== null;
  const requirement = raw.requirement;
  const goodsReceipt = raw.goodsReceipt;
  const isRequirementPopulated = typeof requirement === 'object' && requirement !== null;
  const isGoodsReceiptPopulated = typeof goodsReceipt === 'object' && goodsReceipt !== null;
  const isVendorPopulated = typeof vendor === 'object' && vendor !== null;
  const isDeptPopulated = typeof department === 'object' && department !== null;
  const isCreatedByPopulated = typeof createdBy === 'object' && createdBy !== null;
  const recurringExpense = raw.recurringExpense;
  const isRecurringExpensePopulated = typeof recurringExpense === 'object' && recurringExpense !== null;
  const reimbursedTo = raw.reimbursedTo;

  return {
    id: raw._id,
    billCode: raw.billCode,
    quotationId: isQuotationPopulated ? quotation._id : quotation,
    quotationCode: isQuotationPopulated ? (quotation.quotationCode ?? '') : '',
    purchaseOrderId: purchaseOrder ? (isPoPopulated ? purchaseOrder._id : purchaseOrder) : undefined,
    purchaseOrderNumber: isPoPopulated ? purchaseOrder.poNumber : undefined,
    requirementId: requirement ? (isRequirementPopulated ? requirement._id : requirement) : undefined,
    requirementNumber: (isRequirementPopulated ? requirement.requirementNumber : undefined) ?? raw.requirementNumber,
    goodsReceiptId: goodsReceipt ? (isGoodsReceiptPopulated ? goodsReceipt._id : goodsReceipt) : undefined,
    grnNumber: (isGoodsReceiptPopulated ? goodsReceipt.grnNumber : undefined) ?? raw.grnNumber,
    vendorId: (isVendorPopulated ? vendor._id : vendor) ?? '',
    vendorName: isVendorPopulated ? (vendor.name ?? '') : '',
    vendorCode: isVendorPopulated ? (vendor.code ?? '') : '',
    departmentId: isDeptPopulated ? department._id : department,
    departmentName: isDeptPopulated ? (department.name ?? '') : '',
    createdById: isCreatedByPopulated ? createdBy._id : createdBy,
    createdByName: isCreatedByPopulated ? (createdBy.name ?? '') : '',
    uploadedByName: raw.uploadedByName,
    uploadedByRole: raw.uploadedByRole,
    aiMatchPercentage: raw.aiMatchPercentage,
    aiRisk: raw.aiRisk,
    aiRecommendation: raw.aiRecommendation,
    aiVerifiedAt: raw.aiVerifiedAt,
    invoiceNumber: raw.invoiceNumber,
    invoiceDate: raw.invoiceDate,
    invoiceAmount: raw.invoiceAmount,
    taxableAmount: raw.taxableAmount,
    gstAmount: raw.gstAmount,
    paymentTerms: raw.paymentTerms,
    creditPeriod: raw.creditPeriod,
    dueDate: raw.dueDate,
    invoiceFiles: raw.invoiceFiles ?? [],
    supportingDocuments: raw.supportingDocuments ?? [],
    remarks: raw.remarks,
    accountsRemarks: raw.accountsRemarks,
    verifiedById: raw.verifiedBy ? refId(raw.verifiedBy) : undefined,
    verifiedByName: raw.verifiedBy ? refName(raw.verifiedBy) : undefined,
    verifiedAt: raw.verifiedAt,
    decisionHistory: (raw.decisionHistory ?? []).map((entry) => ({
      decision: entry.decision,
      remarks: entry.remarks,
      decidedById: refId(entry.decidedBy),
      decidedByName: refName(entry.decidedBy),
      decidedAt: entry.decidedAt,
    })),
    directorFinancialDecision: raw.directorFinancialDecision,
    directorFinancialBy: raw.directorFinancialBy ? refId(raw.directorFinancialBy) : undefined,
    directorFinancialAt: raw.directorFinancialAt,
    directorFinancialRemarks: raw.directorFinancialRemarks,
    status: raw.status,
    recurringExpenseId: recurringExpense ? refId(recurringExpense) : undefined,
    recurringExpenseTitle: isRecurringExpensePopulated ? (recurringExpense.title ?? '') : undefined,
    recurringExpenseMode: isRecurringExpensePopulated ? (recurringExpense.mode as 'vendor_bill' | 'reimbursement' | undefined) : undefined,
    recurringExpenseThresholdPercent: isRecurringExpensePopulated ? recurringExpense.thresholdPercent : undefined,
    recurringExpenseBaselineAmount: isRecurringExpensePopulated ? recurringExpense.baselineAmount : undefined,
    reimbursementBankDetails: isRecurringExpensePopulated ? recurringExpense.reimbursementBankDetails : undefined,
    reimbursedToName: reimbursedTo ? refName(reimbursedTo) : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface BillFormInput {
  quotation: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxableAmount: number;
  gstAmount: number;
  paymentTerms: string;
  creditPeriod?: number;
  dueDate: string;
  remarks?: string;
}

export interface BillListFilters {
  status?: BillStatus;
  vendor?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const billsApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getBills: builder.query<Bill[], BillListFilters | void>({
      query: (filters) => ({ url: '/bills', method: 'GET', params: { limit: 100, ...filters } }),
      transformResponse: (raw: RawBill[]) => raw.map(toBill),
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: 'Bill' as const, id: item.id })),
        { type: 'Bill' as const, id: 'LIST' },
      ],
    }),

    // Real server-side pagination/filter/search — used by BillListScreen/AccountsBillListScreen
    // and by dashboard KPI cards that need an accurate total (not `.length` over the
    // capped-at-100 `getBills` above, which silently under-counts past 100 records). The
    // filter fields already existed on `BillListFilters` (typed for the backend) but were
    // never actually sent by any screen until now.
    getBillsPage: builder.query<Paged<Bill>, BillListFilters & { page: number; limit: number }>({
      query: (params) => ({ url: '/bills', method: 'GET', params }),
      transformResponse: (raw: RawBill[], meta): Paged<Bill> => ({
        items: raw.map(toBill),
        meta: meta as PaginationMeta,
      }),
      providesTags: (result) => [
        ...(result?.items ?? []).map((item) => ({ type: 'Bill' as const, id: item.id })),
        { type: 'Bill' as const, id: 'LIST' },
      ],
    }),

    getBillTimeline: builder.query<BillTimeline, string>({
      query: (id) => ({ url: `/bills/${id}/timeline`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'Bill', id: `TIMELINE-${id}` }],
    }),

    getAccountsBillStats: builder.query<AccountsBillStats, void>({
      query: () => ({ url: '/bills/stats/accounts', method: 'GET' }),
      providesTags: [{ type: 'Bill', id: 'ACCOUNTS_STATS' }],
    }),

    getDirectorBillStats: builder.query<DirectorBillStats, void>({
      query: () => ({ url: '/bills/stats/director', method: 'GET' }),
      providesTags: [{ type: 'Bill', id: 'DIRECTOR_STATS' }],
    }),

    getSuperAdminBillStats: builder.query<{ total: number; pending: number; verified: number }, void>({
      query: () => ({ url: '/bills/stats/super-admin', method: 'GET' }),
      providesTags: [{ type: 'Bill', id: 'SUPER_ADMIN_STATS' }],
    }),

    // Director Financial Approval (Approval 2 — after 3-Way AI, before Accounts).
    decideFinancialApproval: builder.mutation<Bill, { id: string; decision: DirectorFinancialDecision; remarks?: string }>({
      query: ({ id, decision, remarks }) => ({ url: `/bills/${id}/financial-decision`, method: 'PATCH', data: { decision, remarks } }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
        { type: 'Bill', id: 'DIRECTOR_STATS' },
        { type: 'Bill', id: 'ACCOUNTS_STATS' },
      ],
    }),

    // Accounts-only. A "verified" decision also notifies Payment Department and changes
    // both the Bill-based AND the Payment-module dashboards' "Ready for Payment" counts.
    decideBill: builder.mutation<Bill, { id: string; decision: BillDecision; remarks?: string }>({
      query: ({ id, decision, remarks }) => ({ url: `/bills/${id}/decision`, method: 'PATCH', data: { decision, remarks } }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: (_result, _error, { id, decision }) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
        { type: 'Bill', id: 'ACCOUNTS_STATS' },
        ...(decision === 'verified'
          ? [
              { type: 'Bill' as const, id: 'PAYMENT_STATS' },
              { type: 'Payment' as const, id: 'PAYMENT_DEPT_STATS' },
              { type: 'Payment' as const, id: 'ACCOUNTS_STATS' },
            ]
          : []),
      ],
    }),

    createBill: builder.mutation<Bill, BillFormInput>({
      query: (body) => ({ url: '/bills', method: 'POST', data: body }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: [{ type: 'Bill', id: 'LIST' }, { type: 'Quotation', id: 'LIST' }],
    }),

    updateBill: builder.mutation<Bill, { id: string; body: Partial<Omit<BillFormInput, 'quotation'>> }>({
      query: ({ id, body }) => ({ url: `/bills/${id}`, method: 'PATCH', data: body }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
      ],
    }),

    submitBill: builder.mutation<Bill, string>({
      query: (id) => ({ url: `/bills/${id}/submit`, method: 'PATCH' }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
        { type: 'Bill', id: 'DIRECTOR_STATS' },
        { type: 'Bill', id: 'ACCOUNTS_STATS' },
      ],
    }),

    resubmitBill: builder.mutation<Bill, string>({
      query: (id) => ({ url: `/bills/${id}/resubmit`, method: 'PATCH' }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
        { type: 'Bill', id: 'DIRECTOR_STATS' },
        { type: 'Bill', id: 'ACCOUNTS_STATS' },
      ],
    }),

    // Recovery action for a Bill stuck at "submitted" because no PO was linked when AI ran —
    // Director / Super Admin only (see backend billService.retryAiVerification).
    retryAiVerification: builder.mutation<Bill, string>({
      query: (id) => ({ url: `/bills/${id}/retry-ai-verification`, method: 'PATCH' }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
        { type: 'Bill', id: `REVIEW-${id}` },
        { type: 'Bill', id: `TIMELINE-${id}` },
        { type: 'Bill', id: 'DIRECTOR_STATS' },
      ],
    }),

    deleteBill: builder.mutation<void, string>({
      query: (id) => ({ url: `/bills/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),

    uploadBillInvoice: builder.mutation<Bill, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({ url: `/bills/${id}/invoice`, method: 'POST', data: formData }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
      ],
    }),

    uploadBillSupportingDocument: builder.mutation<Bill, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({ url: `/bills/${id}/supporting-documents`, method: 'POST', data: formData }),
      transformResponse: (raw: RawBill) => toBill(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Bill', id },
        { type: 'Bill', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetBillsQuery,
  useGetBillsPageQuery,
  useGetBillTimelineQuery,
  useGetAccountsBillStatsQuery,
  useGetDirectorBillStatsQuery,
  useGetSuperAdminBillStatsQuery,
  useCreateBillMutation,
  useUpdateBillMutation,
  useSubmitBillMutation,
  useResubmitBillMutation,
  useRetryAiVerificationMutation,
  useDecideBillMutation,
  useDecideFinancialApprovalMutation,
  useDeleteBillMutation,
  useUploadBillInvoiceMutation,
  useUploadBillSupportingDocumentMutation,
} = billsApi;
