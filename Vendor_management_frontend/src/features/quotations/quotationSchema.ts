import { z } from 'zod';

import { QUOTATION_CURRENCIES, QUOTATION_PRIORITIES } from '@/features/quotations/types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const quotationSchema = z.object({
  vendor: z.string().min(1, 'Select a vendor'),
  quotationDate: z.string().regex(DATE_REGEX, 'Enter a date as YYYY-MM-DD'),
  requiredDate: z.string().regex(DATE_REGEX, 'Enter a date as YYYY-MM-DD'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  gst: z.coerce.number().min(0, 'GST cannot be negative').max(100, 'GST cannot exceed 100%'),
  currency: z.enum(QUOTATION_CURRENCIES),
  paymentTerms: z.string().trim().min(1, 'Payment terms are required'),
  deliveryTerms: z.string().trim().min(1, 'Delivery terms are required'),
  creditPeriod: z.coerce.number().min(0, 'Credit period is required'),
  priority: z.enum(QUOTATION_PRIORITIES),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type QuotationFormValues = z.infer<typeof quotationSchema>;
