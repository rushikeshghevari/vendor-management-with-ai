import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView } from 'react-native';
import { useForm } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FormPasswordField } from '@/components/auth/FormPasswordField';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/features/auth/changePasswordSchema';
import { useChangeOwnPasswordMutation } from '@/features/users/api/usersApi';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { ProfileStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen({ navigation }: Props) {
  const [changePassword, { isLoading }] = useChangeOwnPasswordMutation();

  const { control, handleSubmit } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }).unwrap();
      Alert.alert('Password Updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Could Not Change Password', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Change Password" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView
        className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <FormPasswordField control={control} name="currentPassword" label="Current Password" />
        <FormPasswordField control={control} name="newPassword" label="New Password" />
        <FormPasswordField control={control} name="confirmPassword" label="Confirm New Password" />

        <Button label="Update Password" loading={isLoading} onPress={handleSubmit(onSubmit)} className="mt-2" />
        <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} className="mt-3" />
      </ScrollView>
    </Screen>
  );
}
