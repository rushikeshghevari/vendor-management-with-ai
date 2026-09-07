import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillsNavigator } from '@/navigation/BillsNavigator';
import { DepartmentsNavigator } from '@/navigation/DepartmentsNavigator';
import { DrawerProvider } from '@/navigation/context/DrawerContext';
import { DrawerShell } from '@/navigation/DrawerShell';
import { PaymentsNavigator } from '@/navigation/PaymentsNavigator';
import { ProfileNavigator } from '@/navigation/ProfileNavigator';
import { PurchaseOrdersNavigator } from '@/navigation/PurchaseOrdersNavigator';
import { QuotationsNavigator } from '@/navigation/QuotationsNavigator';
import { RequirementsNavigator } from '@/navigation/RequirementsNavigator';
import { UsersNavigator } from '@/navigation/UsersNavigator';
import { VendorsNavigator } from '@/navigation/VendorsNavigator';
import { ReportsScreen } from '@/navigation/screens/ReportsScreen';
import { SuperAdminDashboardScreen } from '@/navigation/screens/SuperAdminDashboardScreen';
import type { MainTabParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Same pattern as the Department User tab bar in MainNavigator.tsx — each navigator keeps
// its own local copy rather than sharing this small helper (established convention).
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

function SuperAdminTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = baseTabBarStyle(insets.bottom);

  return (
    <Tab.Navigator
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
      <Tab.Screen
        name="Dashboard"
        component={SuperAdminDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Departments"
        component={DepartmentsNavigator}
        options={({ route }) => ({
          title: 'Departments',
          tabBarStyle: getTabBarStyle(route, 'DepartmentList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'business' : 'business-outline'} size={21} color={color} />
          ),
        })}
      />
      <Tab.Screen
        name="Users"
        component={UsersNavigator}
        options={({ route }) => ({
          title: 'Users',
          tabBarStyle: getTabBarStyle(route, 'UserList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={21} color={color} />
          ),
        })}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={({ route }) => ({
          title: 'Settings',
          tabBarStyle: getTabBarStyle(route, 'ProfileHome', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'options' : 'options-outline'} size={21} color={color} />
          ),
        })}
      />

      <Tab.Screen name="Vendors" component={VendorsNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Requirements" component={RequirementsNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Quotations" component={QuotationsNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Bills" component={BillsNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="PurchaseOrders" component={PurchaseOrdersNavigator} options={{ title: 'Purchase Orders', tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Payments" component={PaymentsNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

export function SuperAdminNavigator() {
  return (
    <DrawerProvider>
      <DrawerShell>
        <SuperAdminTabs />
      </DrawerShell>
    </DrawerProvider>
  );
}
