import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const billSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'Invoice number is required'),
  invoiceDate: z.string().regex(DATE_REGEX, 'Enter a date as YYYY-MM-DD'),
  invoiceAmount: z.coerce.number().positive('Invoice amount must be greater than 0'),
  taxableAmount: z.coerce.number().min(0, 'Taxable amount cannot be negative'),
  gstAmount: z.coerce.number().min(0, 'GST amount cannot be negative'),
  paymentTerms: z.string().trim().min(1, 'Payment terms are required'),
  creditPeriod: z.coerce.number().min(0).optional(),
  dueDate: z.string().regex(DATE_REGEX, 'Enter a date as YYYY-MM-DD'),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type BillFormValues = z.infer<typeof billSchema>;
