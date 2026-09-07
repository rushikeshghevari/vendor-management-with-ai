import { z } from 'zod';

import { GRN_ITEM_CONDITIONS, GRN_OVERALL_CONDITIONS } from '@/features/goodsReceipt/types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const goodsReceiptItemSchema = z.object({
  itemName: z.string().trim().min(1),
  orderedQuantity: z.coerce.number().min(0),
  receivedQuantity: z.coerce.number().min(0, 'Received quantity cannot be negative'),
  condition: z.enum(GRN_ITEM_CONDITIONS),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
});

export const goodsReceiptSchema = z.object({
  receivedDate: z.string().regex(DATE_REGEX, 'Enter a date as YYYY-MM-DD'),
  items: z.array(goodsReceiptItemSchema).min(1, 'This Purchase Order has no line items'),
  overallCondition: z.enum(GRN_OVERALL_CONDITIONS),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type GoodsReceiptItemFormValues = z.infer<typeof goodsReceiptItemSchema>;
export type GoodsReceiptFormValues = z.infer<typeof goodsReceiptSchema>;
