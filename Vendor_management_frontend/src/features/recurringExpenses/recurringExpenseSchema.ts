import { z } from 'zod';

import { RECURRING_FREQUENCIES, RECURRING_MODES } from '@/features/recurringExpenses/types';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[\w.+-]{2,256}@[a-zA-Z]{2,64}$/;

export const recurringExpenseSchema = z
  .object({
    title: z.string().trim().min(2, 'Title is required'),
    mode: z.enum(RECURRING_MODES),
    vendorId: z.string().optional(),
    reimbursedToId: z.string().optional(),
    bankName: z.string().trim().optional(),
    accountHolderName: z.string().trim().optional(),
    accountNumber: z.string().trim().optional(),
    ifscCode: z.string().trim().toUpperCase().optional(),
    upiId: z.string().trim().regex(UPI_REGEX, 'Enter a valid UPI ID').optional().or(z.literal('')),
    frequency: z.enum(RECURRING_FREQUENCIES),
    baselineAmount: z.coerce.number().positive('Baseline amount must be greater than 0'),
    thresholdPercent: z.coerce.number().min(0).max(1000),
    nextDueDate: z.string().min(1, 'Next due date is required'),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'vendor_bill' && !data.vendorId) {
      ctx.addIssue({ code: 'custom', path: ['vendorId'], message: 'Select the vendor being paid each cycle' });
    }
    if (data.mode === 'reimbursement') {
      if (!data.reimbursedToId) {
        ctx.addIssue({ code: 'custom', path: ['reimbursedToId'], message: 'Select who is being reimbursed each cycle' });
      }
      if (!data.bankName?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['bankName'], message: 'Bank name is required' });
      }
      if (!data.accountHolderName?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['accountHolderName'], message: 'Account holder name is required' });
      }
      if (!data.accountNumber?.trim() || data.accountNumber.trim().length < 4) {
        ctx.addIssue({ code: 'custom', path: ['accountNumber'], message: 'Enter a valid account number' });
      }
      if (!data.ifscCode || !IFSC_REGEX.test(data.ifscCode)) {
        ctx.addIssue({ code: 'custom', path: ['ifscCode'], message: 'Enter a valid IFSC code' });
      }
    }
  });

export type RecurringExpenseFormValues = z.infer<typeof recurringExpenseSchema>;
