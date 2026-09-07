import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CreateUserScreen } from '@/features/users/screens/CreateUserScreen';
import { EditUserScreen } from '@/features/users/screens/EditUserScreen';
import { UserDetailsScreen } from '@/features/users/screens/UserDetailsScreen';
import { UserListScreen } from '@/features/users/screens/UserListScreen';
import type { UsersStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<UsersStackParamList>();

export function UsersNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserList" component={UserListScreen} />
      <Stack.Screen name="CreateUser" component={CreateUserScreen} />
      <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
      <Stack.Screen name="EditUser" component={EditUserScreen} />
    </Stack.Navigator>
  );
}
