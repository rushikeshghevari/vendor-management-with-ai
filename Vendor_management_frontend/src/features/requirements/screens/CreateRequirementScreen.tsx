import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RequirementForm } from '@/components/requirements/RequirementForm';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useGetDepartmentsQuery } from '@/features/departments/api/departmentsApi';
import { useCreateRequirementMutation, useSubmitRequirementMutation } from '@/features/requirements/api/requirementsApi';
import { requirementSchema, type RequirementFormValues } from '@/features/requirements/requirementSchema';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { RequirementsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'CreateRequirement'>;

export function CreateRequirementScreen({ navigation }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuth();
  const { data: departments } = useGetDepartmentsQuery();
  const [createRequirement, { isLoading: isSavingDraft }] = useCreateRequirementMutation();
  const [submitRequirement, { isLoading: isSubmitting }] = useSubmitRequirementMutation();

  const department = departments?.find((item) => item.id === user?.department);

  // Own department always comes first and is the default pick — every other active department
  // is appended, so the picker always reflects the current department list, including ones
  // added after this screen was last opened.
  const departmentOptions = department
    ? [
        { value: department.id, label: department.name },
        ...(departments ?? [])
          .filter((item) => item.id !== department.id && item.isActive)
          .map((item) => ({ value: item.id, label: item.name })),
      ]
    : undefined;

  const { control, handleSubmit } = useForm<RequirementFormValues>({
    resolver: zodResolver(requirementSchema),
    // Otherwise react-hook-form auto-focuses the first invalid field on a failed submit —
    // for a text field that pops the keyboard right as the user tapped the button, which
    // reads as a glitch rather than validation feedback. The inline error text under each
    // field is enough; no need to also steal focus.
    shouldFocusError: false,
    defaultValues: {
      items: [{ itemName: '', quantity: '' as unknown as number }],
      targetDepartment: user?.department,
    },
  });

  const buildPayload = (values: RequirementFormValues) => ({
    // title/budget are still auto-derived server-side when omitted — see
    // requirement.service.ts's create(). requiredDate defaults to 30 days out there too,
    // but only when the user leaves the picker blank.
    items: values.items.map((item) => ({
      itemName: item.itemName,
      quantity: item.quantity,
    })),
    requiredDate: values.requiredDate || undefined,
    // Omit entirely when it's still the user's own department — keeps the request identical
    // to before this feature existed unless they actually picked a different target.
    targetDepartment: values.targetDepartment && values.targetDepartment !== user?.department ? values.targetDepartment : undefined,
  });

  const handleSaveDraft = handleSubmit(async (values) => {
    try {
      await createRequirement(buildPayload(values)).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Save Requirement', getErrorMessage(error));
    }
  });

  const handleSubmitForReview = handleSubmit(async (values) => {
    try {
      const created = await createRequirement(buildPayload(values)).unwrap();
      await submitRequirement(created.id).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Submit Requirement', getErrorMessage(error));
    }
  });

  return (
    <Screen padded={false}>
      <AppHeader title="Create Requirement" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          // Generous — RequirementForm's onFocus scrolls to end (not to the specific focused
          // field; see its scrollViewRef prop comment), so there needs to be enough room past
          // the last field for "the end" to actually clear the keyboard.
          contentContainerStyle={{ paddingBottom: 320 }}
          keyboardShouldPersistTaps="handled"
        >
          <RequirementForm
            control={control}
            departmentName={department?.name ?? ''}
            departmentOptions={departmentOptions}
            scrollViewRef={scrollViewRef}
          />

          <Button label="Save as Draft" variant="secondary" loading={isSavingDraft} onPress={handleSaveDraft} className="mt-1" />
          <Button label="Submit for Review" loading={isSubmitting} onPress={handleSubmitForReview} className="mt-3" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
