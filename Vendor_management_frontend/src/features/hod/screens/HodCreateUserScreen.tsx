import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChipSelect } from '@/components/users/ChipSelect';
import { FormPasswordField } from '@/components/auth/FormPasswordField';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { Screen } from '@/components/ui/Screen';
import { useCreateHodUserMutation } from '@/features/hod/api/hodApi';
import { hodCreateUserSchema, type HodCreateUserFormValues } from '@/features/hod/createUserSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { HodUsersStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<HodUsersStackParamList, 'CreateUser'>;

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Inactive' },
];

export function HodCreateUserScreen({ navigation }: Props) {
  const [createUser, { isLoading }] = useCreateHodUserMutation();

  const { control, handleSubmit } = useForm<HodCreateUserFormValues>({
    resolver: zodResolver(hodCreateUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      status: 'active',
    },
  });

  const onSubmit = async (values: HodCreateUserFormValues) => {
    try {
      await createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone,
        isActive: values.status === 'active',
      }).unwrap();

      Alert.alert('User Created', `${values.name} has been added.`, [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (error) {
      Alert.alert('Could Not Create User', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Create User" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView
        className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <FormTextField control={control} name="name" label="Full Name" placeholder="Enter full name" autoCapitalize="words" />
        <FormTextField
          control={control}
          name="email"
          label="Email"
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormTextField control={control} name="phone" label="Mobile" placeholder="Enter mobile number" keyboardType="phone-pad" />
        <FormPasswordField control={control} name="password" label="Password" />
        <FormPasswordField control={control} name="confirmPassword" label="Confirm Password" />

        <Controller
          control={control}
          name="status"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <ChipSelect label="Status" value={value} options={STATUS_OPTIONS} onChange={onChange} errorMessage={error?.message} />
          )}
        />

        <Button label="Save" loading={isLoading} onPress={handleSubmit(onSubmit)} className="mt-2" />
        <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} className="mt-3" />
      </ScrollView>
    </Screen>
  );
}
