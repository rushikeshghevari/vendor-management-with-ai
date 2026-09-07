import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppSettingsScreen } from '@/navigation/screens/AppSettingsScreen';
import { ChangePasswordScreen } from '@/navigation/screens/ChangePasswordScreen';
import { ProfileScreen } from '@/navigation/screens/ProfileScreen';
import { SystemSettingsScreen } from '@/navigation/screens/SystemSettingsScreen';
import { ActivityLogListScreen } from '@/features/activityLog/screens/ActivityLogListScreen';
import { AiAuditLogListScreen } from '@/features/aiAuditLog/screens/AiAuditLogListScreen';
import type { ProfileStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="SystemSettings" component={SystemSettingsScreen} />
      <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
      <Stack.Screen name="ActivityLog" component={ActivityLogListScreen} />
      <Stack.Screen name="AiAuditLog" component={AiAuditLogListScreen} />
    </Stack.Navigator>
  );
}
