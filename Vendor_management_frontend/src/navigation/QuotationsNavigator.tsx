import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CreateQuotationScreen } from '@/features/quotations/screens/CreateQuotationScreen';
import { EditQuotationScreen } from '@/features/quotations/screens/EditQuotationScreen';
import { QuotationDetailsScreen } from '@/features/quotations/screens/QuotationDetailsScreen';
import { QuotationListScreen } from '@/features/quotations/screens/QuotationListScreen';
import type { QuotationsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<QuotationsStackParamList>();

export function QuotationsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="QuotationList" component={QuotationListScreen} />
      <Stack.Screen name="QuotationDetails" component={QuotationDetailsScreen} />
      <Stack.Screen name="CreateQuotation" component={CreateQuotationScreen} />
      <Stack.Screen name="EditQuotation" component={EditQuotationScreen} />
    </Stack.Navigator>
  );
}
