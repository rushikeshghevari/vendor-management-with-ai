import { Alert } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { ROLES } from '@/constants/roles';
import { useLogoutMutation } from '@/features/auth/api/authApi';
import { sessionRestored } from '@/features/auth/authSlice';
import { ProfileScreen } from '@/navigation/screens/ProfileScreen';
import { createStore } from '@/store';
import { renderWithProviders } from '@/test/renderWithProviders';

// ProfileScreen calls useNavigation() for the Notification Center deep-link.
// Unit tests here render the screen in isolation (no NavigationContainer), so
// we stub the hook to a no-op rather than wrapping the whole navigator stack.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), getParent: jest.fn(() => null) }),
  };
});

jest.mock('@/features/auth/api/authApi', () => ({
  useLogoutMutation: jest.fn(),
}));

const mockUseLogoutMutation = useLogoutMutation as jest.Mock;

const mockNavigation = { navigate: jest.fn() } as never;
const mockRoute = {} as never;

describe('ProfileScreen logout', () => {
  it('shows the current user and triggers the logout mutation on press', () => {
    const logout = jest.fn();
    mockUseLogoutMutation.mockReturnValue([logout, { isLoading: false }]);

    const store = createStore();
    store.dispatch(
      sessionRestored({
        id: '1',
        name: 'Jane Doe',
        email: 'jane@vms.local',
        role: ROLES.SUPER_ADMIN,
      }),
    );

    renderWithProviders(<ProfileScreen navigation={mockNavigation} route={mockRoute} />, store);

    expect(screen.getAllByText(/jane@vms.local/).length).toBeGreaterThan(0);

    // Logout shows a confirmation Alert; intercept it and immediately invoke the destructive action.
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons: any) => {
      const logoutBtn = (buttons ?? []).find((b: any) => b.style === 'destructive');
      logoutBtn?.onPress?.();
    });

    fireEvent.press(screen.getByText('Logout'));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('shows a loading label and hides the Logout button while the request is in flight', () => {
    mockUseLogoutMutation.mockReturnValue([jest.fn(), { isLoading: true }]);

    renderWithProviders(<ProfileScreen navigation={mockNavigation} route={mockRoute} />);

    // When isLoading=true the button label switches to "Logging out…"
    expect(screen.getByText('Logging out…')).toBeTruthy();
    // The plain "Logout" label is no longer rendered
    expect(screen.queryByText('Logout')).toBeNull();
  });
});
