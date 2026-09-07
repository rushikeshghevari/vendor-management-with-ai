import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createStore } from '@/store';

// Jest has no native measurement, so SafeAreaProvider needs fixed initialMetrics — without
// them useSafeAreaInsets() throws "No safe area value available" for any component under test
// that calls it (e.g. the floating bottom tab bars, which size themselves off insets.bottom).
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function renderWithProviders(ui: ReactElement, store = createStore()) {
  return {
    store,
    ...render(
      <Provider store={store}>
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>{ui}</SafeAreaProvider>
      </Provider>,
    ),
  };
}
