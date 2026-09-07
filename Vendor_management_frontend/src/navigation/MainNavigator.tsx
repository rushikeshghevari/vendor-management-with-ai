import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountsBillsNavigator } from '@/navigation/AccountsBillsNavigator';
import { ComingSoonScreen } from '@/navigation/screens/ComingSoonScreen';
import { DepartmentUserDashboardScreen } from '@/navigation/screens/DepartmentUserDashboardScreen';
import { BillsNavigator } from '@/navigation/BillsNavigator';
import { CeoNavigator } from '@/navigation/CeoNavigator';
import { DirectorNavigator } from '@/navigation/DirectorNavigator';
import { HodNavigator } from '@/navigation/HodNavigator';
import { PaymentNavigator } from '@/navigation/PaymentNavigator';
import { PaymentsNavigator } from '@/navigation/PaymentsNavigator';
import { ProfileNavigator } from '@/navigation/ProfileNavigator';
import { PurchaseOrdersNavigator } from '@/navigation/PurchaseOrdersNavigator';
import { QuotationsNavigator } from '@/navigation/QuotationsNavigator';
import { RequirementsNavigator } from '@/navigation/RequirementsNavigator';
import { SuperAdminNavigator } from '@/navigation/SuperAdminNavigator';
import { VendorsNavigator } from '@/navigation/VendorsNavigator';
import { DrawerProvider } from '@/navigation/context/DrawerContext';
import { DrawerShell } from '@/navigation/DrawerShell';
import { ROLES } from '@/constants/roles';
import { AccountsDashboardScreen } from '@/features/accounts/screens/AccountsDashboardScreen';
import { useAuth } from '@/hooks/useAuth';
import type { AccountsTabParamList, DepartmentUserTabParamList } from '@/navigation/types';

const DepartmentUserTab = createBottomTabNavigator<DepartmentUserTabParamList>();
const AccountsTab = createBottomTabNavigator<AccountsTabParamList>();

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

function DepartmentUserTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = baseTabBarStyle(insets.bottom);

  return (
    <DepartmentUserTab.Navigator
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
      <DepartmentUserTab.Screen
        name="Dashboard"
        component={DepartmentUserDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <DepartmentUserTab.Screen
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
      <DepartmentUserTab.Screen
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
      <DepartmentUserTab.Screen
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
      <DepartmentUserTab.Screen
        name="Vendors"
        component={VendorsNavigator}
        options={({ route }) => ({
          title: 'Vendors',
          tabBarStyle: getTabBarStyle(route, 'VendorList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={21} color={color} />
          ),
        })}
      />

      <DepartmentUserTab.Screen name="PurchaseOrders" component={PurchaseOrdersNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <DepartmentUserTab.Screen name="Payments" component={PaymentsNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <DepartmentUserTab.Screen name="Profile" component={ProfileNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
    </DepartmentUserTab.Navigator>
  );
}

function DepartmentUserNavigator() {
  return (
    <DrawerProvider>
      <DrawerShell>
        <DepartmentUserTabs />
      </DrawerShell>
    </DrawerProvider>
  );
}

function AccountsTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = baseTabBarStyle(insets.bottom);

  return (
    <AccountsTab.Navigator
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
      <AccountsTab.Screen
        name="Dashboard"
        component={AccountsDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <AccountsTab.Screen
        name="Bills"
        component={AccountsBillsNavigator}
        options={({ route }) => ({
          title: 'Bills',
          tabBarStyle: getTabBarStyle(route, 'AccountsBillList', tabBarStyle),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={21} color={color} />
          ),
        })}
      />
      {/* Reuses the Requirements stack, relabeled "Quotations" — that's where the full
          per-requirement quotation comparison (and which one was accepted) already lives;
          Accounts never mutates a quotation, only needs to see this. */}
      <AccountsTab.Screen
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
      <AccountsTab.Screen
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

      <AccountsTab.Screen name="PurchaseOrders" component={PurchaseOrdersNavigator} options={{ title: 'Purchase Orders', tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <AccountsTab.Screen name="Payments" component={PaymentsNavigator} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <AccountsTab.Screen name="Reports" component={ReportsPlaceholder} options={{ tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
    </AccountsTab.Navigator>
  );
}

function AccountsNavigator() {
  return (
    <DrawerProvider>
      <DrawerShell>
        <AccountsTabs />
      </DrawerShell>
    </DrawerProvider>
  );
}

/**
 * Role-based route protection: every role gets its own navigator.
 * All roles use a drawer-based navigator — the drawer replaces the bottom tab bar.
 */
export function MainNavigator() {
  const { hasRole } = useAuth();
  if (hasRole(ROLES.SUPER_ADMIN))        return <SuperAdminNavigator />;
  if (hasRole(ROLES.HOD))                return <HodNavigator />;
  if (hasRole(ROLES.ACCOUNTS))           return <AccountsNavigator />;
  if (hasRole(ROLES.DIRECTOR))           return <DirectorNavigator />;
  if (hasRole(ROLES.CEO))                return <CeoNavigator />;
  if (hasRole(ROLES.PAYMENT_DEPARTMENT)) return <PaymentNavigator />;
  return <DepartmentUserNavigator />;
}
