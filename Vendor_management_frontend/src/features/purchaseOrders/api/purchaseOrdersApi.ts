import { baseApi } from '@/store/baseApi';
import { apiClient } from '@/services/apiClient';
import { normalizeApiError } from '@/services/apiError';
import type {
  AuditLog,
  CreatePurchaseOrderRequest,
  EmailPurchaseOrderResult,
  PurchaseOrder,
  PurchaseOrderStats,
} from '@/features/purchaseOrders/types';

// ── Raw server shape (snake_case + MongoDB _id) ────────────────────────────────
interface RawRef {
  _id: string; name?: string; code?: string; billCode?: string; status?: string; invoiceAmount?: number;
  // Populated only on the `goodsReceipt` ref (Phase 8) — see goodsReceipt.service.ts's POPULATE_DETAIL.
  grnNumber?: string; receivedDate?: string; overallCondition?: string;
}

interface RawPo {
  _id: string;
  poNumber: string;
  poDate: string;
  quotation: RawRef | string;
  quotationCode: string;
  vendor: RawRef | string;
  vendorName: string;
  vendorGst: string;
  vendorAddress: string;
  department: RawRef | string;
  departmentName: string;
  createdBy: RawRef | string;
  items: PurchaseOrder['items'];
  subtotal: number;
  totalGst: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  terms?: string;
  notes?: string;
  status: PurchaseOrder['status'];
  bill?: RawRef | string;
  aiVerification?: PurchaseOrder['aiVerification'];
  // Phase 7 — absent for a PO created from a Quotation directly.
  requirement?: RawRef | string;
  requirementNumber?: string;
  // Phase 8 — absent until a Goods Receipt has been recorded against this PO.
  goodsReceipt?: RawRef | string;
  createdAt: string;
  updatedAt: string;
}

function normalizeRef(ref: RawRef | string | undefined): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id;
}

function normalizePo(raw: RawPo): PurchaseOrder {
  const bill = raw.bill;
  const billRef = typeof bill === 'object' && bill !== null ? bill as RawRef : undefined;
  const goodsReceipt = raw.goodsReceipt;
  const goodsReceiptRef = typeof goodsReceipt === 'object' && goodsReceipt !== null ? goodsReceipt as RawRef : undefined;

  return {
    id: raw._id,
    poNumber: raw.poNumber,
    poDate: raw.poDate,
    quotationId: normalizeRef(raw.quotation),
    quotationCode: raw.quotationCode,
    vendorId: normalizeRef(raw.vendor),
    vendorName: raw.vendorName,
    vendorGst: raw.vendorGst,
    vendorAddress: raw.vendorAddress,
    departmentId: normalizeRef(raw.department),
    departmentName: raw.departmentName,
    createdById: normalizeRef(raw.createdBy),
    createdByName: typeof raw.createdBy === 'object' ? (raw.createdBy as RawRef).name ?? '' : '',
    items: raw.items,
    subtotal: raw.subtotal,
    totalGst: raw.totalGst,
    totalTax: raw.totalTax,
    totalDiscount: raw.totalDiscount,
    grandTotal: raw.grandTotal,
    terms: raw.terms,
    notes: raw.notes,
    status: raw.status,
    billId: billRef?._id ?? (typeof bill === 'string' ? bill : undefined),
    billCode: billRef?.code ?? billRef?.billCode,
    billStatus: billRef?.status,
    billInvoiceAmount: billRef?.invoiceAmount,
    aiVerification: raw.aiVerification,
    requirementId: raw.requirement ? normalizeRef(raw.requirement) : undefined,
    requirementNumber: raw.requirementNumber,
    goodsReceiptId: goodsReceiptRef?._id ?? (typeof goodsReceipt === 'string' ? goodsReceipt : undefined),
    grnNumber: goodsReceiptRef?.grnNumber,
    goodsReceiptDate: goodsReceiptRef?.receivedDate,
    goodsReceiptCondition: goodsReceiptRef?.overallCondition,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

interface ListResponse { items: RawPo[]; pagination?: unknown; }

const purchaseOrdersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({

    getPurchaseOrders: build.query<PurchaseOrder[], { status?: string; search?: string } | void>({
      query: (params) => ({
        url: '/purchase-orders',
        params: params ?? {},
      }),
      transformResponse: (raw: ListResponse | RawPo[]) => {
        const items = Array.isArray(raw) ? raw : (raw as ListResponse).items ?? [];
        return items.map(normalizePo);
      },
      providesTags: (result) => [
        { type: 'PurchaseOrder' as never, id: 'LIST' },
        ...(result ?? []).map((po) => ({ type: 'PurchaseOrder' as never, id: po.id })),
      ],
    }),

    getPurchaseOrderById: build.query<PurchaseOrder, string>({
      query: (id) => ({ url: `/purchase-orders/${id}` }),
      transformResponse: (raw: RawPo) => normalizePo(raw),
      providesTags: (_r, _e, id) => [{ type: 'PurchaseOrder' as never, id }],
    }),

    getPurchaseOrderByQuotation: build.query<PurchaseOrder | null, string>({
      // 404 means no PO has been created for this quotation yet — expected state.
      // queryFn intercepts the 404 before axiosBaseQuery logs it as an error.
      queryFn: async (quotationId) => {
        try {
          const res = await apiClient.request<{ success: boolean; message: string; data: RawPo }>({
            url: `/purchase-orders/by-quotation/${quotationId}`,
          });
          return { data: normalizePo(res.data.data) };
        } catch (err) {
          const normalized = normalizeApiError(err);
          if (normalized.status === 404) return { data: null };
          return { error: normalized };
        }
      },
      providesTags: (_r, _e, quotationId) => [{ type: 'PurchaseOrder' as never, id: `QTN-${quotationId}` }],
    }),

    // Phase 7 — mirrors getPurchaseOrderByQuotation above; used by the "does a PO already
    // exist for this Requirement" check (Requirement Details' Purchase Order entry card).
    getPurchaseOrderByRequirement: build.query<PurchaseOrder | null, string>({
      queryFn: async (requirementId) => {
        try {
          const res = await apiClient.request<{ success: boolean; message: string; data: RawPo }>({
            url: `/purchase-orders/by-requirement/${requirementId}`,
          });
          return { data: normalizePo(res.data.data) };
        } catch (err) {
          const normalized = normalizeApiError(err);
          if (normalized.status === 404) return { data: null };
          return { error: normalized };
        }
      },
      providesTags: (_r, _e, requirementId) => [{ type: 'PurchaseOrder' as never, id: `REQ-${requirementId}` }],
    }),

    createPurchaseOrder: build.mutation<PurchaseOrder, CreatePurchaseOrderRequest>({
      query: (body) => ({ url: '/purchase-orders', method: 'POST', data: body }),
      transformResponse: (raw: RawPo) => normalizePo(raw),
      invalidatesTags: [
        { type: 'PurchaseOrder' as never, id: 'LIST' },
        { type: 'PurchaseOrder' as never, id: 'STATS' },
        { type: 'Quotation' as never, id: 'LIST' },
      ],
    }),

    triggerAiVerification: build.mutation<PurchaseOrder, string>({
      query: (id) => ({ url: `/purchase-orders/${id}/verify`, method: 'POST' }),
      transformResponse: (raw: RawPo) => normalizePo(raw),
      invalidatesTags: (_r, _e, id) => [
        { type: 'PurchaseOrder' as never, id },
        { type: 'PurchaseOrder' as never, id: 'LIST' },
        { type: 'PurchaseOrder' as never, id: 'STATS' },
      ],
    }),

    // Audit-only — the actual share (PDF/Email/WhatsApp/Print) happens entirely on-device via
    // the OS share sheet; this just records that it happened for the Activity Log.
    sharePurchaseOrder: build.mutation<void, { id: string; channel?: string }>({
      query: ({ id, channel }) => ({ url: `/purchase-orders/${id}/share`, method: 'POST', data: { channel } }),
    }),

    // Phase 7 — actually sends the PO PDF to the vendor via SMTP (unlike sharePurchaseOrder,
    // which is audit-only). `sent: false` (e.g. SMTP not configured) is a normal, non-error
    // response — never throws just because the email itself didn't go out.
    emailPurchaseOrder: build.mutation<EmailPurchaseOrderResult, { id: string; recipientEmail?: string }>({
      query: ({ id, recipientEmail }) => ({ url: `/purchase-orders/${id}/email`, method: 'POST', data: { recipientEmail } }),
    }),

    createAuditLog: build.mutation<AuditLog, {
      purchaseOrderId: string;
      billId: string;
      quotationId: string;
      accountsDecision: 'verified' | 'correction_requested' | 'rejected';
      reason?: string;
    }>({
      query: (body) => ({ url: '/audit-logs', method: 'POST', data: body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'AuditLog' as never, id: 'LIST' },
        { type: 'AuditLog' as never, id: `PO-${arg.purchaseOrderId}` },
        { type: 'PurchaseOrder' as never, id: arg.purchaseOrderId },
        { type: 'PurchaseOrder' as never, id: 'LIST' },
        { type: 'PurchaseOrder' as never, id: 'STATS' },
      ],
    }),

    getPurchaseOrderStats: build.query<PurchaseOrderStats, void>({
      query: () => ({ url: '/purchase-orders/stats' }),
      providesTags: [{ type: 'PurchaseOrder' as never, id: 'STATS' }],
    }),

    getAuditLogsByPo: build.query<AuditLog[], string>({
      query: (purchaseOrderId) => ({ url: `/audit-logs/by-po/${purchaseOrderId}` }),
      transformResponse: (raw: unknown[]) =>
        (raw as Array<Record<string, unknown>>).map((l) => ({
          id: l._id as string,
          purchaseOrderId: (l.purchaseOrder as RawRef)?._id ?? (l.purchaseOrder as string),
          billId: (l.bill as RawRef)?._id ?? (l.bill as string),
          billCode: (l.bill as RawRef)?.billCode ?? (l.bill as RawRef)?.code,
          quotationId: l.quotation as string,
          aiRecommendation: l.aiRecommendation as AuditLog['aiRecommendation'],
          aiConfidence: l.aiConfidence as number,
          matchPercentage: l.matchPercentage as number,
          risk: l.risk as AuditLog['risk'],
          differenceCount: l.differenceCount as number,
          differences: (l.differences ?? []) as AuditLog['differences'],
          accountsDecision: l.accountsDecision as AuditLog['accountsDecision'],
          reason: l.reason as string | undefined,
          decidedById: (l.decidedBy as RawRef)?._id ?? (l.decidedBy as string),
          decidedByName: (l.decidedBy as RawRef)?.name ?? l.decidedByName as string,
          decidedByRole: l.decidedByRole as string,
          decidedAt: l.decidedAt as string,
          createdAt: l.createdAt as string,
        })),
      providesTags: (_r, _e, id) => [{ type: 'AuditLog' as never, id: `PO-${id}` }],
    }),
  }),
  overrideExisting: process.env.NODE_ENV !== 'production',
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderByIdQuery,
  useGetPurchaseOrderByQuotationQuery,
  useGetPurchaseOrderByRequirementQuery,
  useCreatePurchaseOrderMutation,
  useTriggerAiVerificationMutation,
  useSharePurchaseOrderMutation,
  useEmailPurchaseOrderMutation,
  useCreateAuditLogMutation,
  useGetAuditLogsByPoQuery,
  useGetPurchaseOrderStatsQuery,
} = purchaseOrdersApi;
