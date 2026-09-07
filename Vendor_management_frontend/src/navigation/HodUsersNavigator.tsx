import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HodCreateUserScreen } from '@/features/hod/screens/HodCreateUserScreen';
import { HodEditUserScreen } from '@/features/hod/screens/HodEditUserScreen';
import { HodUserDetailsScreen } from '@/features/hod/screens/HodUserDetailsScreen';
import { HodUserListScreen } from '@/features/hod/screens/HodUserListScreen';
import type { HodUsersStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<HodUsersStackParamList>();

export function HodUsersNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserList" component={HodUserListScreen} />
      <Stack.Screen name="CreateUser" component={HodCreateUserScreen} />
      <Stack.Screen name="UserDetails" component={HodUserDetailsScreen} />
      <Stack.Screen name="EditUser" component={HodEditUserScreen} />
    </Stack.Navigator>
  );
}
