import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChipSelect } from '@/components/users/ChipSelect';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { FormPasswordField } from '@/components/auth/FormPasswordField';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { FormSearchableDropdown } from '@/components/ui/FormSearchableDropdown';
import { Screen } from '@/components/ui/Screen';
import { ALL_ROLES, ROLES } from '@/constants/roles';
import { ROLE_LABELS } from '@/constants/roleLabels';
import { useGetDepartmentsQuery } from '@/features/departments/api/departmentsApi';
import { useCreateUserMutation } from '@/features/users/api/usersApi';
import { createUserSchema, type CreateUserFormValues } from '@/features/users/createUserSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { UsersStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<UsersStackParamList, 'CreateUser'>;

const ROLE_OPTIONS = ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Inactive' },
];

export function CreateUserScreen({ navigation, route }: Props) {
  const { departmentId } = route.params ?? {};
  const [createUser, { isLoading }] = useCreateUserMutation();
  const { data: departments } = useGetDepartmentsQuery();
  const activeDepartments = (departments ?? []).filter((item) => item.isActive);

  const { control, handleSubmit, watch, reset } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'department_user',
      departmentId,
      status: 'active',
    },
  });

  const roleValue = watch('role');

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      await createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        department: values.role === ROLES.DEPARTMENT_USER ? values.departmentId : undefined,
        phone: values.phone,
        isActive: values.status === 'active',
      }).unwrap();

      reset();

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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          contentContainerStyle={{ paddingBottom: 48 }}
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
            name="role"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <ChipSelect label="Role" value={value} options={ROLE_OPTIONS} onChange={onChange} errorMessage={error?.message} />
            )}
          />

          {roleValue === ROLES.DEPARTMENT_USER ? (
            <FormSearchableDropdown
              control={control}
              name="departmentId"
              label="Department"
              placeholder="Select Department"
              options={activeDepartments.map((department) => ({ value: department.id, label: department.name }))}
            />
          ) : null}

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
      </KeyboardAvoidingView>
    </Screen>
  );
}
