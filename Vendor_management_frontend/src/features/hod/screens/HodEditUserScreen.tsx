import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChipSelect } from '@/components/users/ChipSelect';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useGetHodUsersQuery, useUpdateHodUserMutation } from '@/features/hod/api/hodApi';
import { hodEditUserSchema, type HodEditUserFormValues } from '@/features/hod/editUserSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { HodUsersStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<HodUsersStackParamList, 'EditUser'>;

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Inactive' },
];

export function HodEditUserScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { data: users, isLoading: isLoadingUser } = useGetHodUsersQuery();
  const [updateUser, { isLoading: isSaving }] = useUpdateHodUserMutation();

  const user = users?.find((item) => item.id === userId);

  const { control, handleSubmit } = useForm<HodEditUserFormValues>({
    resolver: zodResolver(hodEditUserSchema),
    values: user
      ? {
          name: user.name,
          phone: user.phone ?? '',
          status: user.isActive ? 'active' : 'inactive',
        }
      : undefined,
  });

  if (isLoadingUser) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit User" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit User" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">User not found.</Text>
      </Screen>
    );
  }

  const onSubmit = async (values: HodEditUserFormValues) => {
    try {
      await updateUser({
        id: user.id,
        body: {
          name: values.name,
          phone: values.phone || undefined,
          isActive: values.status === 'active',
        },
      }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Update User', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Edit User" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView
        className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField label="Email" value={user.email} editable={false} className="bg-slate-100 text-ink-muted dark:bg-slate-800" />

        <FormTextField control={control} name="name" label="Full Name" placeholder="Enter full name" autoCapitalize="words" />
        <FormTextField control={control} name="phone" label="Mobile" placeholder="Enter mobile number" keyboardType="phone-pad" />

        <Controller
          control={control}
          name="status"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <ChipSelect label="Status" value={value} options={STATUS_OPTIONS} onChange={onChange} errorMessage={error?.message} />
          )}
        />

        <Button label="Save Changes" loading={isSaving} onPress={handleSubmit(onSubmit)} className="mt-2" />
        <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} className="mt-3" />
      </ScrollView>
    </Screen>
  );
}
