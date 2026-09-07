import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

import { SplashScreen } from '@/bootstrap/SplashScreen';
import { useAuth } from '@/hooks/useAuth';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { MainNavigator } from '@/navigation/MainNavigator';
import { NotificationsNavigator } from '@/navigation/NotificationsNavigator';
import { QuotationApprovalScreen } from '@/features/quotations/screens/QuotationApprovalScreen';
import { BillFinancialApprovalScreen } from '@/features/bills/screens/BillFinancialApprovalScreen';
import { VendorDetailsRootScreen } from '@/features/vendors/screens/VendorDetailsRootScreen';
import { PaymentDetailsRootScreen } from '@/features/payments/screens/PaymentDetailsRootScreen';
import type { RootStackParamList } from '@/navigation/types';

/** Minimum time the splash stays on screen, regardless of how fast auth bootstrap finishes. */
const SPLASH_MIN_DURATION_MS = 3000;

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * NotificationCenter lives here — a sibling of "Main", not nested inside the Profile tab's
 * own stack. Tab navigators preserve each tab's nested state across switches; if
 * NotificationCenter were pushed as the first-ever screen of the Profile tab's stack (as it
 * used to be), React Navigation initializes that stack's state with NotificationCenter as its
 * only/root entry — never ProfileHome — so Back falls through to the tab navigator (landing
 * on Dashboard) and the Profile tab forever after shows NotificationCenter instead of
 * ProfileScreen. Keeping it at the root sidesteps that entirely: Back always pops straight to
 * whatever was visible underneath, and the Profile tab's own stack is never touched.
 */
function AuthenticatedNavigator() {
  usePushNotifications();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainNavigator} />
      <Stack.Screen name="NotificationCenter" component={NotificationsNavigator} />
      {/* Root-level so notification taps can navigate here regardless of tab depth */}
      <Stack.Screen name="QuotationApproval" component={QuotationApprovalScreen} />
      <Stack.Screen name="BillFinancialApproval" component={BillFinancialApprovalScreen} />
      <Stack.Screen name="VendorDetailsRoot" component={VendorDetailsRootScreen} />
      <Stack.Screen name="PaymentDetailsRoot" component={PaymentDetailsRootScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  useAuthBootstrap();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const [splashDismissed, setSplashDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!splashDismissed) {
    const readyToDismiss = minDurationElapsed && !isBootstrapping;
    return <SplashScreen visible={!readyToDismiss} onHidden={() => setSplashDismissed(true)} />;
  }

  return <NavigationContainer>{isAuthenticated ? <AuthenticatedNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
