import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import type { DirectorReviewDecidable } from '@/features/directorReview/types';

interface DirectorReviewDecisionSheetProps {
  decision: DirectorReviewDecidable | null;
  isSubmitting?: boolean;
  /** Quotation code + vendor name the AI recommended, e.g. "QTN-0001 — Acme Traders" — shown
   *  as a confirmation note only when `decision === 'approved'`, since Approve is what
   *  actually finalizes it (see vendorRegistrationService.resolveWinningQuotation). */
  winningQuotationLabel?: string;
  /** False whenever no AI Comparison exists for this requirement (no AI provider configured
   *  yet) — swaps the Approve note for a manual-review notice instead of an AI claim. */
  aiComparisonAvailable?: boolean;
  onConfirm: (remarks?: string) => void;
  onClose: () => void;
}

const DECISION_COPY: Record<DirectorReviewDecidable, { title: string; icon: keyof typeof Ionicons.glyphMap; confirmLabel: string; remarksRequired: boolean }> = {
  approved: { title: 'Approve Requirement', icon: 'checkmark-circle-outline', confirmLabel: 'Approve', remarksRequired: false },
  rejected: { title: 'Reject Requirement', icon: 'close-circle-outline', confirmLabel: 'Reject', remarksRequired: true },
  sent_back: { title: 'Send Back for Revision', icon: 'arrow-undo-outline', confirmLabel: 'Send Back', remarksRequired: true },
};

/** Same bottom-sheet UX as `DirectorDecisionSheet` (Quotation approval) — mandatory remarks
 *  for Reject/Send Back, optional for Approve, matching `directorReview.validation.ts`'s
 *  `decisionSchema` exactly. */
export function DirectorReviewDecisionSheet({ decision, isSubmitting = false, winningQuotationLabel, aiComparisonAvailable = true, onConfirm, onClose }: DirectorReviewDecisionSheetProps) {
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

          {decision === 'approved' ? (
            aiComparisonAvailable ? (
              <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 dark:bg-amber-950/30">
                <Ionicons name="star" size={16} color="#d97706" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs leading-5 text-amber-800 dark:text-amber-300">
                  {winningQuotationLabel
                    ? `This will finalize the AI Recommended Quotation: ${winningQuotationLabel}.`
                    : 'This will finalize the AI Recommended Quotation shown on the review screen.'}
                </Text>
              </View>
            ) : (
              <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-slate-100 px-3.5 py-3 dark:bg-slate-800">
                <Ionicons name="information-circle-outline" size={16} color="#94a3b8" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs leading-5 text-ink-muted dark:text-slate-400">
                  {winningQuotationLabel
                    ? `AI Comparison is currently unavailable. This will finalize your selected quotation: ${winningQuotationLabel}.`
                    : 'AI Comparison is currently unavailable. Please review the quotations manually before approving.'}
                </Text>
              </View>
            )
          ) : null}

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
