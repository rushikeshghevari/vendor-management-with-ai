import { baseApi } from '@/store/baseApi';
import type {
  ApprovalRoute,
  CeoQuotationStats,
  DirectorApproval,
  DirectorDecision,
  DirectorQuotationStats,
  LinkedBillSummary,
  LinkedPurchaseOrderSummary,
  Quotation,
  QuotationAttachmentVersion,
  QuotationCurrency,
  QuotationOcr,
  QuotationPdfVersion,
  QuotationPriority,
  QuotationStatus,
  RequirementQuotationSummary,
  TemporaryVendorInfo,
} from '@/features/quotations/types';
import type { Paged, PaginationMeta } from '@/types/pagination';

interface RawRef {
  _id: string;
  name: string;
  code?: string;
  email?: string;
  status?: string;
}

interface RawLinkedPo {
  _id: string;
  poNumber: string;
  grandTotal: number;
  status: string;
  createdBy?: { name?: string } | string;
}

interface RawLinkedBill {
  _id: string;
  billCode: string;
  status: string;
  invoiceAmount: number;
  uploadedByName?: string;
  uploadedByRole?: string;
}

interface RawDirectorApproval {
  directorId: string;
  directorName: string;
  decision: DirectorApproval['decision'];
  remarks?: string;
  decidedAt: string | null;
}

export interface RawQuotation {
  _id: string;
  quotationCode: string;
  vendor: RawRef | string;
  requirement?: { _id: string; requirementNumber: string; title: string; requiredDate: string } | string | null;
  temporaryVendor?: TemporaryVendorInfo;
  department: RawRef | string;
  createdBy: RawRef | string;
  submittedBy?: RawRef | string;
  linkedPurchaseOrder?: RawLinkedPo | null;
  linkedBill?: RawLinkedBill | null;
  quotationDate: string;
  requiredDate: string;
  amount: number;
  gst: number;
  currency: QuotationCurrency;
  paymentTerms: string;
  deliveryTerms: string;
  creditPeriod: number;
  advanceAmount?: number;
  expectedDeliveryDate?: string;
  expectedPODate?: string;
  priority: QuotationPriority;
  description?: string;
  pdfFiles: QuotationPdfVersion[];
  attachments?: QuotationAttachmentVersion[];
  ocr?: QuotationOcr;
  remarks?: string;
  directorRemarks?: string;
  directorApprovals?: RawDirectorApproval[];
  approvalRoute?: ApprovalRoute;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}

function toLinkedPurchaseOrder(raw?: RawLinkedPo | null): LinkedPurchaseOrderSummary | null {
  if (!raw) return null;
  const createdBy = raw.createdBy;
  return {
    id: raw._id,
    poNumber: raw.poNumber,
    grandTotal: raw.grandTotal,
    status: raw.status,
    createdByName: typeof createdBy === 'object' && createdBy !== null ? createdBy.name : undefined,
  };
}

function toLinkedBill(raw?: RawLinkedBill | null): LinkedBillSummary | null {
  if (!raw) return null;
  return {
    id: raw._id,
    billCode: raw.billCode,
    status: raw.status,
    invoiceAmount: raw.invoiceAmount,
    uploadedByName: raw.uploadedByName,
    uploadedByRole: raw.uploadedByRole,
  };
}

export function toQuotation(raw: RawQuotation): Quotation {
  const vendor = raw.vendor;
  const department = raw.department;
  const createdBy = raw.createdBy;
  const submittedBy = raw.submittedBy;
  const requirement = raw.requirement;
  const isVendorPopulated = typeof vendor === 'object' && vendor !== null;
  const isDeptPopulated = typeof department === 'object' && department !== null;
  const isCreatedByPopulated = typeof createdBy === 'object' && createdBy !== null;
  const isSubmittedByPopulated = typeof submittedBy === 'object' && submittedBy !== null;
  const isRequirementPopulated = typeof requirement === 'object' && requirement !== null;

  const requirementSummary: RequirementQuotationSummary | null = isRequirementPopulated
    ? {
        id: requirement._id,
        requirementNumber: requirement.requirementNumber,
        title: requirement.title,
        requiredDate: requirement.requiredDate,
      }
    : null;

  return {
    id: raw._id,
    quotationCode: raw.quotationCode,
    vendorId: isVendorPopulated ? vendor._id : (typeof vendor === 'string' ? vendor : undefined),
    vendorName: raw.temporaryVendor?.name ?? (isVendorPopulated ? vendor.name : ''),
    vendorCode: isVendorPopulated ? (vendor.code ?? '') : '',
    temporaryVendor: raw.temporaryVendor,
    requirement: requirementSummary,
    departmentId: isDeptPopulated ? department._id : department,
    departmentName: isDeptPopulated ? department.name : '',
    createdById: isCreatedByPopulated ? createdBy._id : createdBy,
    createdByName: isCreatedByPopulated ? createdBy.name : '',
    submittedByName: isSubmittedByPopulated ? submittedBy.name : (isCreatedByPopulated ? createdBy.name : undefined),
    linkedPurchaseOrder: toLinkedPurchaseOrder(raw.linkedPurchaseOrder),
    linkedBill: toLinkedBill(raw.linkedBill),
    quotationDate: raw.quotationDate,
    requiredDate: raw.requiredDate,
    amount: raw.amount,
    gst: raw.gst,
    currency: raw.currency,
    paymentTerms: raw.paymentTerms,
    deliveryTerms: raw.deliveryTerms,
    creditPeriod: raw.creditPeriod,
    advanceAmount: raw.advanceAmount,
    expectedDeliveryDate: raw.expectedDeliveryDate,
    expectedPODate: raw.expectedPODate,
    priority: raw.priority,
    description: raw.description,
    pdfFiles: raw.pdfFiles ?? [],
    attachments: raw.attachments ?? [],
    ocr: raw.ocr,
    remarks: raw.remarks,
    directorRemarks: raw.directorRemarks,
    directorApprovals: raw.directorApprovals ?? [],
    // submit/resubmit's raw response doesn't carry the roster/route enrichment (only
    // list/getById/decide do) — harmless placeholder, overwritten by the refetch those
    // mutations already trigger via invalidatesTags.
    approvalRoute: raw.approvalRoute ?? 'directors',
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface QuotationFormInput {
  vendor: string;
  quotationDate: string;
  requiredDate: string;
  amount: number;
  gst: number;
  currency: QuotationCurrency;
  paymentTerms: string;
  deliveryTerms: string;
  creditPeriod: number;
  priority: QuotationPriority;
  description?: string;
  remarks?: string;
}

export interface RequirementQuotationInput {
  temporaryVendor: TemporaryVendorInfo;
  quotationDate: string;
  amount: number;
  gst: number;
  // Omitted entirely by the Add Quotation form — always INR for this workflow, and the
  // backend already defaults to 'INR' when it's left out (see createRequirementQuotationSchema).
  currency?: QuotationCurrency;
  paymentTerms: string;
  deliveryTerms: string;
  creditPeriod: number;
  // How much of `amount` the vendor wants paid before the PO/goods — omitted/0 means nothing
  // upfront, equal to `amount` means 100% in advance. The rest is due per `creditPeriod`.
  advanceAmount?: number;
  // The vendor's own promised delivery date for this quotation (ISO date string).
  expectedDeliveryDate?: string;
  // When the department expects to raise the PO — the real deadline for advanceAmount above.
  expectedPODate?: string;
  priority: QuotationPriority;
  description?: string;
  remarks?: string;
}

export interface QuotationListParams {
  requirement?: string;
}

export interface QuotationPageParams {
  page: number;
  limit: number;
  status?: QuotationStatus;
  search?: string;
}

export const quotationsApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getQuotations: builder.query<Quotation[], QuotationListParams | void>({
      query: (params) => ({ url: '/quotations', method: 'GET', params: { limit: 100, ...params } }),
      transformResponse: (raw: RawQuotation[]) => raw.map(toQuotation),
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: 'Quotation' as const, id: item.id })),
        { type: 'Quotation' as const, id: 'LIST' },
      ],
    }),

    // Real server-side pagination/filter/search — used by QuotationListScreen and by dashboard
    // KPI cards that need an accurate total (not `.length` over the capped-at-100 `getQuotations`
    // above, which silently under-counts past 100 records).
    getQuotationsPage: builder.query<Paged<Quotation>, QuotationPageParams>({
      query: (params) => ({ url: '/quotations', method: 'GET', params }),
      transformResponse: (raw: RawQuotation[], meta): Paged<Quotation> => ({
        items: raw.map(toQuotation),
        meta: meta as PaginationMeta,
      }),
      providesTags: (result) => [
        ...(result?.items ?? []).map((item) => ({ type: 'Quotation' as const, id: item.id })),
        { type: 'Quotation' as const, id: 'LIST' },
      ],
    }),

    // Single-quotation fetch — carries linkedPurchaseOrder/linkedBill/submittedBy that the
    // list endpoint doesn't enrich (would be an N+1 lookup per row at list scale). Used by
    // the approval screen instead of the old list+find pattern for those extra fields.
    getQuotationById: builder.query<Quotation, string>({
      query: (id) => ({ url: `/quotations/${id}`, method: 'GET' }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      providesTags: (_result, _error, id) => [{ type: 'Quotation', id }],
    }),

    getDirectorQuotationStats: builder.query<DirectorQuotationStats, void>({
      query: () => ({ url: '/quotations/stats/director', method: 'GET' }),
      providesTags: [{ type: 'Quotation', id: 'DIRECTOR_STATS' }],
    }),

    getCeoQuotationStats: builder.query<CeoQuotationStats, void>({
      query: () => ({ url: '/quotations/stats/ceo', method: 'GET' }),
      providesTags: [{ type: 'Quotation', id: 'CEO_STATS' }],
    }),

    getSuperAdminQuotationStats: builder.query<{ total: number; pending: number; approved: number }, void>({
      query: () => ({ url: '/quotations/stats/super-admin', method: 'GET' }),
      providesTags: [{ type: 'Quotation', id: 'SUPER_ADMIN_STATS' }],
    }),

    // Every Director acts independently — see quotation.service.ts `decide()`. This never
    // requires every Director to approve; it just appends/updates this Director's own
    // entry in `directorApprovals` without touching another Director's record.
    decideQuotation: builder.mutation<Quotation, { id: string; decision: DirectorDecision; remarks?: string }>({
      query: ({ id, decision, remarks }) => ({ url: `/quotations/${id}/decision`, method: 'PATCH', data: { decision, remarks } }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'DIRECTOR_STATS' },
        { type: 'Quotation', id: 'CEO_STATS' },
      ],
    }),

    createQuotation: builder.mutation<Quotation, QuotationFormInput>({
      query: (body) => ({ url: '/quotations', method: 'POST', data: body }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: [{ type: 'Quotation', id: 'LIST' }],
    }),

    updateQuotation: builder.mutation<Quotation, { id: string; body: Partial<QuotationFormInput> }>({
      query: ({ id, body }) => ({ url: `/quotations/${id}`, method: 'PATCH', data: body }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),

    // Submitting/resubmitting notifies whichever role the amount routes to (CEO or both
    // Directors), which changes that role's dashboard counts — both stats tags invalidate
    // unconditionally since the route can change live (see resolveApprovalRoute) and the
    // mobile client doesn't independently know which one applies.
    submitQuotation: builder.mutation<Quotation, string>({
      query: (id) => ({ url: `/quotations/${id}/submit`, method: 'PATCH' }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'DIRECTOR_STATS' },
        { type: 'Quotation', id: 'CEO_STATS' },
      ],
    }),

    resubmitQuotation: builder.mutation<Quotation, string>({
      query: (id) => ({ url: `/quotations/${id}/resubmit`, method: 'PATCH' }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'DIRECTOR_STATS' },
        { type: 'Quotation', id: 'CEO_STATS' },
      ],
    }),

    deleteQuotation: builder.mutation<void, string>({
      query: (id) => ({ url: `/quotations/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),

    // FormData flows through BaseQuery's own multipart handling — still a normal
    // RTK Query mutation, never a manual axios call outside the RTK Query cache.
    uploadQuotationPdf: builder.mutation<Quotation, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({ url: `/quotations/${id}/pdf`, method: 'POST', data: formData }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),

    getRequirementQuotations: builder.query<Quotation[], string>({
      query: (requirementId) => ({ url: `/requirements/${requirementId}/quotations`, method: 'GET', params: { limit: 100 } }),
      transformResponse: (raw: RawQuotation[]) => raw.map(toQuotation),
      providesTags: (result, _error, requirementId) => [
        ...(result ?? []).map((item) => ({ type: 'Quotation' as const, id: item.id })),
        { type: 'Quotation' as const, id: `REQ:${requirementId}` },
      ],
    }),

    createRequirementQuotation: builder.mutation<Quotation, { requirementId: string; body: RequirementQuotationInput }>({
      query: ({ requirementId, body }) => ({ url: `/requirements/${requirementId}/quotations`, method: 'POST', data: body }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: (_result, _error, { requirementId }) => [
        { type: 'Quotation', id: `REQ:${requirementId}` },
        { type: 'Requirement', id: requirementId },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),

    uploadRequirementQuotationAttachment: builder.mutation<Quotation, { requirementId: string; quotationId: string; formData: FormData }>({
      query: ({ requirementId, quotationId, formData }) => ({
        url: `/requirements/${requirementId}/quotations/${quotationId}/attachments`,
        method: 'POST',
        data: formData,
      }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: (_result, _error, { requirementId, quotationId }) => [
        { type: 'Quotation', id: quotationId },
        { type: 'Quotation', id: `REQ:${requirementId}` },
      ],
    }),

    // Phase 3 — re-runs OCR against the quotation's latest attachment. Response reflects
    // `ocr.status: 'processing'` immediately; screens poll getQuotationById for the result.
    retryQuotationOcr: builder.mutation<Quotation, { requirementId: string; quotationId: string }>({
      query: ({ requirementId, quotationId }) => ({
        url: `/requirements/${requirementId}/quotations/${quotationId}/ocr/retry`,
        method: 'POST',
      }),
      transformResponse: (raw: RawQuotation) => toQuotation(raw),
      invalidatesTags: (_result, _error, { quotationId }) => [{ type: 'Quotation', id: quotationId }],
    }),
  }),
});

export const {
  useGetQuotationsQuery,
  useGetQuotationsPageQuery,
  useGetQuotationByIdQuery,
  useGetDirectorQuotationStatsQuery,
  useGetCeoQuotationStatsQuery,
  useGetSuperAdminQuotationStatsQuery,
  useDecideQuotationMutation,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useSubmitQuotationMutation,
  useResubmitQuotationMutation,
  useDeleteQuotationMutation,
  useUploadQuotationPdfMutation,
  useGetRequirementQuotationsQuery,
  useCreateRequirementQuotationMutation,
  useUploadRequirementQuotationAttachmentMutation,
  useRetryQuotationOcrMutation,
} = quotationsApi;
