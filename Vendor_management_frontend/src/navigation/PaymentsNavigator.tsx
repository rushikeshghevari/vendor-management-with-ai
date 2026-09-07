import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BillsReadyForPaymentScreen } from '@/features/payments/screens/BillsReadyForPaymentScreen';
import { PaymentDetailsScreen } from '@/features/payments/screens/PaymentDetailsScreen';
import { PaymentFormScreen } from '@/features/payments/screens/PaymentFormScreen';
import { PaymentListScreen } from '@/features/payments/screens/PaymentListScreen';
import type { PaymentsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<PaymentsStackParamList>();

/** Shared by Payment Department (full actions), Accounts/Super Admin (read-only), and
 *  Department User (read-only "My Payments") — see the type's own doc comment in types.ts. */
export function PaymentsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PaymentList" component={PaymentListScreen} />
      <Stack.Screen name="BillsReadyForPayment" component={BillsReadyForPaymentScreen} />
      <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} />
      <Stack.Screen name="PaymentForm" component={PaymentFormScreen} />
    </Stack.Navigator>
  );
}
