import { z } from 'zod';

import { PAYMENT_FAILURE_REASONS, PAYMENT_METHODS } from '@/features/payments/types';

const ONLINE_METHODS_REQUIRING_UTR = ['bank_transfer', 'upi', 'rtgs', 'neft', 'imps'];

export const startProcessingSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Select a payment method' }),
  bankName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  ifsc: z.string().trim().optional(),
  upiId: z.string().trim().optional(),
});
export type StartProcessingFormValues = z.infer<typeof startProcessingSchema>;

// Client-side mirror of payment.service.ts markPaid()'s conditional UTR/Cheque requirement —
// fast feedback only, the server re-validates against the Payment's actual stored method.
export const markPaidSchema = (paymentMethod: string | undefined) =>
  z
    .object({
      utrNumber: z.string().trim().optional(),
      transactionReference: z.string().trim().optional(),
      chequeNumber: z.string().trim().optional(),
      paymentDate: z.string().min(1, 'Payment date is required'),
      remarks: z.string().trim().max(1000).optional(),
    })
    .superRefine((data, ctx) => {
      if (paymentMethod && ONLINE_METHODS_REQUIRING_UTR.includes(paymentMethod) && !data.utrNumber) {
        ctx.addIssue({ code: 'custom', path: ['utrNumber'], message: 'UTR Number is required for this payment method' });
      }
      if (paymentMethod === 'cheque' && !data.chequeNumber) {
        ctx.addIssue({ code: 'custom', path: ['chequeNumber'], message: 'Cheque Number is required for cheque payments' });
      }
      const paymentDate = new Date(data.paymentDate);
      if (paymentDate > new Date()) {
        ctx.addIssue({ code: 'custom', path: ['paymentDate'], message: 'Payment date cannot be a future date' });
      }
    });
export type MarkPaidFormValues = z.infer<ReturnType<typeof markPaidSchema>>;

export const markFailedSchema = z.object({
  failureReason: z.enum(PAYMENT_FAILURE_REASONS, { message: 'Select a failure reason' }),
  remarks: z.string().trim().max(1000).optional(),
});
export type MarkFailedFormValues = z.infer<typeof markFailedSchema>;
