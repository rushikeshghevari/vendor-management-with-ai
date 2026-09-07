import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BillDetailsScreen } from '@/features/bills/screens/BillDetailsScreen';
import { BillListScreen } from '@/features/bills/screens/BillListScreen';
import { CreateBillScreen } from '@/features/bills/screens/CreateBillScreen';
import { EditBillScreen } from '@/features/bills/screens/EditBillScreen';
import { PdfViewerScreen } from '@/features/requirements/screens/PdfViewerScreen';
import { CreateRecurringExpenseScreen } from '@/features/recurringExpenses/screens/CreateRecurringExpenseScreen';
import { GenerateRecurringCycleScreen } from '@/features/recurringExpenses/screens/GenerateRecurringCycleScreen';
import { RecurringExpenseListScreen } from '@/features/recurringExpenses/screens/RecurringExpenseListScreen';
import type { BillsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<BillsStackParamList>();

export function BillsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BillList" component={BillListScreen} />
      <Stack.Screen name="BillDetails" component={BillDetailsScreen} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
      <Stack.Screen name="CreateBill" component={CreateBillScreen} />
      <Stack.Screen name="EditBill" component={EditBillScreen} />
      <Stack.Screen name="RecurringExpenseList" component={RecurringExpenseListScreen} />
      <Stack.Screen name="CreateRecurringExpense" component={CreateRecurringExpenseScreen} />
      <Stack.Screen name="GenerateRecurringCycle" component={GenerateRecurringCycleScreen} />
    </Stack.Navigator>
  );
}
