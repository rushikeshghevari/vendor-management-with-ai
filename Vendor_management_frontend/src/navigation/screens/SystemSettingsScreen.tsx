import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { useGetSystemSettingsQuery, useUpdateSystemSettingsMutation } from '@/features/settings/api/settingsApi';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { ProfileStackParamList } from '@/navigation/types';

const settingsSchema = z.object({
  ceoApprovalLimit: z.coerce.number().positive('CEO Approval Limit must be greater than 0'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

type Props = NativeStackScreenProps<ProfileStackParamList, 'SystemSettings'>;

export function SystemSettingsScreen({ navigation }: Props) {
  const { data: settings, isLoading } = useGetSystemSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSystemSettingsMutation();

  const { control, handleSubmit, reset } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { ceoApprovalLimit: 50000 },
  });

  // Reset once the fetched value arrives — the form starts with a placeholder default
  // before the request resolves.
  useEffect(() => {
    if (settings) reset({ ceoApprovalLimit: settings.ceoApprovalLimit });
  }, [settings, reset]);

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      await updateSettings(values).unwrap();
      Alert.alert('Settings Updated', 'The CEO Approval Limit has been updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Could Not Update Settings', getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="System Settings" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader title="System Settings" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-sm font-semibold text-ink dark:text-slate-200">CEO Approval Limit</Text>
        <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">
          Quotations at or below this amount route to the CEO alone. Above it, both Directors must approve.
        </Text>

        <FormTextField
          control={control}
          name="ceoApprovalLimit"
          label="CEO Approval Limit (₹)"
          placeholder="e.g. 50000"
          keyboardType="numeric"
          className="mt-3"
        />

        <Button label="Save" loading={isSaving} onPress={handleSubmit(onSubmit)} className="mt-4" />
      </ScrollView>
    </Screen>
  );
}
