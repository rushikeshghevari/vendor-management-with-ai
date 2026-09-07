import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillsNavigator } from '@/navigation/BillsNavigator';
import { CeoDashboardScreen } from '@/navigation/screens/CeoDashboardScreen';
import { ComingSoonScreen } from '@/navigation/screens/ComingSoonScreen';
import { ProfileNavigator } from '@/navigation/ProfileNavigator';
import { PurchaseOrdersNavigator } from '@/navigation/PurchaseOrdersNavigator';
import { QuotationsNavigator } from '@/navigation/QuotationsNavigator';
import { RequirementsNavigator } from '@/navigation/RequirementsNavigator';
import { DrawerProvider } from '@/navigation/context/DrawerContext';
import { DrawerShell } from '@/navigation/DrawerShell';
import type { CeoTabParamList } from '@/navigation/types';

const CeoTab = createBottomTabNavigator<CeoTabParamList>();

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

function CeoTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = baseTabBarStyle(insets.bottom);

  return (
    <CeoTab.Navigator
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
      <CeoTab.Screen
        name="Dashboard"
        component={CeoDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <CeoTab.Screen
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
      <CeoTab.Screen
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
      <CeoTab.Screen
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
      <CeoTab.Screen
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

      <CeoTab.Screen name="PurchaseOrders" component={PurchaseOrdersNavigator} options={{ title: 'Purchase Orders', tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <CeoTab.Screen name="Reports" component={ReportsPlaceholder} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
    </CeoTab.Navigator>
  );
}

/** CEO — Quotation and Bill approvals within CEO Approval Limit (enforced server-side).
 *  Drawer replaces the bottom tab bar. */
export function CeoNavigator() {
  return (
    <DrawerProvider>
      <DrawerShell>
        <CeoTabs />
      </DrawerShell>
    </DrawerProvider>
  );
}
