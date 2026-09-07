import { Modal, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

interface DeleteConfirmationSheetProps {
  visible: boolean;
  departmentName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Bottom sheet confirming a (soft) department delete. */
export function DeleteConfirmationSheet({ visible, departmentName, onCancel, onConfirm }: DeleteConfirmationSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable className="flex-1 justify-end bg-slate-950/50 dark:bg-black/70" onPress={onCancel}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="rounded-t-[32px] border-t border-slate-100 bg-white p-6 pb-8 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900"
        >
          <View className="mb-5 h-1.5 w-14 self-center rounded-full bg-slate-200 dark:bg-slate-800" />

          <Text className="text-xl font-bold text-ink dark:text-white">Delete Department</Text>
          <Text className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this department?
          </Text>
          <Text className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            &ldquo;{departmentName}&rdquo; will be marked Inactive &mdash; it won&apos;t be permanently removed.
          </Text>

          <Button label="Delete" variant="danger" onPress={onConfirm} className="mt-6" />
          <Button label="Cancel" variant="secondary" onPress={onCancel} className="mt-3" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
