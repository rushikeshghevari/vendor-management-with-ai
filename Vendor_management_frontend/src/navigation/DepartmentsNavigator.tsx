import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddDepartmentScreen } from '@/features/departments/screens/AddDepartmentScreen';
import { DepartmentDetailsScreen } from '@/features/departments/screens/DepartmentDetailsScreen';
import { DepartmentsListScreen } from '@/features/departments/screens/DepartmentsListScreen';
import { EditDepartmentScreen } from '@/features/departments/screens/EditDepartmentScreen';
import type { DepartmentsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<DepartmentsStackParamList>();

export function DepartmentsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DepartmentList" component={DepartmentsListScreen} />
      <Stack.Screen name="DepartmentDetails" component={DepartmentDetailsScreen} />
      <Stack.Screen name="AddDepartment" component={AddDepartmentScreen} />
      <Stack.Screen name="EditDepartment" component={EditDepartmentScreen} />
    </Stack.Navigator>
  );
}
