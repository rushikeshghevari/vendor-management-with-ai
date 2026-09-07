import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, ScrollView, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChipSelect } from '@/components/users/ChipSelect';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { FormSearchableDropdown } from '@/components/ui/FormSearchableDropdown';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { ALL_ROLES, ROLES } from '@/constants/roles';
import { ROLE_LABELS } from '@/constants/roleLabels';
import { useGetDepartmentsQuery } from '@/features/departments/api/departmentsApi';
import { useGetUsersQuery, useUpdateUserMutation } from '@/features/users/api/usersApi';
import { editUserSchema, type EditUserFormValues } from '@/features/users/editUserSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { UsersStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<UsersStackParamList, 'EditUser'>;

const ROLE_OPTIONS = ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Inactive' },
];

export function EditUserScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { data: users, isLoading: isLoadingUser, refetch } = useGetUsersQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const [updateUser, { isLoading: isSaving }] = useUpdateUserMutation();

  const user = users?.find((item) => item.id === userId);
  const activeDepartments = (departments ?? []).filter((item) => item.isActive);

  const { control, handleSubmit, watch } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    values: user
      ? {
          name: user.name,
          phone: user.phone ?? '',
          role: user.role,
          departmentId: user.departmentId || undefined,
          status: user.isActive ? 'active' : 'inactive',
        }
      : undefined,
  });

  const roleValue = watch('role');

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

  const onSubmit = async (values: EditUserFormValues) => {
    try {
      await updateUser({
        id: user.id,
        body: {
          name: values.name,
          phone: values.phone || undefined,
          role: values.role,
          department: values.role === ROLES.DEPARTMENT_USER ? values.departmentId : undefined,
          isActive: values.status === 'active',
        },
      }).unwrap();
      refetch();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Update User', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Edit User" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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

          <Button label="Save Changes" loading={isSaving} onPress={handleSubmit(onSubmit)} className="mt-2" />
          <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} className="mt-3" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
