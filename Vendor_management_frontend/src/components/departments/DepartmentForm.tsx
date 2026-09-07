import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChipSelect } from '@/components/departments/ChipSelect';
import { FilterChipRow } from '@/components/users/FilterChipRow';
import { FormPasswordField } from '@/components/auth/FormPasswordField';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { ROLES } from '@/constants/roles';
import { generateDepartmentCode } from '@/features/departments/generateDepartmentCode';
import { departmentSchema, type DepartmentFormValues } from '@/features/departments/departmentSchema';
import { useGetUsersQuery } from '@/features/users/api/usersApi';

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Inactive' },
];

const HOD_ASSIGNMENT_OPTIONS = [
  { value: 'none' as const, label: 'No HOD yet' },
  { value: 'create' as const, label: 'Create New HOD' },
  { value: 'assign' as const, label: 'Assign Existing HOD' },
];

interface DepartmentFormProps {
  mode: 'add' | 'edit';
  defaultValues?: Partial<DepartmentFormValues>;
  /** Codes of all other existing departments, used to keep the auto-generated code unique. */
  existingCodes: string[];
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (values: DepartmentFormValues) => void;
  onCancel: () => void;
}

export function DepartmentForm({
  mode,
  defaultValues,
  existingCodes,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: DepartmentFormProps) {
  const { control, handleSubmit, watch, setValue, reset } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      departmentHead: '',
      status: 'active',
      hodAssignmentMode: 'none',
      ...defaultValues,
    },
  });

  const nameValue = watch('name');
  const hodAssignmentMode = watch('hodAssignmentMode');

  const { data: users } = useGetUsersQuery(undefined, { skip: mode !== 'add' });
  const availableHods = (users ?? []).filter((item) => item.role === ROLES.HOD);

  // Add mode: the code is always derived from the name as the user types, and stays read-only.
  useEffect(() => {
    if (mode !== 'add') return;
    setValue('code', nameValue ? generateDepartmentCode(nameValue, existingCodes) : '');
  }, [mode, nameValue, existingCodes, setValue]);

  // Edit mode: the existing code is left untouched unless the user explicitly regenerates it.
  const handleRegenerate = () => setValue('code', generateDepartmentCode(nameValue ?? '', existingCodes));

  const handleFormSubmit = async (values: DepartmentFormValues) => {
    try {
      await onSubmit(values);
      reset();
    } catch (error) {
      // Ignore
    }
  };

  return (
    <View>
      <FormTextField control={control} name="name" label="Department Name" placeholder="e.g. Quality Department" autoCapitalize="words" />

      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-ink dark:text-slate-200">Department Code</Text>
        {mode === 'add' ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="sync-circle" size={16} color="#1e88e5" />
            <Text className="text-xs font-semibold text-primary-600">Auto-generated</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Regenerate department code"
            onPress={handleRegenerate}
            className="flex-row items-center gap-1"
          >
            <Ionicons name="refresh-outline" size={16} color="#1e88e5" />
            <Text className="text-xs font-semibold text-primary-600">Regenerate</Text>
          </Pressable>
        )}
      </View>
      <FormTextField
        control={control}
        name="code"
        label=""
        placeholder="e.g. QUA006"
        autoCapitalize="characters"
        editable={false}
        className="bg-slate-100 dark:bg-slate-800"
      />

      <FormTextField
        control={control}
        name="description"
        label="Description"
        placeholder="What does this department do?"
        multiline
        numberOfLines={3}
        className="h-20"
      />

      <FormTextField
        control={control}
        name="departmentHead"
        label="Department Head (optional)"
        placeholder="e.g. Rohit Bansal"
        autoCapitalize="words"
      />

      {mode === 'add' ? (
        <>
          <Controller
            control={control}
            name="hodAssignmentMode"
            render={({ field: { value, onChange } }) => (
              <ChipSelect label="HOD" value={value} options={HOD_ASSIGNMENT_OPTIONS} onChange={onChange} />
            )}
          />

          {hodAssignmentMode === 'create' ? (
            <>
              <FormTextField control={control} name="newHodName" label="HOD Full Name" placeholder="Enter full name" autoCapitalize="words" />
              <FormTextField
                control={control}
                name="newHodEmail"
                label="HOD Email"
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormTextField control={control} name="newHodPhone" label="HOD Mobile (optional)" placeholder="Enter mobile number" keyboardType="phone-pad" />
              <FormPasswordField control={control} name="newHodPassword" label="HOD Password" />
            </>
          ) : null}

          {hodAssignmentMode === 'assign' ? (
            <Controller
              control={control}
              name="existingHodId"
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <View className="mb-4">
                  <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-200">Select HOD</Text>
                  <FilterChipRow
                    value={value ?? ''}
                    options={availableHods.map((item) => ({ value: item.id, label: item.name }))}
                    onChange={onChange}
                  />
                  {error ? <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{error.message}</Text> : null}
                  {availableHods.length === 0 ? (
                    <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">No unassigned HOD accounts found.</Text>
                  ) : null}
                </View>
              )}
            />
          ) : null}
        </>
      ) : null}

      <Controller
        control={control}
        name="status"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <ChipSelect label="Status" value={value} options={STATUS_OPTIONS} onChange={onChange} errorMessage={error?.message} />
        )}
      />

      <Button label={submitLabel} loading={isSubmitting} onPress={handleSubmit(handleFormSubmit)} className="mt-2" />
      <Button label="Cancel" variant="secondary" onPress={onCancel} className="mt-3" />
    </View>
  );
}
