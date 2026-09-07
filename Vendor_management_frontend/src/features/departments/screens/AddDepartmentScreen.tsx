import { useMemo } from 'react';
import { Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DepartmentForm } from '@/components/departments/DepartmentForm';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/ui/Screen';
import { useCreateDepartmentMutation, useGetDepartmentsQuery } from '@/features/departments/api/departmentsApi';
import type { DepartmentFormValues } from '@/features/departments/departmentSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { DepartmentsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<DepartmentsStackParamList, 'AddDepartment'>;

export function AddDepartmentScreen({ navigation }: Props) {
  const { data: departments } = useGetDepartmentsQuery();
  const existingCodes = useMemo(() => (departments ?? []).map((item) => item.code), [departments]);
  const [createDepartment, { isLoading }] = useCreateDepartmentMutation();

  const handleSubmit = async (values: DepartmentFormValues) => {
    try {
      await createDepartment({
        name: values.name,
        code: values.code,
        description: values.description,
        departmentHead: values.departmentHead || undefined,
        isActive: values.status === 'active',
        createHod: values.hodAssignmentMode === 'create' || undefined,
        hod: values.hodAssignmentMode === 'create'
          ? { name: values.newHodName!, email: values.newHodEmail!, password: values.newHodPassword!, phone: values.newHodPhone || undefined }
          : undefined,
        hodId: values.hodAssignmentMode === 'assign' ? values.existingHodId : undefined,
      }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Save Department', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Add Department" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <DepartmentForm
            mode="add"
            existingCodes={existingCodes}
            submitLabel="Save Department"
            isSubmitting={isLoading}
            onSubmit={handleSubmit}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
