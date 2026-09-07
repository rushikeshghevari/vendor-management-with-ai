import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { useLoginMutation } from '@/features/auth/api/authApi';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/features/auth/api/authApi', () => ({
  useLoginMutation: jest.fn(),
}));

const mockUseLoginMutation = useLoginMutation as jest.Mock;

describe('LoginScreen', () => {
  it('renders the email and password fields and a login button', async () => {
    const login = jest.fn();
    mockUseLoginMutation.mockReturnValue([login, { isLoading: false, error: undefined }]);

    renderWithProviders(<LoginScreen />);
    await act(async () => {});

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();
  });

  it('submits the entered credentials to the login mutation', async () => {
    const login = jest.fn();
    mockUseLoginMutation.mockReturnValue([login, { isLoading: false, error: undefined }]);

    renderWithProviders(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'jane@vms.local');
    fireEvent.changeText(screen.getByLabelText('Password'), 'CorrectPass1!');
    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: 'jane@vms.local', password: 'CorrectPass1!' });
    });
  });

  it('shows the server error message when the password is invalid', async () => {
    mockUseLoginMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false, error: { status: 401, message: 'Invalid email or password' } },
    ]);

    renderWithProviders(<LoginScreen />);
    await act(async () => {});

    expect(screen.getByText('Invalid email or password')).toBeTruthy();
  });

  it('disables the login button while the request is in flight', async () => {
    mockUseLoginMutation.mockReturnValue([jest.fn(), { isLoading: true, error: undefined }]);

    renderWithProviders(<LoginScreen />);
    await act(async () => {});

    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled();
  });

  it('toggles password visibility via the eye icon', async () => {
    mockUseLoginMutation.mockReturnValue([jest.fn(), { isLoading: false, error: undefined }]);

    renderWithProviders(<LoginScreen />);
    await act(async () => {});

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByLabelText('Show password'));
    expect(passwordInput.props.secureTextEntry).toBe(false);

    fireEvent.press(screen.getByLabelText('Hide password'));
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('shows a contact-admin message when "Forgot Password?" is pressed', async () => {
    mockUseLoginMutation.mockReturnValue([jest.fn(), { isLoading: false, error: undefined }]);
    const alertSpy = jest.spyOn(Alert, 'alert');

    renderWithProviders(<LoginScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText('Forgot Password?'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Forgot password',
      expect.stringContaining('administrator'),
    );
  });

  it('shows a contact-admin message when "Contact Admin" is pressed', async () => {
    mockUseLoginMutation.mockReturnValue([jest.fn(), { isLoading: false, error: undefined }]);
    const alertSpy = jest.spyOn(Alert, 'alert');

    renderWithProviders(<LoginScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText('Contact Admin'));

    expect(alertSpy).toHaveBeenCalledWith('Contact Admin', expect.stringContaining('administrator'));
  });
});
