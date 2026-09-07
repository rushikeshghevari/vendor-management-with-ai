import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillsNavigator } from '@/navigation/BillsNavigator';
import { DirectorDashboardScreen } from '@/navigation/screens/DirectorDashboardScreen';
import { ComingSoonScreen } from '@/navigation/screens/ComingSoonScreen';
import { ProfileNavigator } from '@/navigation/ProfileNavigator';
import { PurchaseOrdersNavigator } from '@/navigation/PurchaseOrdersNavigator';
import { QuotationsNavigator } from '@/navigation/QuotationsNavigator';
import { RequirementsNavigator } from '@/navigation/RequirementsNavigator';
import { DrawerProvider } from '@/navigation/context/DrawerContext';
import { DrawerShell } from '@/navigation/DrawerShell';
import type { DirectorTabParamList } from '@/navigation/types';

const DirectorTab = createBottomTabNavigator<DirectorTabParamList>();

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

function DirectorTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = baseTabBarStyle(insets.bottom);

  return (
    <DirectorTab.Navigator
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
      <DirectorTab.Screen
        name="Dashboard"
        component={DirectorDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <DirectorTab.Screen
        name="Requirements"
        component={RequirementsNavigator}
        options={({ route }) => ({
          title: 'Requirements',
          tabBarStyle: getTabBarStyle(route, 'RequirementList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'layers' : 'layers-outline'} size={21} color={color} />
          ),
        })}
      />
      <DirectorTab.Screen
        name="PendingQuotations"
        component={QuotationsNavigator}
        options={({ route }) => ({
          title: 'Quotations',
          tabBarStyle: getTabBarStyle(route, 'QuotationList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={21} color={color} />
          ),
        })}
      />
      <DirectorTab.Screen
        name="PendingBillApprovals"
        component={BillsNavigator}
        options={({ route }) => ({
          title: 'Bills',
          tabBarStyle: getTabBarStyle(route, 'BillList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={21} color={color} />
          ),
        })}
      />
      <DirectorTab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={21} color={color} />
          ),
        }}
      />

      <DirectorTab.Screen name="PurchaseOrders" component={PurchaseOrdersNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <DirectorTab.Screen name="Reports" component={ReportsPlaceholder} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
    </DirectorTab.Navigator>
  );
}

/** Director — Quotation and Bill reviews (read-only, role-gated inside shared screens).
 *  Drawer replaces the bottom tab bar. */
export function DirectorNavigator() {
  return (
    <DrawerProvider>
      <DrawerShell>
        <DirectorTabs />
      </DrawerShell>
    </DrawerProvider>
  );
}
