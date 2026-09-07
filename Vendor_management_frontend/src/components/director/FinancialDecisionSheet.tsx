import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import type { DirectorFinancialDecision } from '@/features/bills/types';

interface FinancialDecisionSheetProps {
  decision: DirectorFinancialDecision | null;
  isSubmitting?: boolean;
  onConfirm: (remarks?: string) => void;
  onClose: () => void;
}

const DECISION_COPY: Record<DirectorFinancialDecision, {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  confirmLabel: string;
  remarksRequired: boolean;
}> = {
  approved: { title: 'Approve Bill', icon: 'checkmark-circle-outline', confirmLabel: 'Approve', remarksRequired: false },
  correction_required: { title: 'Send Back to Department', icon: 'pencil-outline', confirmLabel: 'Request Correction', remarksRequired: true },
  rejected: { title: 'Reject Bill', icon: 'close-circle-outline', confirmLabel: 'Reject', remarksRequired: true },
};

/** Director Financial Approval (Approval 2) decision sheet — mirrors DirectorDecisionSheet's
 *  pattern for Quotation approvals, adapted for the bill decision set. */
export function FinancialDecisionSheet({ decision, isSubmitting = false, onConfirm, onClose }: FinancialDecisionSheetProps) {
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (decision) setRemarks('');
  }, [decision]);

  if (!decision) return null;
  const copy = DECISION_COPY[decision];
  const isRemarksMissing = copy.remarksRequired && remarks.trim().length === 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()} className="rounded-t-3xl bg-white p-6 dark:bg-slate-900">
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200 dark:bg-slate-700" />

          <View className="flex-row items-center gap-2">
            <Ionicons name={copy.icon} size={22} color="#1e88e5" />
            <Text className="text-lg font-bold text-ink dark:text-white">{copy.title}</Text>
          </View>

          <Text className="mb-1.5 mt-4 text-sm font-medium text-ink dark:text-slate-200">
            Remarks{copy.remarksRequired ? ' (required)' : ' (optional)'}
          </Text>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            placeholder={copy.remarksRequired ? 'Explain your decision...' : 'Any notes for this decision'}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            maxLength={2000}
            className="h-24 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-ink dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />

          <Button
            label={copy.confirmLabel}
            loading={isSubmitting}
            disabled={isRemarksMissing}
            onPress={() => onConfirm(remarks.trim() || undefined)}
            className="mt-5"
          />
          <Button label="Cancel" variant="ghost" onPress={onClose} className="mt-2" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
