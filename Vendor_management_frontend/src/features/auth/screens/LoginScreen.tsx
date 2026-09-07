import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Keyboard, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '@/components/auth/AuthHeader';
import { FormPasswordField } from '@/components/auth/FormPasswordField';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FormTextField } from '@/components/ui/FormTextField';
import { Screen } from '@/components/ui/Screen';
import { useLoginMutation } from '@/features/auth/api/authApi';
import { loginSchema, type LoginFormValues } from '@/features/auth/loginSchema';

export function LoginScreen() {
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const [login, { isLoading, error }] = useLoginMutation();
  const passwordRef = useRef<TextInput>(null);

  const onSubmit = (values: LoginFormValues) => {
    login(values);
  };

  const loginErrorMessage = !error
    ? null
    : 'status' in error && error.status === null
      ? 'Unable to reach the server. Check your connection and try again.'
      : error.message ?? 'Login failed. Please try again.';

  return (
    <Screen scrollable>
      {/*
       * TouchableWithoutFeedback fills the full scroll-content area so tapping
       * any blank space (above/below the form) dismisses the keyboard on both
       * iOS and Android without interfering with inner interactive elements.
       */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 justify-center px-2 py-10">
          <View className="w-full max-w-md self-center">
            <AuthHeader title="Welcome Back!" subtitle="Sign in to continue" />

            {loginErrorMessage ? <ErrorBanner message={loginErrorMessage} /> : null}

            <FormTextField
              control={control}
              name="email"
              label="Email"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              icon={<Ionicons name="mail-outline" size={16} color="#1e88e5" />}
            />

            <FormPasswordField
              control={control}
              name="password"
              label="Password"
              inputRef={passwordRef}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
            />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Forgot password?"
              hitSlop={10}
              className="mb-4 self-end px-2 py-1"
              onPress={() =>
                Alert.alert(
                  'Forgot password',
                  'Please contact your system administrator to reset your password.',
                )
              }
            >
              <Text className="text-sm font-semibold text-primary-600">Forgot Password?</Text>
            </Pressable>

            <Button label="Login" loading={isLoading} onPress={handleSubmit(onSubmit)} />

            <View className="mt-6 flex-row items-center justify-center">
              <Text className="text-sm text-ink-muted dark:text-slate-400">
                Don&apos;t have an account?{' '}
              </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Contact Admin"
                hitSlop={10}
                onPress={() =>
                  Alert.alert(
                    'Contact Admin',
                    'Please contact your system administrator to create an account.',
                  )
                }
              >
                <Text className="text-sm font-semibold text-primary-600">Contact Admin</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
