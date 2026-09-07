import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChipSelect } from '@/components/users/ChipSelect';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { FormDateField } from '@/components/ui/FormDateField';
import { FormTextField } from '@/components/ui/FormTextField';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import {
  useGetPaymentByIdQuery,
  useMarkFailedMutation,
  useMarkPaidMutation,
  useStartProcessingMutation,
} from '@/features/payments/api/paymentsApi';
import { markFailedSchema, markPaidSchema, startProcessingSchema, type MarkFailedFormValues, type MarkPaidFormValues, type StartProcessingFormValues } from '@/features/payments/paymentSchema';
import { PAYMENT_FAILURE_REASONS, PAYMENT_METHODS, type PaymentFailureReason, type PaymentMethod } from '@/features/payments/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { PaymentsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PaymentsStackParamList, 'PaymentForm'>;

const METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  upi: 'UPI',
  rtgs: 'RTGS',
  neft: 'NEFT',
  imps: 'IMPS',
  cash: 'Cash',
};
const METHOD_OPTIONS = PAYMENT_METHODS.map((value) => ({ value, label: METHOD_LABEL[value] }));

const FAILURE_REASON_LABEL: Record<PaymentFailureReason, string> = {
  bank_timeout: 'Bank Timeout',
  upi_failed: 'UPI Failed',
  cheque_rejected: 'Cheque Rejected',
  insufficient_balance: 'Insufficient Balance',
  account_closed: 'Account Closed',
  invalid_ifsc: 'Invalid IFSC',
  network_failure: 'Network Failure',
  manual_hold: 'Manual Hold',
  other: 'Other',
};
const FAILURE_REASON_OPTIONS = PAYMENT_FAILURE_REASONS.map((value) => ({ value, label: FAILURE_REASON_LABEL[value] }));

function StartProcessingForm({ navigation, paymentId, isRetry }: { navigation: Props['navigation']; paymentId: string; isRetry: boolean }) {
  const [startProcessing, { isLoading }] = useStartProcessingMutation();
  const { control, handleSubmit, watch } = useForm<StartProcessingFormValues>({
    resolver: zodResolver(startProcessingSchema),
    defaultValues: { paymentMethod: undefined, bankName: '', accountNumber: '', ifsc: '', upiId: '' },
  });
  const method = watch('paymentMethod');

  const onSubmit = async (values: StartProcessingFormValues) => {
    try {
      await startProcessing({ id: paymentId, ...values }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Start Processing', getErrorMessage(error));
    }
  };

  return (
    <>
      <Controller
        control={control}
        name="paymentMethod"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <ChipSelect label="Payment Method" value={value} options={METHOD_OPTIONS} onChange={onChange} errorMessage={error?.message} />
        )}
      />
      {method === 'bank_transfer' || method === 'rtgs' || method === 'neft' || method === 'imps' ? (
        <>
          <FormTextField control={control} name="bankName" label="Bank Name" placeholder="Enter bank name" />
          <FormTextField control={control} name="accountNumber" label="Account Number" placeholder="Enter account number" />
          <FormTextField control={control} name="ifsc" label="IFSC" placeholder="Enter IFSC code" autoCapitalize="characters" />
        </>
      ) : null}
      {method === 'upi' ? <FormTextField control={control} name="upiId" label="UPI ID" placeholder="Enter UPI ID" /> : null}

      <Button label={isRetry ? 'Retry' : 'Start Processing'} loading={isLoading} onPress={handleSubmit(onSubmit)} className="mt-2" />
    </>
  );
}

function MarkPaidForm({ navigation, paymentId, paymentMethod }: { navigation: Props['navigation']; paymentId: string; paymentMethod?: string }) {
  const [markPaid, { isLoading }] = useMarkPaidMutation();
  const { control, handleSubmit } = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidSchema(paymentMethod)),
    defaultValues: { utrNumber: '', transactionReference: '', chequeNumber: '', paymentDate: new Date().toISOString().slice(0, 10), remarks: '' },
  });

  const onSubmit = async (values: MarkPaidFormValues) => {
    try {
      await markPaid({ id: paymentId, ...values, paymentDate: new Date(values.paymentDate).toISOString() }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Mark Paid', getErrorMessage(error));
    }
  };

  return (
    <>
      {paymentMethod && ['bank_transfer', 'upi', 'rtgs', 'neft', 'imps'].includes(paymentMethod) ? (
        <FormTextField control={control} name="utrNumber" label="UTR Number" placeholder="Enter UTR number" />
      ) : null}
      {paymentMethod === 'cheque' ? (
        <FormTextField control={control} name="chequeNumber" label="Cheque Number" placeholder="Enter cheque number" />
      ) : null}
      <FormTextField control={control} name="transactionReference" label="Reference Number" placeholder="Enter reference number (optional)" />
      <FormDateField control={control} name="paymentDate" label="Payment Date" maximumDate={new Date()} />
      <FormTextField control={control} name="remarks" label="Remarks" placeholder="Optional remarks" multiline />

      <Button label="Mark Paid" loading={isLoading} onPress={handleSubmit(onSubmit)} className="mt-2" />
    </>
  );
}

function MarkFailedForm({ navigation, paymentId }: { navigation: Props['navigation']; paymentId: string }) {
  const [markFailed, { isLoading }] = useMarkFailedMutation();
  const { control, handleSubmit } = useForm<MarkFailedFormValues>({
    resolver: zodResolver(markFailedSchema),
    defaultValues: { failureReason: undefined, remarks: '' },
  });

  const onSubmit = async (values: MarkFailedFormValues) => {
    try {
      await markFailed({ id: paymentId, ...values }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Mark Failed', getErrorMessage(error));
    }
  };

  return (
    <>
      <Controller
        control={control}
        name="failureReason"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <ChipSelect
            label="Failure Reason"
            value={value}
            options={FAILURE_REASON_OPTIONS}
            onChange={onChange}
            errorMessage={error?.message}
          />
        )}
      />
      <FormTextField control={control} name="remarks" label="Remarks" placeholder="Optional remarks" multiline />

      <Button label="Mark Failed" variant="dangerOutline" loading={isLoading} onPress={handleSubmit(onSubmit)} className="mt-2" />
    </>
  );
}

export function PaymentFormScreen({ navigation, route }: Props) {
  const { paymentId, mode } = route.params;
  const { data: payment, isLoading } = useGetPaymentByIdQuery(paymentId);

  const titles: Record<typeof mode, string> = {
    'start-processing': 'Start Processing',
    retry: 'Retry Payment',
    'mark-paid': 'Mark Paid',
    'mark-failed': 'Mark Failed',
  };

  if (isLoading || !payment) {
    return (
      <Screen padded={false}>
        <AppHeader title={titles[mode]} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader title={titles[mode]} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'start-processing' || mode === 'retry' ? (
            <StartProcessingForm navigation={navigation} paymentId={paymentId} isRetry={mode === 'retry'} />
          ) : null}
          {mode === 'mark-paid' ? <MarkPaidForm navigation={navigation} paymentId={paymentId} paymentMethod={payment.paymentMethod} /> : null}
          {mode === 'mark-failed' ? <MarkFailedForm navigation={navigation} paymentId={paymentId} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
