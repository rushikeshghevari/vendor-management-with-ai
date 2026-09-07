import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RequirementForm } from '@/components/requirements/RequirementForm';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { useGetRequirementByIdQuery, useUpdateRequirementMutation } from '@/features/requirements/api/requirementsApi';
import { requirementSchema, type RequirementFormValues } from '@/features/requirements/requirementSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { RequirementsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'EditRequirement'>;

export function EditRequirementScreen({ navigation, route }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { requirementId } = route.params;
  const { data: requirement, isLoading } = useGetRequirementByIdQuery(requirementId);
  const [updateRequirement, { isLoading: isSaving }] = useUpdateRequirementMutation();

  // All hooks run unconditionally on every render — the isLoading/not-found states below
  // only gate what gets rendered, never which hooks get called (mirrors EditQuotationScreen).
  const { control, handleSubmit, reset } = useForm<RequirementFormValues>({
    resolver: zodResolver(requirementSchema),
    // See CreateRequirementScreen.tsx — auto-focusing the first invalid field pops the
    // keyboard right as the user taps Save; the inline error text is enough on its own.
    shouldFocusError: false,
    defaultValues: {
      items: [{ itemName: '', quantity: '' as unknown as number }],
    },
  });

  useEffect(() => {
    if (!requirement) return;
    reset({
      items: requirement.items.map((item) => ({
        itemName: item.itemName,
        quantity: String(item.quantity) as unknown as number,
      })),
      requiredDate: requirement.requiredDate ? requirement.requiredDate.slice(0, 10) : undefined,
    });
    // Only seed the form once when the requirement first loads — not on every cache
    // refresh, which would otherwise stomp on whatever the user is mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirement?.id]);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Requirement" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!requirement) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Requirement" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  const handleSave = handleSubmit(async (values) => {
    try {
      await updateRequirement({
        id: requirement.id,
        body: {
          items: values.items.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
          })),
          requiredDate: values.requiredDate || undefined,
        },
      }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Save Requirement', getErrorMessage(error));
    }
  });

  return (
    <Screen padded={false}>
      <AppHeader title="Edit Requirement" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          // See RequirementForm's scrollViewRef prop comment — onFocus scrolls to end, so
          // there needs to be enough room past the last field to actually clear the keyboard.
          contentContainerStyle={{ paddingBottom: 320 }}
          keyboardShouldPersistTaps="handled"
        >
          <RequirementForm
            control={control}
            departmentName={requirement.departmentName}
            requirementNumber={requirement.requirementNumber}
            scrollViewRef={scrollViewRef}
          />

          <Button label="Save Changes" loading={isSaving} onPress={handleSave} className="mt-1" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
