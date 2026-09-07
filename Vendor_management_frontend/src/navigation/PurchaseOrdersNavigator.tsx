import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ComparisonScreen } from '@/features/purchaseOrders/screens/ComparisonScreen';
import { CreatePurchaseOrderScreen } from '@/features/purchaseOrders/screens/CreatePurchaseOrderScreen';
import { PurchaseOrderDetailsScreen } from '@/features/purchaseOrders/screens/PurchaseOrderDetailsScreen';
import { PurchaseOrderListScreen } from '@/features/purchaseOrders/screens/PurchaseOrderListScreen';
import { RecordGoodsReceiptScreen } from '@/features/goodsReceipt/screens/RecordGoodsReceiptScreen';
import { GoodsReceiptListScreen } from '@/features/goodsReceipt/screens/GoodsReceiptListScreen';
import type { PurchaseOrderStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<PurchaseOrderStackParamList>();

export function PurchaseOrdersNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PurchaseOrderList"    component={PurchaseOrderListScreen} />
      <Stack.Screen name="PurchaseOrderDetails" component={PurchaseOrderDetailsScreen} />
      <Stack.Screen name="CreatePurchaseOrder"  component={CreatePurchaseOrderScreen} />
      <Stack.Screen name="ComparisonScreen"     component={ComparisonScreen} />
      <Stack.Screen name="RecordGoodsReceipt"   component={RecordGoodsReceiptScreen} />
      <Stack.Screen name="GoodsReceiptList"     component={GoodsReceiptListScreen} />
    </Stack.Navigator>
  );
}
