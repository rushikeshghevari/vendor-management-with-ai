import { baseApi } from '@/store/baseApi';
import { apiClient } from '@/services/apiClient';
import { normalizeApiError } from '@/services/apiError';
import type { CreateGoodsReceiptRequest, GoodsReceipt } from '@/features/goodsReceipt/types';

// ── Raw server shape (snake_case + MongoDB _id) ────────────────────────────────
interface RawRef { _id: string; name?: string; code?: string; }

interface RawGoodsReceipt {
  _id: string;
  grnNumber: string;
  purchaseOrder: RawRef | string;
  poNumber: string;
  requirement?: RawRef | string;
  requirementNumber?: string;
  vendor: RawRef | string;
  vendorName: string;
  department: RawRef | string;
  departmentName: string;
  createdBy: RawRef | string;
  receivedDate: string;
  items: GoodsReceipt['items'];
  overallCondition: GoodsReceipt['overallCondition'];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeRef(ref: RawRef | string | undefined): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id;
}

function normalizeGoodsReceipt(raw: RawGoodsReceipt): GoodsReceipt {
  return {
    id: raw._id,
    grnNumber: raw.grnNumber,
    purchaseOrderId: normalizeRef(raw.purchaseOrder),
    poNumber: raw.poNumber,
    requirementId: raw.requirement ? normalizeRef(raw.requirement) : undefined,
    requirementNumber: raw.requirementNumber,
    vendorId: normalizeRef(raw.vendor),
    vendorName: raw.vendorName,
    departmentId: normalizeRef(raw.department),
    departmentName: raw.departmentName,
    createdById: normalizeRef(raw.createdBy),
    createdByName: typeof raw.createdBy === 'object' ? (raw.createdBy as RawRef).name ?? '' : '',
    receivedDate: raw.receivedDate,
    items: raw.items,
    overallCondition: raw.overallCondition,
    remarks: raw.remarks,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

interface ListResponse { items: RawGoodsReceipt[]; pagination?: unknown; }

const goodsReceiptApi = baseApi.injectEndpoints({
  endpoints: (build) => ({

    // Mirrors getPurchaseOrders' list query shape in purchaseOrdersApi.ts.
    getGoodsReceipts: build.query<GoodsReceipt[], { search?: string } | void>({
      query: (params) => ({
        url: '/goods-receipts',
        params: params ?? {},
      }),
      transformResponse: (raw: ListResponse | RawGoodsReceipt[]) => {
        const items = Array.isArray(raw) ? raw : (raw as ListResponse).items ?? [];
        return items.map(normalizeGoodsReceipt);
      },
      providesTags: (result) => [
        { type: 'GoodsReceipt' as never, id: 'LIST' },
        ...(result ?? []).map((grn) => ({ type: 'GoodsReceipt' as never, id: grn.id })),
      ],
    }),

    // 404 means no Goods Receipt has been recorded for this Purchase Order yet — expected
    // state, not an error. Mirrors getPurchaseOrderByQuotation's queryFn 404-swallow pattern.
    getGoodsReceiptByPurchaseOrder: build.query<GoodsReceipt | null, string>({
      queryFn: async (purchaseOrderId) => {
        try {
          const res = await apiClient.request<{ success: boolean; message: string; data: RawGoodsReceipt }>({
            url: `/goods-receipts/by-po/${purchaseOrderId}`,
          });
          return { data: res.data.data ? normalizeGoodsReceipt(res.data.data) : null };
        } catch (err) {
          const normalized = normalizeApiError(err);
          if (normalized.status === 404) return { data: null };
          return { error: normalized };
        }
      },
      providesTags: (_r, _e, purchaseOrderId) => [{ type: 'GoodsReceipt', id: `PO-${purchaseOrderId}` }],
    }),

    createGoodsReceipt: build.mutation<GoodsReceipt, CreateGoodsReceiptRequest>({
      query: (body) => ({ url: '/goods-receipts', method: 'POST', data: body }),
      transformResponse: (raw: RawGoodsReceipt) => normalizeGoodsReceipt(raw),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'GoodsReceipt', id: `PO-${arg.purchaseOrder}` },
        { type: 'GoodsReceipt', id: 'LIST' },
        { type: 'PurchaseOrder', id: arg.purchaseOrder },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: process.env.NODE_ENV !== 'production',
});

export const {
  useGetGoodsReceiptsQuery,
  useGetGoodsReceiptByPurchaseOrderQuery,
  useCreateGoodsReceiptMutation,
} = goodsReceiptApi;
