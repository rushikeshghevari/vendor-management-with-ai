import { Badge } from '@/components/ui/Badge';
import type { PaymentStatus } from '@/features/payments/types';

const STATUS_LABEL: Record<PaymentStatus, string> = {
  payment_pending: 'Payment Pending',
  processing: 'Processing',
  paid: 'Paid',
  completed: 'Completed',
  failed: 'Failed',
};

const STATUS_VARIANT: Record<PaymentStatus, 'primary' | 'success' | 'danger' | 'neutral'> = {
  payment_pending: 'neutral',
  processing: 'primary',
  paid: 'success',
  completed: 'success',
  failed: 'danger',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge label={STATUS_LABEL[status]} variant={STATUS_VARIANT[status]} />;
}

export { STATUS_LABEL as PAYMENT_STATUS_LABEL };
