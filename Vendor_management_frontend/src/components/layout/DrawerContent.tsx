import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useDrawer } from '@/navigation/context/DrawerContext';
import { useAuth } from '@/hooks/useAuth';
import { useLogoutMutation } from '@/features/auth/api/authApi';
import { useGetPurchaseOrderStatsQuery } from '@/features/purchaseOrders/api/purchaseOrdersApi';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrator',
  hod: 'HOD',
  director: 'Director',
  ceo: 'CEO',
  department_user: 'Department User',
  accounts: 'Accounts',
  payment_department: 'Payment Department',
};

interface TabNavItem {
  kind: 'tab';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  tab: string;
}

interface ActionNavItem {
  kind: 'action';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: 'notifications' | 'system-settings' | 'profile';
}

type NavEntry = TabNavItem | ActionNavItem;

// ─── Per-role primary navigation ────────────────────────────────────────────

const NAV_SUPER_ADMIN: TabNavItem[] = [
  { kind: 'tab', label: 'Dashboard',       icon: 'home-outline',          activeIcon: 'home',             tab: 'Dashboard'      },
  { kind: 'tab', label: 'Departments',     icon: 'business-outline',      activeIcon: 'business',         tab: 'Departments'    },
  { kind: 'tab', label: 'Users',           icon: 'people-outline',        activeIcon: 'people',           tab: 'Users'          },
  { kind: 'tab', label: 'Vendors',         icon: 'storefront-outline',    activeIcon: 'storefront',       tab: 'Vendors'        },
  { kind: 'tab', label: 'Requirements',    icon: 'list-outline',          activeIcon: 'list',              tab: 'Requirements'   },
  { kind: 'tab', label: 'Quotations',      icon: 'document-text-outline', activeIcon: 'document-text',    tab: 'Quotations'     },
  { kind: 'tab', label: 'Bills',           icon: 'receipt-outline',       activeIcon: 'receipt',          tab: 'Bills'          },
  { kind: 'tab', label: 'Purchase Orders', icon: 'clipboard-outline',     activeIcon: 'clipboard',        tab: 'PurchaseOrders' },
  { kind: 'tab', label: 'Payments',        icon: 'card-outline',          activeIcon: 'card',             tab: 'Payments'       },
  { kind: 'tab', label: 'Reports',         icon: 'bar-chart-outline',     activeIcon: 'bar-chart',        tab: 'Reports'        },
];

const NAV_HOD: TabNavItem[] = [
  { kind: 'tab', label: 'Dashboard',       icon: 'home-outline',          activeIcon: 'home',          tab: 'Dashboard'      },
  { kind: 'tab', label: 'Users',           icon: 'people-outline',        activeIcon: 'people',        tab: 'Users'          },
  { kind: 'tab', label: 'Vendors',         icon: 'storefront-outline',    activeIcon: 'storefront',    tab: 'Vendors'        },
  { kind: 'tab', label: 'Requirements',    icon: 'list-outline',          activeIcon: 'list',           tab: 'Requirements'   },
  { kind: 'tab', label: 'Quotations',      icon: 'document-text-outline', activeIcon: 'document-text', tab: 'Quotations'     },
  { kind: 'tab', label: 'Bills',           icon: 'receipt-outline',       activeIcon: 'receipt',       tab: 'Bills'          },
  { kind: 'tab', label: 'Purchase Orders', icon: 'clipboard-outline',     activeIcon: 'clipboard',     tab: 'PurchaseOrders' },
];

const NAV_DEPARTMENT_USER: TabNavItem[] = [
  { kind: 'tab', label: 'Dashboard',       icon: 'home-outline',          activeIcon: 'home',          tab: 'Dashboard'      },
  { kind: 'tab', label: 'Vendors',         icon: 'storefront-outline',    activeIcon: 'storefront',    tab: 'Vendors'        },
  { kind: 'tab', label: 'Requirements',    icon: 'list-outline',          activeIcon: 'list',           tab: 'Requirements'   },
  { kind: 'tab', label: 'Quotations',      icon: 'document-text-outline', activeIcon: 'document-text', tab: 'Quotations'     },
  { kind: 'tab', label: 'Bills',           icon: 'receipt-outline',       activeIcon: 'receipt',       tab: 'Bills'          },
  { kind: 'tab', label: 'Purchase Orders', icon: 'clipboard-outline',     activeIcon: 'clipboard',     tab: 'PurchaseOrders' },
  { kind: 'tab', label: 'Payments',        icon: 'card-outline',          activeIcon: 'card',          tab: 'Payments'       },
];

const NAV_CEO: TabNavItem[] = [
  { kind: 'tab', label: 'Dashboard',          icon: 'home-outline',          activeIcon: 'home',          tab: 'Dashboard'          },
  { kind: 'tab', label: 'Quotation Approvals',icon: 'document-text-outline', activeIcon: 'document-text', tab: 'PendingQuotations'  },
  { kind: 'tab', label: 'Bill Approvals',     icon: 'receipt-outline',       activeIcon: 'receipt',       tab: 'PendingBillApprovals'},
  // Read-only pipeline visibility (additive) — view only, no write actions.
  { kind: 'tab', label: 'Requirements',       icon: 'list-outline',          activeIcon: 'list',          tab: 'Requirements'       },
  { kind: 'tab', label: 'Purchase Orders',    icon: 'clipboard-outline',     activeIcon: 'clipboard',     tab: 'PurchaseOrders'     },
  { kind: 'tab', label: 'Reports',            icon: 'bar-chart-outline',     activeIcon: 'bar-chart',     tab: 'Reports'            },
];

const NAV_DIRECTOR: TabNavItem[] = [
  { kind: 'tab', label: 'Dashboard',       icon: 'home-outline',          activeIcon: 'home',          tab: 'Dashboard'          },
  { kind: 'tab', label: 'Requirements',    icon: 'list-outline',          activeIcon: 'list',           tab: 'Requirements'       },
  { kind: 'tab', label: 'Quotation Reviews',icon: 'document-text-outline', activeIcon: 'document-text', tab: 'PendingQuotations'  },
  { kind: 'tab', label: 'Bill Reviews',    icon: 'receipt-outline',       activeIcon: 'receipt',       tab: 'PendingBillApprovals'},
  { kind: 'tab', label: 'Purchase Orders', icon: 'clipboard-outline',     activeIcon: 'clipboard',     tab: 'PurchaseOrders'     },
  { kind: 'tab', label: 'Reports',         icon: 'bar-chart-outline',     activeIcon: 'bar-chart',     tab: 'Reports'            },
];

const NAV_ACCOUNTS: TabNavItem[] = [
  { kind: 'tab', label: 'Dashboard',       icon: 'home-outline',      activeIcon: 'home',      tab: 'Dashboard'      },
  { kind: 'tab', label: 'Bills',           icon: 'receipt-outline',   activeIcon: 'receipt',   tab: 'Bills'          },
  // Read-only pipeline visibility (additive) — view only, no write actions.
  { kind: 'tab', label: 'Requirements',    icon: 'list-outline',      activeIcon: 'list',      tab: 'Requirements'   },
  { kind: 'tab', label: 'Purchase Orders', icon: 'clipboard-outline', activeIcon: 'clipboard', tab: 'PurchaseOrders' },
  { kind: 'tab', label: 'Payments',        icon: 'card-outline',      activeIcon: 'card',      tab: 'Payments'       },
  { kind: 'tab', label: 'Reports',         icon: 'bar-chart-outline', activeIcon: 'bar-chart', tab: 'Reports'        },
];

const NAV_PAYMENT: TabNavItem[] = [
  { kind: 'tab', label: 'Dashboard', icon: 'home-outline',      activeIcon: 'home',      tab: 'Dashboard' },
  { kind: 'tab', label: 'Payments',  icon: 'card-outline',      activeIcon: 'card',      tab: 'Payments'  },
  // Read-only pipeline visibility (additive) — view only, no write actions.
  { kind: 'tab', label: 'Requirements', icon: 'list-outline',   activeIcon: 'list',      tab: 'Requirements' },
  { kind: 'tab', label: 'Purchase Orders', icon: 'clipboard-outline', activeIcon: 'clipboard', tab: 'PurchaseOrders' },
  { kind: 'tab', label: 'Reports',   icon: 'bar-chart-outline', activeIcon: 'bar-chart', tab: 'Reports'   },
];

const ROLE_PRIMARY_NAV: Record<string, TabNavItem[]> = {
  super_admin:        NAV_SUPER_ADMIN,
  hod:                 NAV_HOD,
  department_user:    NAV_DEPARTMENT_USER,
  ceo:                NAV_CEO,
  director:           NAV_DIRECTOR,
  accounts:           NAV_ACCOUNTS,
  payment_department: NAV_PAYMENT,
};

const SECONDARY_NAV: ActionNavItem[] = [
  { kind: 'action', label: 'Notifications', icon: 'notifications-outline', action: 'notifications' },
  { kind: 'action', label: 'Profile',        icon: 'person-outline',        action: 'profile'        },
];

const SECONDARY_NAV_SUPER_ADMIN: ActionNavItem[] = [
  { kind: 'action', label: 'Notifications',   icon: 'notifications-outline', action: 'notifications'   },
  { kind: 'action', label: 'System Settings', icon: 'settings-outline',      action: 'system-settings' },
  { kind: 'action', label: 'Profile',          icon: 'person-outline',        action: 'profile'          },
];

export function DrawerContent() {
  const { user } = useAuth();
  const drawer = useDrawer();
  const [logout] = useLogoutMutation();
  const navigation = useNavigation();

  if (!drawer) return null;

  const { closeDrawer, navigateToTab, activeTab, setActiveTab } = drawer;

  const role = user?.role ?? 'department_user';
  const primaryNav = ROLE_PRIMARY_NAV[role] ?? NAV_DEPARTMENT_USER;
  const secondaryNav = role === 'super_admin' ? SECONDARY_NAV_SUPER_ADMIN : SECONDARY_NAV;

  // "What's blocking me from moving a PO forward" queue counts — only Department User/HOD
  // ever see the Record-GRN / Create-Bill buttons these correspond to (PurchaseOrderDetailsScreen),
  // so this is skipped entirely for every other role rather than showing an unactionable badge.
  const canActOnPoQueue = role === 'department_user' || role === 'hod';
  const { data: poStats } = useGetPurchaseOrderStatsQuery(undefined, { skip: !canActOnPoQueue });
  const queueBadgeForTab: Record<string, number> = canActOnPoQueue
    ? { PurchaseOrders: poStats?.pendingGoodsReceipt ?? 0, Bills: poStats?.pendingBill ?? 0 }
    : {};

  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  const roleLabel = ROLE_LABELS[role] ?? 'Team Member';

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    navigateToTab(tab);
    closeDrawer();
  };

  const handleAction = (action: ActionNavItem['action']) => {
    closeDrawer();
    if (action === 'notifications') {
      let nav = navigation as unknown as { getParent?: () => unknown; navigate: (name: string) => void };
      while (nav.getParent?.()) {
        nav = nav.getParent!() as typeof nav;
      }
      nav.navigate('NotificationCenter');
    } else if (action === 'system-settings') {
      setActiveTab('Profile');
      navigateToTab('Profile', { screen: 'SystemSettings' });
    } else if (action === 'profile') {
      setActiveTab('Profile');
      navigateToTab('Profile');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          closeDrawer();
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'bottom']}>
      {/* Header: user info */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'Administrator'}</Text>
        <Text style={styles.userRole}>{roleLabel}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Navigation items */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {primaryNav.map((item) => {
            const isActive = activeTab === item.tab;
            const queueCount = queueBadgeForTab[item.tab] ?? 0;
            return (
              <Pressable
                key={item.label}
                onPress={() => handleTabPress(item.tab)}
                style={[styles.navItem, isActive && styles.navItemActive]}
                accessibilityRole="button"
                accessibilityLabel={queueCount > 0 ? `${item.label}, ${queueCount} pending` : item.label}
              >
                {isActive && <View style={styles.activeIndicator} />}
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={20}
                  color={isActive ? '#60a5fa' : '#94a3b8'}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {queueCount > 0 ? (
                  <View style={styles.queueBadge}>
                    <Text style={styles.queueBadgeText}>{queueCount > 99 ? '99+' : queueCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          {secondaryNav.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => handleAction(item.action)}
              style={styles.navItem}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons name={item.icon} size={20} color="#94a3b8" />
              <Text style={styles.navLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Footer: logout + version */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        <Pressable onPress={handleLogout} style={styles.logoutButton} accessibilityRole="button" accessibilityLabel="Logout">
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text style={styles.logoutLabel}>Logout</Text>
        </Pressable>
        <Text style={styles.version}>Vendor Management App</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e88e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  userRole: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: '#64748b',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    marginHorizontal: 0,
  },
  scroll: {
    flex: 1,
  },
  section: {
    paddingVertical: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(96, 165, 250, 0.10)',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#60a5fa',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  navLabel: {
    marginLeft: 14,
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  navLabelActive: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  queueBadge: {
    marginLeft: 'auto',
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  logoutLabel: {
    marginLeft: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
  },
  version: {
    color: '#334155',
    fontSize: 11,
    paddingBottom: 4,
  },
});
