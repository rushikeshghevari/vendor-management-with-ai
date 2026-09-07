import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentsNavigator } from '@/navigation/PaymentsNavigator';
import { PaymentDashboardScreen } from '@/navigation/screens/PaymentDashboardScreen';
import { ComingSoonScreen } from '@/navigation/screens/ComingSoonScreen';
import { ProfileNavigator } from '@/navigation/ProfileNavigator';
import { PurchaseOrdersNavigator } from '@/navigation/PurchaseOrdersNavigator';
import { RequirementsNavigator } from '@/navigation/RequirementsNavigator';
import { DrawerProvider } from '@/navigation/context/DrawerContext';
import { DrawerShell } from '@/navigation/DrawerShell';
import type { PaymentTabParamList } from '@/navigation/types';

const PaymentTab = createBottomTabNavigator<PaymentTabParamList>();

// Same pattern as the Department User / Super Admin tab bars — each navigator keeps its own
// local copy rather than sharing this small helper (established convention).
//
// marginBottom takes the device's safe-area bottom inset (gesture pill / 3-button nav bar,
// forced on by Expo SDK 54+'s edge-to-edge default) — a flat 10 wasn't enough clearance on
// devices with a taller system nav bar, so the phone's own buttons overlapped this floating bar.
function baseTabBarStyle(bottomInset: number) {
  return {
    height: 70,
    paddingBottom: 12,
    paddingTop: 8,
    marginHorizontal: 12,
    marginBottom: 10 + bottomInset,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    position: 'absolute' as const,
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  };
}

function getTabBarStyle(route: unknown, rootScreenName: string, style: ReturnType<typeof baseTabBarStyle>) {
  const routeName = getFocusedRouteNameFromRoute(route as any);
  if (routeName && routeName !== rootScreenName) {
    return { display: 'none' as const };
  }
  return style;
}

function ReportsPlaceholder() {
  return <ComingSoonScreen title="Reports" icon="bar-chart" />;
}

function PaymentTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = baseTabBarStyle(insets.bottom);

  return (
    <PaymentTab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1e88e5',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <PaymentTab.Screen
        name="Dashboard"
        component={PaymentDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <PaymentTab.Screen
        name="Payments"
        component={PaymentsNavigator}
        options={({ route }) => ({
          title: 'Payments',
          tabBarStyle: getTabBarStyle(route, 'PaymentList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'card' : 'card-outline'} size={21} color={color} />
          ),
        })}
      />
      {/* Reuses the Requirements stack, relabeled "Quotations" — that's where the full
          per-requirement quotation comparison (and which one was accepted) already lives;
          Payment Department never mutates a quotation, only needs to see this. */}
      <PaymentTab.Screen
        name="Requirements"
        component={RequirementsNavigator}
        options={({ route }) => ({
          title: 'Quotations',
          tabBarStyle: getTabBarStyle(route, 'RequirementList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={21} color={color} />
          ),
        })}
      />
      <PaymentTab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={({ route }) => ({
          title: 'Profile',
          tabBarStyle: getTabBarStyle(route, 'ProfileHome', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={21} color={color} />
          ),
        })}
      />

      <PaymentTab.Screen name="PurchaseOrders" component={PurchaseOrdersNavigator} options={{ title: 'Purchase Orders', tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <PaymentTab.Screen name="Reports" component={ReportsPlaceholder} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
    </PaymentTab.Navigator>
  );
}

/** Payment Department — full Payment Module access (create, process, mark paid/completed/failed, retry).
 *  Drawer replaces the bottom tab bar. */
export function PaymentNavigator() {
  return (
    <DrawerProvider>
      <DrawerShell>
        <PaymentTabs />
      </DrawerShell>
    </DrawerProvider>
  );
}
