import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryProps extends PropsWithChildren {
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  override render() {
    const { error } = this.state;

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }

      return (
        <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-surface-dark">
          <Text className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Something went wrong
          </Text>
          <Text className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {error.message}
          </Text>
          <Button label="Try again" onPress={this.reset} />
        </View>
      );
    }

    return this.props.children;
  }
}
