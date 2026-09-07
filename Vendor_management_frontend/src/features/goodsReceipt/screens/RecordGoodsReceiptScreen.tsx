import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/users/ChipSelect';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { FormDateField } from '@/components/ui/FormDateField';
import { FormTextField } from '@/components/ui/FormTextField';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useCreateGoodsReceiptMutation } from '@/features/goodsReceipt/api/goodsReceiptApi';
import { goodsReceiptSchema, type GoodsReceiptFormValues } from '@/features/goodsReceipt/goodsReceiptSchema';
import { GRN_ITEM_CONDITIONS, GRN_OVERALL_CONDITIONS } from '@/features/goodsReceipt/types';
import { useGetPurchaseOrderByIdQuery } from '@/features/purchaseOrders/api/purchaseOrdersApi';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { toIsoDateString } from '@/utils/date';
import type { PurchaseOrderStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PurchaseOrderStackParamList, 'RecordGoodsReceipt'>;

const ITEM_CONDITION_LABELS = { good: 'Good', damaged: 'Damaged', short_supply: 'Short Supply' } as const;
const OVERALL_CONDITION_LABELS = { good: 'Good', damaged: 'Damaged', partial: 'Partial' } as const;
const ITEM_CONDITION_OPTIONS = GRN_ITEM_CONDITIONS.map((value) => ({ value, label: ITEM_CONDITION_LABELS[value] }));
const OVERALL_CONDITION_OPTIONS = GRN_OVERALL_CONDITIONS.map((value) => ({ value, label: OVERALL_CONDITION_LABELS[value] }));

/** Recorded once per Purchase Order (see docs/PHASE8_GOODS_RECEIPT.md) — line items are fixed
 *  to the PO's own items (received quantity/condition/remarks per item), not a free-form list. */
export function RecordGoodsReceiptScreen({ navigation, route }: Props) {
  const { purchaseOrderId } = route.params;
  const { data: po, isLoading: isLoadingPo } = useGetPurchaseOrderByIdQuery(purchaseOrderId);
  const [createGoodsReceipt, { isLoading: isSaving }] = useCreateGoodsReceiptMutation();

  const { control, handleSubmit, reset } = useForm<GoodsReceiptFormValues>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: {
      receivedDate: toIsoDateString(new Date()),
      items: [],
      overallCondition: 'good',
      remarks: '',
    },
  });

  useEffect(() => {
    if (!po) return;
    reset({
      receivedDate: toIsoDateString(new Date()),
      items: po.items.map((item) => ({
        itemName: item.itemName,
        orderedQuantity: item.quantity,
        receivedQuantity: item.quantity,
        condition: 'good',
        remarks: '',
      })),
      overallCondition: 'good',
      remarks: '',
    });
  }, [po, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await createGoodsReceipt({
        purchaseOrder: purchaseOrderId,
        receivedDate: values.receivedDate,
        overallCondition: values.overallCondition,
        remarks: values.remarks || undefined,
        items: values.items.map((item) => ({
          itemName: item.itemName,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          condition: item.condition,
          remarks: item.remarks || undefined,
        })),
      }).unwrap();
      Alert.alert('Success', 'Goods Receipt recorded', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Could Not Record Goods Receipt', getErrorMessage(error));
    }
  });

  if (isLoadingPo || !po) {
    return (
      <Screen padded={false}>
        <AppHeader title="Record Goods Receipt" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e88e5" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader title="Record Goods Receipt" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>

          <DashboardCard className="mb-4">
            <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Purchase Order</Text>
            <TextField label="PO Number" value={po.poNumber} editable={false} className="bg-slate-100 text-ink-muted dark:bg-slate-800" />
            <TextField label="Vendor" value={po.vendorName} editable={false} className="bg-slate-100 text-ink-muted dark:bg-slate-800" />
            <FormDateField control={control} name="receivedDate" label="Received Date" maximumDate={new Date()} />
          </DashboardCard>

          <DashboardCard className="mb-4">
            <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Items</Text>
            {po.items.map((item, index) => (
              <View key={index} className={index > 0 ? 'mt-2 border-t border-slate-100 pt-4 dark:border-slate-800' : ''}>
                <Text className="mb-1 text-xs font-semibold text-ink-muted dark:text-slate-500">{item.itemName}</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <TextField label="Ordered Qty" value={String(item.quantity)} editable={false} className="bg-slate-100 text-ink-muted dark:bg-slate-800" />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name={`items.${index}.receivedQuantity`}
                      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                        <TextField
                          label="Received Qty"
                          value={String(value ?? '')}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          errorMessage={error?.message}
                          keyboardType="numeric"
                        />
                      )}
                    />
                  </View>
                </View>
                <Controller
                  control={control}
                  name={`items.${index}.condition`}
                  render={({ field: { value, onChange }, fieldState: { error } }) => (
                    <ChipSelect label="Condition" value={value} options={ITEM_CONDITION_OPTIONS} onChange={onChange} errorMessage={error?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name={`items.${index}.remarks`}
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextField label="Remarks" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Optional" />
                  )}
                />
              </View>
            ))}
          </DashboardCard>

          <DashboardCard className="mb-4">
            <Controller
              control={control}
              name="overallCondition"
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <ChipSelect label="Overall Condition" value={value} options={OVERALL_CONDITION_OPTIONS} onChange={onChange} errorMessage={error?.message} />
              )}
            />
            <FormTextField
              control={control}
              name="remarks"
              label="Remarks (optional)"
              placeholder="Any notes about this delivery"
              multiline
              numberOfLines={3}
              className="h-20"
            />
          </DashboardCard>

          <Button label="Save Goods Receipt" loading={isSaving} onPress={handleSave} className="mt-1" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
