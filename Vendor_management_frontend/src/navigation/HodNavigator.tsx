import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillsNavigator } from '@/navigation/BillsNavigator';
import { DrawerProvider } from '@/navigation/context/DrawerContext';
import { DrawerShell } from '@/navigation/DrawerShell';
import { HodDashboardScreen } from '@/navigation/screens/HodDashboardScreen';
import { HodUsersNavigator } from '@/navigation/HodUsersNavigator';
import { ProfileNavigator } from '@/navigation/ProfileNavigator';
import { PurchaseOrdersNavigator } from '@/navigation/PurchaseOrdersNavigator';
import { QuotationsNavigator } from '@/navigation/QuotationsNavigator';
import { RequirementsNavigator } from '@/navigation/RequirementsNavigator';
import { VendorsNavigator } from '@/navigation/VendorsNavigator';
import type { HodTabParamList } from '@/navigation/types';

const HodTab = createBottomTabNavigator<HodTabParamList>();

// Mirrors MainNavigator.tsx's floating pill tab bar exactly — same visual language across
// every role that gets a visible bottom bar, so it doesn't look like a different app per role.
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

function HodTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = baseTabBarStyle(insets.bottom);

  return (
    <HodTab.Navigator
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
      <HodTab.Screen
        name="Dashboard"
        component={HodDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <HodTab.Screen
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
      <HodTab.Screen
        name="Quotations"
        component={QuotationsNavigator}
        options={({ route }) => ({
          title: 'Quotations',
          tabBarStyle: getTabBarStyle(route, 'QuotationList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={21} color={color} />
          ),
        })}
      />
      <HodTab.Screen
        name="PurchaseOrders"
        component={PurchaseOrdersNavigator}
        options={({ route }) => ({
          title: 'Purchase Orders',
          tabBarStyle: getTabBarStyle(route, 'PurchaseOrderList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={21} color={color} />
          ),
        })}
      />
      <HodTab.Screen
        name="Bills"
        component={BillsNavigator}
        options={({ route }) => ({
          title: 'Bills',
          tabBarStyle: getTabBarStyle(route, 'BillList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={21} color={color} />
          ),
        })}
      />

      <HodTab.Screen name="Users" component={HodUsersNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <HodTab.Screen name="Vendors" component={VendorsNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <HodTab.Screen name="Profile" component={ProfileNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
    </HodTab.Navigator>
  );
}

/** HOD — department-wide access to Users (via /hod/users), Vendors, Quotations, Bills, and
 *  Purchase Orders (reusing the same navigators/screens Department User uses — the backend
 *  scopes those endpoints to the HOD's whole department, not just self-created records). */
export function HodNavigator() {
  return (
    <DrawerProvider>
      <DrawerShell>
        <HodTabs />
      </DrawerShell>
    </DrawerProvider>
  );
}
