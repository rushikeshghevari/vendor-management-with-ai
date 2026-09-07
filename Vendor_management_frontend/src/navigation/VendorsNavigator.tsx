import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddVendorScreen } from '@/features/vendors/screens/AddVendorScreen';
import { EditVendorScreen } from '@/features/vendors/screens/EditVendorScreen';
import { VendorDetailsScreen } from '@/features/vendors/screens/VendorDetailsScreen';
import { VendorListScreen } from '@/features/vendors/screens/VendorListScreen';
import type { VendorsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<VendorsStackParamList>();

export function VendorsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VendorList" component={VendorListScreen} />
      <Stack.Screen name="VendorDetails" component={VendorDetailsScreen} />
      <Stack.Screen name="AddVendor" component={AddVendorScreen} />
      <Stack.Screen name="EditVendor" component={EditVendorScreen} />
    </Stack.Navigator>
  );
}
