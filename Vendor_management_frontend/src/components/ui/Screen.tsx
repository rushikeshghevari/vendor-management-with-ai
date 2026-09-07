import '@/theme/safeAreaInterop';

import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps extends PropsWithChildren {
  scrollable?: boolean;
  className?: string;
  /** Set false for screens that manage their own horizontal padding (e.g. a full-bleed header). */
  padded?: boolean;
}

export function Screen({ children, scrollable = false, className = '', padded = true }: ScreenProps) {
  const horizontalPadding = padded ? 'px-4' : '';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-surface-dark">
      {scrollable ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior="padding"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className={`grow ${horizontalPadding} ${className}`}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View className={`flex-1 ${horizontalPadding} ${className}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
