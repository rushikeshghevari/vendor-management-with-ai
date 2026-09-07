import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { NotificationsScreen }        from '@/features/notifications/screens/NotificationsScreen';
import { NotificationSettingsScreen } from '@/features/notifications/screens/NotificationSettingsScreen';
import type { NotificationsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

export function NotificationsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationList"     component={NotificationsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
}
