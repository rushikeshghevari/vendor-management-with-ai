import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AccountsBillDetailsScreen } from '@/features/accounts/screens/AccountsBillDetailsScreen';
import { AccountsBillListScreen } from '@/features/accounts/screens/AccountsBillListScreen';
import type { AccountsBillsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AccountsBillsStackParamList>();

export function AccountsBillsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountsBillList" component={AccountsBillListScreen} />
      <Stack.Screen name="AccountsBillDetails" component={AccountsBillDetailsScreen} />
    </Stack.Navigator>
  );
}
