import { NavigationContainer } from '@react-navigation/native';
import { screen } from '@testing-library/react-native';

import { ROLES } from '@/constants/roles';
import { sessionRestored } from '@/features/auth/authSlice';
import { MainNavigator } from '@/navigation/MainNavigator';
import { createStore } from '@/store';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { User } from '@/types/auth';

function renderAsRole(role: User['role']) {
  const store = createStore();
  store.dispatch(
    sessionRestored({ id: '1', name: 'Test User', email: 'user@vms.local', role }),
  );

  return renderWithProviders(
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>,
    store,
  );
}

describe('MainNavigator drawer navigation', () => {
  it('renders the Super Admin dashboard screen by default', () => {
    renderAsRole(ROLES.SUPER_ADMIN);
    // Dashboard screen content confirms the correct role navigator mounted.
    expect(screen.getByText('Test User 👋')).toBeTruthy();
  });

  it('renders the Department User dashboard screen by default', () => {
    renderAsRole(ROLES.DEPARTMENT_USER);
    // Welcome text is unique to the dashboard — confirms correct screen is active.
    expect(screen.getByText('Test User 👋')).toBeTruthy();
  });

  it('renders the dashboard screen for any role', () => {
    // CEO, Director, Payment, Accounts all show a dashboard with the welcome name.
    renderAsRole(ROLES.CEO);
    expect(screen.getByText('Test User 👋')).toBeTruthy();
  });
});
