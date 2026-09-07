import { act, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ROLES } from '@/constants/roles';
import { useAuth } from '@/hooks/useAuth';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { createStore } from '@/store';
import { apiEnvelope } from '@/test/apiEnvelope';
import { renderWithProviders } from '@/test/renderWithProviders';
import { authEvents } from '@/utils/authEvents';
import { secureStorage } from '@/utils/secureStorage';

jest.mock('@/services/apiClient', () => ({
  apiClient: { request: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { apiClient } = require('@/services/apiClient');

function Probe() {
  useAuthBootstrap();
  const { isBootstrapping, isAuthenticated, user } = useAuth();
  return (
    <Text>
      {JSON.stringify({ isBootstrapping, isAuthenticated, email: user?.email ?? null })}
    </Text>
  );
}

function readProbeState() {
  return JSON.parse(screen.getByText(/isBootstrapping/).props.children);
}

describe('useAuthBootstrap', () => {
  afterEach(async () => {
    await secureStorage.clearTokens();
  });

  it('finishes bootstrapping as unauthenticated when no token is stored', async () => {
    renderWithProviders(<Probe />);

    await waitFor(() => expect(readProbeState().isBootstrapping).toBe(false));
    expect(readProbeState()).toEqual({ isBootstrapping: false, isAuthenticated: false, email: null });
  });

  it('restores the session when a stored token resolves to a valid profile', async () => {
    await secureStorage.setTokens('access-token', 'refresh-token');
    apiClient.request.mockResolvedValue({
      data: apiEnvelope({ id: '1', name: 'Jane', email: 'jane@vms.local', role: ROLES.SUPER_ADMIN }),
    });

    renderWithProviders(<Probe />);

    await waitFor(() => expect(readProbeState().isBootstrapping).toBe(false));
    expect(readProbeState()).toEqual({
      isBootstrapping: false,
      isAuthenticated: true,
      email: 'jane@vms.local',
    });
  });

  it('clears tokens and stays logged out when the stored token is rejected by the API', async () => {
    await secureStorage.setTokens('expired-access-token', 'expired-refresh-token');
    apiClient.request.mockRejectedValue({ response: { status: 401, data: { message: 'Unauthorized' } } });

    renderWithProviders(<Probe />);

    await waitFor(() => expect(readProbeState().isBootstrapping).toBe(false));
    expect(readProbeState().isAuthenticated).toBe(false);
    expect(await secureStorage.getAccessToken()).toBeNull();
  });

  it('logs out when an "unauthorized" auth event fires (e.g. refresh failure mid-session)', async () => {
    const store = createStore();
    renderWithProviders(<Probe />, store);

    await waitFor(() => expect(readProbeState().isBootstrapping).toBe(false));

    act(() => {
      store.dispatch({
        type: 'auth/sessionRestored',
        payload: { id: '1', name: 'Jane', email: 'jane@vms.local', role: ROLES.SUPER_ADMIN },
      });
    });
    await waitFor(() => expect(readProbeState().isAuthenticated).toBe(true));

    act(() => {
      authEvents.emit('unauthorized');
    });

    await waitFor(() => expect(readProbeState().isAuthenticated).toBe(false));
  });
});
