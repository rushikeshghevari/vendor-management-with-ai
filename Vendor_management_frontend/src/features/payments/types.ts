export const PAYMENT_STATUSES = ['payment_pending', 'processing', 'paid', 'completed', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['bank_transfer', 'cheque', 'upi', 'rtgs', 'neft', 'imps', 'cash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_FAILURE_REASONS = [
  'bank_timeout',
  'upi_failed',
  'cheque_rejected',
  'insufficient_balance',
  'account_closed',
  'invalid_ifsc',
  'network_failure',
  'manual_hold',
  'other',
] as const;
export type PaymentFailureReason = (typeof PAYMENT_FAILURE_REASONS)[number];

export interface PaymentHistoryEntry {
  status: PaymentStatus;
  remarks?: string;
  failureReason?: PaymentFailureReason;
  retryNumber?: number;
  changedById: string;
  changedAt: string;
}

export interface Payment {
  id: string;
  paymentCode: string;
  billId: string;
  billCode: string;
  billStatus?: string;
  // Phase 10/11 — Requirement/Goods-Receipt lineage, denormalized on the linked Bill (Phase 9).
  // Read-only context for Accounts/Payment; never affects verify/pay mechanics.
  requirementNumber?: string;
  grnNumber?: string;
  quotationId: string;
  quotationCode: string;
  vendorId?: string;
  vendorName?: string;
  // Set only for a `reimbursement`-mode recurring expense Payment, which has no vendor — this
  // is who actually gets paid instead. See the recurringExpenses feature.
  reimbursedToName?: string;
  reimbursementBankDetails?: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  };
  recurringExpenseTitle?: string;
  departmentId: string;
  departmentName: string;
  amount: number;
  gst: number;
  invoiceNumber: string;
  invoiceDate: string;
  paymentMethod?: PaymentMethod;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  utrNumber?: string;
  transactionReference?: string;
  chequeNumber?: string;
  paymentDate?: string;
  remarks?: string;
  status: PaymentStatus;
  retryCount: number;
  history: PaymentHistoryEntry[];
  verifiedById?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDeptStats {
  readyForPayment: number;
  paymentPending: number;
  processing: number;
  paidToday: number;
  completed: number;
  failed: number;
}

export interface AccountsPaymentStats {
  paymentsReady: number;
  completedToday: number;
}

export interface SuperAdminPaymentStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
}

export interface MyPaymentStats {
  myPayments: number;
  pending: number;
  completed: number;
}
