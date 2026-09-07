import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import {
  useGetQuotationByIdQuery,
  useRetryQuotationOcrMutation,
} from '@/features/quotations/api/quotationsApi';
import type { RequirementsStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/utils/getErrorMessage';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'QuotationOcrResult'>;

function FieldRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === '') return null;
  return (
    <View className="mt-2.5 flex-row items-center justify-between border-b border-slate-50 pb-2.5 dark:border-slate-800">
      <Text className="text-xs text-ink-muted dark:text-slate-500">{label}</Text>
      <Text className="text-sm font-medium text-ink dark:text-slate-200">{value}</Text>
    </View>
  );
}

export function QuotationOcrResultScreen({ navigation, route }: Props) {
  const { requirementId, quotationId } = route.params;
  const [showRawText, setShowRawText] = useState(false);

  // Poll only while OCR is actually running — a completed/failed/not_started result never
  // changes on its own. The interval lives in state (not derived inline from the query's
  // own result, which would be a circular reference) and flips off the instant a poll
  // response reports a terminal status.
  const [pollingInterval, setPollingInterval] = useState(3000);
  const { data: quotation, isLoading } = useGetQuotationByIdQuery(quotationId, { pollingInterval });
  const [retryOcr, { isLoading: isRetrying }] = useRetryQuotationOcrMutation();

  const ocr = quotation?.ocr;
  const status = ocr?.status ?? 'not_started';

  useEffect(() => {
    setPollingInterval(status === 'processing' ? 3000 : 0);
  }, [status]);

  const handleRetry = async () => {
    try {
      await retryOcr({ requirementId, quotationId }).unwrap();
    } catch (error) {
      Alert.alert('Could Not Retry OCR', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="OCR Result" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      {isLoading ? (
        <Loader label="Loading quotation..." fullscreen />
      ) : (
        <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 24 }}>
          <DashboardCard className="mb-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold text-ink dark:text-white">{quotation?.quotationCode}</Text>
                <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">{quotation?.vendorName}</Text>
              </View>
              <Badge
                label={status === 'not_started' ? 'Not Started' : status === 'processing' ? 'Processing…' : status === 'completed' ? 'Completed' : 'Failed'}
                variant={status === 'completed' ? 'success' : status === 'failed' ? 'danger' : status === 'processing' ? 'primary' : 'neutral'}
              />
            </View>
            {ocr?.provider ? (
              <Text className="mt-2 text-xs text-ink-muted dark:text-slate-500">
                Provider: {ocr.provider} {ocr.confidence !== undefined ? `· Confidence: ${ocr.confidence}%` : ''}
              </Text>
            ) : null}
          </DashboardCard>

          {status === 'processing' ? (
            <DashboardCard className="mb-4 items-center py-8">
              <Loader label="Extracting quotation data — this can take up to a minute..." />
            </DashboardCard>
          ) : null}

          {status === 'failed' ? (
            <DashboardCard className="mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
                <Text className="text-sm font-semibold text-red-600 dark:text-red-400">OCR Failed</Text>
              </View>
              <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
                {ocr?.error ?? 'Something went wrong while extracting data from this attachment.'}
              </Text>
              <Button label="Retry OCR" loading={isRetrying} onPress={handleRetry} className="mt-4" />
            </DashboardCard>
          ) : null}

          {status === 'not_started' ? (
            <DashboardCard className="mb-4">
              <Text className="text-sm text-ink-muted dark:text-slate-400">
                No attachment has been processed yet. Upload a quotation document to start OCR.
              </Text>
            </DashboardCard>
          ) : null}

          {status === 'completed' && ocr?.structuredData ? (
            <>
              <DashboardCard className="mb-4">
                <Text className="mb-1 text-sm font-semibold text-ink dark:text-white">Extracted Fields</Text>
                <FieldRow label="Vendor Name" value={ocr.structuredData.vendorName} />
                <FieldRow label="Quotation Number" value={ocr.structuredData.quotationNumber} />
                <FieldRow label="Quotation Date" value={ocr.structuredData.quotationDate} />
                <FieldRow label="Currency" value={ocr.structuredData.currency} />
                <FieldRow label="Subtotal" value={ocr.structuredData.subtotal !== undefined ? `₹${ocr.structuredData.subtotal.toLocaleString()}` : undefined} />
                <FieldRow label="GST" value={ocr.structuredData.gst !== undefined ? `₹${ocr.structuredData.gst.toLocaleString()}` : undefined} />
                <FieldRow label="Discount" value={ocr.structuredData.discount !== undefined ? `₹${ocr.structuredData.discount.toLocaleString()}` : undefined} />
                <FieldRow label="Grand Total" value={ocr.structuredData.grandTotal !== undefined ? `₹${ocr.structuredData.grandTotal.toLocaleString()}` : undefined} />
              </DashboardCard>

              <DashboardCard className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-ink dark:text-white">
                  Items {ocr.structuredData.items.length ? `(${ocr.structuredData.items.length})` : ''}
                </Text>
                {ocr.structuredData.items.length === 0 ? (
                  <Text className="text-sm text-ink-muted dark:text-slate-400">No line items were detected in this document.</Text>
                ) : (
                  ocr.structuredData.items.map((item, index) => (
                    <View key={`${item.description}-${index}`} className="mt-2.5 border-b border-slate-50 pb-2.5 dark:border-slate-800">
                      <Text className="text-sm text-ink dark:text-slate-200">{item.description}</Text>
                      <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-500">
                        Qty {item.quantity ?? '—'} {item.unit ?? ''} · Rate ₹{item.unitPrice?.toLocaleString() ?? '—'} · Amount ₹{item.amount?.toLocaleString() ?? '—'}
                      </Text>
                    </View>
                  ))
                )}
              </DashboardCard>

              <DashboardCard className="mb-4">
                <Text
                  onPress={() => setShowRawText((prev) => !prev)}
                  className="text-sm font-semibold text-primary-600"
                >
                  {showRawText ? 'Hide' : 'Show'} Raw Extracted Text
                </Text>
                {showRawText ? (
                  <Text className="mt-3 text-xs text-ink-muted dark:text-slate-400">{ocr.extractedText || 'No text extracted.'}</Text>
                ) : null}
              </DashboardCard>

              <Button label="Retry OCR" variant="secondary" loading={isRetrying} onPress={handleRetry} className="mb-4" />
            </>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
