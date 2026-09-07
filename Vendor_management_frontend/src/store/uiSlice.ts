import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  globalLoading: boolean;
}

const initialState: UiState = {
  globalLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },
  },
});

export const { setGlobalLoading } = uiSlice.actions;
export default uiSlice.reducer;
