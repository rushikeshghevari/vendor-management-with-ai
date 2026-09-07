import type { PropsWithChildren } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';

import { GlobalLoadingOverlay } from '@/providers/GlobalLoadingOverlay';
import { ErrorBoundary } from '@/providers/ErrorBoundary';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { store } from '@/store';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ReduxProvider store={store}>
          <SafeAreaProvider>
            <ThemeProvider>
              <BottomSheetModalProvider>
                {children}
                <GlobalLoadingOverlay />
              </BottomSheetModalProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </ReduxProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
