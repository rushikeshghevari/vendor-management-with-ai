import { act, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ROLES } from '@/constants/roles';
import { useLoginMutation } from '@/features/auth/api/authApi';
import { useAuth } from '@/hooks/useAuth';
import { apiEnvelope } from '@/test/apiEnvelope';
import { renderWithProviders } from '@/test/renderWithProviders';
import { secureStorage } from '@/utils/secureStorage';

jest.mock('@/services/apiClient', () => ({
  apiClient: { request: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { apiClient } = require('@/services/apiClient');

function LoginProbe() {
  const { isAuthenticated, user } = useAuth();
  const [login, { error }] = useLoginMutation();
  return (
    <>
      <Text>{isAuthenticated ? `authenticated:${user?.email}` : 'logged-out'}</Text>
      {error && 'message' in error ? <Text>error:{error.message}</Text> : null}
      <Text onPress={() => login({ email: 'jane@vms.local', password: 'CorrectPass1!' })}>
        trigger-login
      </Text>
    </>
  );
}

describe('Login flow (end to end through RTK Query)', () => {
  afterEach(async () => {
    await secureStorage.clearTokens();
  });

  it('stores the real string tokens (not the response envelope) and authenticates', async () => {
    apiClient.request.mockResolvedValue({
      data: apiEnvelope({
        accessToken: 'real-access-token',
        refreshToken: 'real-refresh-token',
        user: { id: '1', name: 'Jane', email: 'jane@vms.local', role: ROLES.SUPER_ADMIN },
      }),
    });

    renderWithProviders(<LoginProbe />);

    await act(async () => {
      screen.getByText('trigger-login').props.onPress();
    });

    await waitFor(() => expect(screen.getByText('authenticated:jane@vms.local')).toBeTruthy());

    // This is the regression check for the envelope-unwrapping bug: secureStorage
    // must receive the actual JWT strings, not `undefined` (which SecureStore rejects).
    expect(await secureStorage.getAccessToken()).toBe('real-access-token');
    expect(await secureStorage.getRefreshToken()).toBe('real-refresh-token');
  });

  it('surfaces a validation error without throwing an unhandled rejection', async () => {
    apiClient.request.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: 'Validation failed', errors: { email: ['Invalid email address'] } } },
    });

    renderWithProviders(<LoginProbe />);

    await act(async () => {
      screen.getByText('trigger-login').props.onPress();
    });

    await waitFor(() => expect(screen.getByText('error:Validation failed')).toBeTruthy());
    expect(screen.getByText('logged-out')).toBeTruthy();
    expect(await secureStorage.getAccessToken()).toBeNull();
  });
});
