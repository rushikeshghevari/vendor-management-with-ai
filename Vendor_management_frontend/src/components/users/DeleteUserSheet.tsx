import { Modal, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

interface DeleteUserSheetProps {
  visible: boolean;
  userName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Bottom sheet confirming a (soft) user delete. */
export function DeleteUserSheet({ visible, userName, onCancel, onConfirm }: DeleteUserSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onCancel}>
        <Pressable onPress={(event) => event.stopPropagation()} className="rounded-t-3xl bg-white p-6 dark:bg-slate-900">
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200 dark:bg-slate-700" />

          <Text className="text-lg font-bold text-ink dark:text-white">Delete User</Text>
          <Text className="mt-2 text-sm text-ink-muted dark:text-slate-400">
            Are you sure you want to deactivate this user?
          </Text>
          <Text className="mt-1 text-xs text-ink-muted dark:text-slate-500">
            "{userName}" will be marked Inactive — their record is kept for audit history.
          </Text>

          <Button label="Delete" variant="danger" onPress={onConfirm} className="mt-5" />
          <Button label="Cancel" variant="secondary" onPress={onCancel} className="mt-3" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
