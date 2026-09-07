import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionRestored(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.isBootstrapping = false;
    },
    setCredentials(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    loggedOut(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { sessionRestored, setCredentials, loggedOut } = authSlice.actions;
export default authSlice.reducer;
