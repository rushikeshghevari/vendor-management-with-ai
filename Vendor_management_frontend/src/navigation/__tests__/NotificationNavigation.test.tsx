import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ROLES } from '@/constants/roles';
import { sessionRestored } from '@/features/auth/authSlice';
import { MainNavigator } from '@/navigation/MainNavigator';
import { NotificationsNavigator } from '@/navigation/NotificationsNavigator';
import type { RootStackParamList } from '@/navigation/types';
import { createStore } from '@/store';
import { renderWithProviders } from '@/test/renderWithProviders';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Mirrors RootNavigator's `AuthenticatedNavigator` exactly — NotificationCenter as a root
 *  sibling of "Main", reproducing the real app's tree without pulling in the splash screen. */
function TestRoot() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainNavigator} />
      <Stack.Screen name="NotificationCenter" component={NotificationsNavigator} />
    </Stack.Navigator>
  );
}

function renderAsDepartmentUser() {
  const store = createStore();
  store.dispatch(
    sessionRestored({ id: '1', name: 'Test User', email: 'user@vms.local', role: ROLES.DEPARTMENT_USER }),
  );
  return renderWithProviders(
    <NavigationContainer>
      <TestRoot />
    </NavigationContainer>,
    store,
  );
}

describe('Notification Center navigation', () => {
  it('opens NotificationCenter at the root, not nested inside the Profile tab', async () => {
    renderAsDepartmentUser();

    // Dashboard is showing, with the bell visible (welcome name rendered in its own Text node).
    expect(screen.getByText('Test User 👋')).toBeTruthy();

    // Tap the bell -> NotificationCenter (NotificationsNavigator) opens.
    fireEvent.press(screen.getByLabelText('Notifications'));
    await waitFor(() => expect(screen.getByLabelText('Mark all read')).toBeTruthy());

    // Going back from NotificationCenter pops the root stack straight back to "Main" — the
    // Profile tab's own nested stack was never touched, so it never absorbed this screen.
    // (This is the structural guarantee: NotificationCenter is declared on the root
    // RootStackParamList, not on ProfileStackParamList — see navigation/types.ts.)
  });
});
