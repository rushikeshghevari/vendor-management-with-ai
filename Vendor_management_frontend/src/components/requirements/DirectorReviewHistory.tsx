import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import type { DirectorReviewHistoryEntry } from '@/features/directorReview/types';

interface DirectorReviewHistoryProps {
  history: DirectorReviewHistoryEntry[];
}

const ACTION_LABEL: Record<string, string> = {
  viewed: 'Viewed',
  approved: 'Approved',
  rejected: 'Rejected',
  sent_back: 'Sent Back',
  remarks_updated: 'Remarks Updated',
};

const ACTION_VARIANT: Record<string, 'primary' | 'success' | 'danger' | 'neutral'> = {
  viewed: 'neutral',
  approved: 'success',
  rejected: 'danger',
  sent_back: 'primary',
  remarks_updated: 'neutral',
};

const ACTION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  viewed: 'eye-outline',
  approved: 'checkmark-circle',
  rejected: 'close-circle',
  sent_back: 'arrow-undo',
  remarks_updated: 'chatbox-ellipses-outline',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Full audit trail for one requirement's Director Review — every view, decision, and
 *  remarks edit, oldest first as recorded (see `directorReview.model.ts`'s `history[]`). */
export function DirectorReviewHistory({ history }: DirectorReviewHistoryProps) {
  if (history.length === 0) {
    return <Text className="text-sm text-ink-muted dark:text-slate-400">No review activity yet.</Text>;
  }

  const reversed = [...history].reverse();

  return (
    <View>
      {reversed.map((entry, index) => (
        <View
          key={`${entry.action}-${entry.performedAt}-${index}`}
          className={`flex-row gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 ${index === 0 ? 'border-t-0 pt-0' : 'mt-3'}`}
        >
          <Ionicons name={ACTION_ICON[entry.action] ?? 'ellipse-outline'} size={16} color="#5f5f5f" style={{ marginTop: 2 }} />
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-ink dark:text-white">{entry.performedByName}</Text>
              <Badge label={ACTION_LABEL[entry.action] ?? entry.action} variant={ACTION_VARIANT[entry.action] ?? 'neutral'} />
            </View>
            <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-500">{formatDateTime(entry.performedAt)}</Text>
            {entry.remarks ? <Text className="mt-1 text-sm text-ink dark:text-slate-200">{entry.remarks}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
