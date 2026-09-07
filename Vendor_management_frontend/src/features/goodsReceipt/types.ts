export const GRN_ITEM_CONDITIONS = ['good', 'damaged', 'short_supply'] as const;
export type GrnItemCondition = (typeof GRN_ITEM_CONDITIONS)[number];

export const GRN_OVERALL_CONDITIONS = ['good', 'damaged', 'partial'] as const;
export type GrnOverallCondition = (typeof GRN_OVERALL_CONDITIONS)[number];

export interface GoodsReceiptItem {
  itemName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  condition: GrnItemCondition;
  remarks?: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  // Set only when the linked Purchase Order is itself Requirement-originated (Phase 7) —
  // undefined for a Goods Receipt recorded against a legacy quotation-only PO.
  requirementId?: string;
  requirementNumber?: string;
  vendorId: string;
  vendorName: string;
  departmentId: string;
  departmentName: string;
  createdById: string;
  createdByName: string;
  receivedDate: string;
  items: GoodsReceiptItem[];
  overallCondition: GrnOverallCondition;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoodsReceiptItem {
  itemName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  condition: GrnItemCondition;
  remarks?: string;
}

export interface CreateGoodsReceiptRequest {
  purchaseOrder: string;
  receivedDate: string;
  items: CreateGoodsReceiptItem[];
  overallCondition: GrnOverallCondition;
  remarks?: string;
}
