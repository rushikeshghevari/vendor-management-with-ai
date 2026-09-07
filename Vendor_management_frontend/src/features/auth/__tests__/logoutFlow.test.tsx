import { act, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ROLES } from '@/constants/roles';
import { useLogoutMutation } from '@/features/auth/api/authApi';
import { sessionRestored } from '@/features/auth/authSlice';
import { useAuth } from '@/hooks/useAuth';
import { createStore } from '@/store';
import { apiEnvelope } from '@/test/apiEnvelope';
import { renderWithProviders } from '@/test/renderWithProviders';
import { secureStorage } from '@/utils/secureStorage';

jest.mock('@/services/apiClient', () => ({
  apiClient: { request: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { apiClient } = require('@/services/apiClient');

function LogoutProbe() {
  const { isAuthenticated } = useAuth();
  const [logout] = useLogoutMutation();
  return (
    <>
      <Text>{isAuthenticated ? 'authenticated' : 'logged-out'}</Text>
      <Text onPress={() => logout()}>trigger-logout</Text>
    </>
  );
}

describe('Logout flow (end to end through RTK Query)', () => {
  it('clears stored tokens and logs the user out when the server confirms logout', async () => {
    await secureStorage.setTokens('access-token', 'refresh-token');
    apiClient.request.mockResolvedValue({ data: apiEnvelope(null) });

    const store = createStore();
    store.dispatch(
      sessionRestored({ id: '1', name: 'Jane', email: 'jane@vms.local', role: ROLES.SUPER_ADMIN }),
    );

    renderWithProviders(<LogoutProbe />, store);
    expect(screen.getByText('authenticated')).toBeTruthy();

    await act(async () => {
      screen.getByText('trigger-logout').props.onPress();
    });

    await waitFor(() => expect(screen.getByText('logged-out')).toBeTruthy());
    expect(await secureStorage.getAccessToken()).toBeNull();
    expect(await secureStorage.getRefreshToken()).toBeNull();
  });

  it('still clears local session even if the server logout call fails', async () => {
    await secureStorage.setTokens('access-token', 'refresh-token');
    apiClient.request.mockRejectedValue({ response: { status: 500, data: { message: 'Server error' } } });

    const store = createStore();
    store.dispatch(
      sessionRestored({ id: '1', name: 'Jane', email: 'jane@vms.local', role: ROLES.SUPER_ADMIN }),
    );

    renderWithProviders(<LogoutProbe />, store);

    await act(async () => {
      screen.getByText('trigger-logout').props.onPress();
    });

    await waitFor(() => expect(screen.getByText('logged-out')).toBeTruthy());
    expect(await secureStorage.getAccessToken()).toBeNull();
  });
});
