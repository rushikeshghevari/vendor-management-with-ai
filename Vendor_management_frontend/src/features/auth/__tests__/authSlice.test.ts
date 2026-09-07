import authReducer, { loggedOut, sessionRestored, setCredentials } from '@/features/auth/authSlice';
import { ROLES } from '@/constants/roles';
import type { User } from '@/types/auth';

const testUser: User = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@vms.local',
  role: ROLES.SUPER_ADMIN,
};

describe('authSlice', () => {
  it('starts in a bootstrapping, unauthenticated state', () => {
    const state = authReducer(undefined, { type: 'init' });
    expect(state).toEqual({ user: null, isAuthenticated: false, isBootstrapping: true });
  });

  it('sessionRestored(user) marks the session authenticated and done bootstrapping', () => {
    const state = authReducer(undefined, sessionRestored(testUser));
    expect(state).toEqual({ user: testUser, isAuthenticated: true, isBootstrapping: false });
  });

  it('sessionRestored(null) marks done bootstrapping but not authenticated', () => {
    const state = authReducer(undefined, sessionRestored(null));
    expect(state).toEqual({ user: null, isAuthenticated: false, isBootstrapping: false });
  });

  it('setCredentials logs the user in', () => {
    const state = authReducer(
      { user: null, isAuthenticated: false, isBootstrapping: false },
      setCredentials(testUser),
    );
    expect(state.user).toEqual(testUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('loggedOut clears the user and authentication flag', () => {
    const state = authReducer(
      { user: testUser, isAuthenticated: true, isBootstrapping: false },
      loggedOut(),
    );
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
