import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal, Pressable, Text, View } from 'react-native';

import { FormPasswordField } from '@/components/auth/FormPasswordField';
import { Button } from '@/components/ui/Button';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/users/resetPasswordSchema';

interface ResetPasswordSheetProps {
  visible: boolean;
  userName: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (newPassword: string) => void;
}

/** Bottom sheet for an admin to set a new password for another user, no current password required. */
export function ResetPasswordSheet({ visible, userName, isSubmitting = false, onCancel, onConfirm }: ResetPasswordSheetProps) {
  const { control, handleSubmit, reset } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (visible) reset({ newPassword: '', confirmPassword: '' });
  }, [visible, reset]);

  const onSubmit = (values: ResetPasswordFormValues) => onConfirm(values.newPassword);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onCancel}>
        <Pressable onPress={(event) => event.stopPropagation()} className="rounded-t-3xl bg-white p-6 dark:bg-slate-900">
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200 dark:bg-slate-700" />

          <Text className="text-lg font-bold text-ink dark:text-white">Reset Password</Text>
          <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
            Set a new password for "{userName}". They will need to use it the next time they log in.
          </Text>

          <View className="mt-4">
            <FormPasswordField control={control} name="newPassword" label="New Password" />
            <FormPasswordField control={control} name="confirmPassword" label="Confirm Password" />
          </View>

          <Button label="Reset Password" variant="danger" loading={isSubmitting} onPress={handleSubmit(onSubmit)} className="mt-2" />
          <Button label="Cancel" variant="secondary" onPress={onCancel} className="mt-3" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
