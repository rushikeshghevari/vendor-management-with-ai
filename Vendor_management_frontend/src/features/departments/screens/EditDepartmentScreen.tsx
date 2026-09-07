import { useMemo } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DepartmentForm } from '@/components/departments/DepartmentForm';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { useGetDepartmentsQuery, useUpdateDepartmentMutation } from '@/features/departments/api/departmentsApi';
import type { DepartmentFormValues } from '@/features/departments/departmentSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { DepartmentsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<DepartmentsStackParamList, 'EditDepartment'>;

export function EditDepartmentScreen({ navigation, route }: Props) {
  const { departmentId } = route.params;
  const { data: departments, isLoading } = useGetDepartmentsQuery();
  const department = departments?.find((item) => item.id === departmentId);
  const existingCodes = useMemo(
    () => (departments ?? []).filter((item) => item.id !== departmentId).map((item) => item.code),
    [departments, departmentId],
  );
  const [updateDepartment, { isLoading: isSubmitting }] = useUpdateDepartmentMutation();

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Department" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!department) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Department" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Department not found.</Text>
      </Screen>
    );
  }

  const handleSubmit = async (values: DepartmentFormValues) => {
    try {
      await updateDepartment({
        id: department.id,
        body: {
          name: values.name,
          code: values.code,
          description: values.description,
          departmentHead: values.departmentHead || undefined,
          isActive: values.status === 'active',
        },
      }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Update Department', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Edit Department" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView
        className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <DepartmentForm
          mode="edit"
          existingCodes={existingCodes}
          submitLabel="Update Department"
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={() => navigation.goBack()}
          defaultValues={{
            name: department.name,
            code: department.code,
            description: department.description,
            departmentHead: department.departmentHead ?? '',
            status: department.isActive ? 'active' : 'inactive',
          }}
        />
      </ScrollView>
    </Screen>
  );
}
