import { configureStore } from '@reduxjs/toolkit';

import { baseApi } from '@/store/baseApi';
import uiReducer from '@/store/uiSlice';
import authReducer from '@/features/auth/authSlice';

import { addressApi } from '@/features/address/api/addressApi';

export function createStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
      [addressApi.reducerPath]: addressApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware, addressApi.middleware),
  });
}

export const store = createStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
