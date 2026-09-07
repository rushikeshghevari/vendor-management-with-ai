import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { BillTimelineEvent } from '@/features/bills/types';

const EVENT_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  created: { label: 'Bill Created', icon: 'add-circle-outline', color: '#5f5f5f' },
  submitted: { label: 'Submitted', icon: 'paper-plane-outline', color: '#1e88e5' },
  resubmitted: { label: 'Resubmitted', icon: 'refresh-outline', color: '#1e88e5' },
  invoice_uploaded: { label: 'Invoice PDF Uploaded', icon: 'document-attach-outline', color: '#5f5f5f' },
  supporting_document_uploaded: { label: 'Supporting Document Uploaded', icon: 'attach-outline', color: '#5f5f5f' },
  ai_processing_started: { label: 'AI Processing Started', icon: 'sparkles-outline', color: '#7C3AED' },
  ai_verified: { label: 'AI Verified', icon: 'sparkles', color: '#7C3AED' },
  ai_failed: { label: 'AI Verification Failed', icon: 'alert-circle', color: '#DC2626' },
  ai_run: { label: 'AI Run', icon: 'sparkles-outline', color: '#7C3AED' },
  retry_ai_verification: { label: 'AI Verification Retried', icon: 'refresh', color: '#D97706' },
  director_decision: { label: 'Director Decision', icon: 'shield-checkmark-outline', color: '#059669' },
  accounts_decision: { label: 'Accounts Decision', icon: 'checkmark-done-outline', color: '#059669' },
  payment_status_changed: { label: 'Payment Status Updated', icon: 'cash-outline', color: '#059669' },
  updated: { label: 'Bill Updated', icon: 'create-outline', color: '#5f5f5f' },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function eventTitle(item: BillTimelineEvent): string {
  const meta = EVENT_META[item.event];
  if (item.type === 'ai_run') {
    const meta2 = item.meta as { success?: boolean; matchPercentage?: number; risk?: string } | undefined;
    if (meta2?.success === false) return 'AI Run — Failed';
    return `AI Run — ${meta2?.matchPercentage ?? '—'}% match (${meta2?.risk ?? '—'})`;
  }
  return meta?.label ?? item.event;
}

export function BillHistoryList({ events }: { events: BillTimelineEvent[] }) {
  if (events.length === 0) {
    return <Text className="text-sm text-ink-muted dark:text-slate-400">No history recorded yet.</Text>;
  }

  // Most recent first.
  const sorted = [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <View>
      {sorted.map((item, i) => {
        const meta = EVENT_META[item.event] ?? { label: item.event, icon: 'ellipse-outline' as const, color: '#5f5f5f' };
        return (
          <View
            key={`${item.event}-${item.at}-${i}`}
            className="flex-row gap-2.5 border-t border-slate-100 py-2.5 dark:border-slate-800"
          >
            <Ionicons name={meta.icon} size={16} color={meta.color} style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-ink dark:text-slate-200">{eventTitle(item)}</Text>
              {item.remarks ? (
                <Text className="mt-0.5 text-[11px] text-ink-muted dark:text-slate-400">{item.remarks}</Text>
              ) : null}
              <View className="mt-1 flex-row items-center gap-2">
                {item.actorName ? (
                  <Text className="text-[10px] text-ink-muted dark:text-slate-500">
                    {item.actorName}{item.actorRole ? ` (${item.actorRole})` : ''}
                  </Text>
                ) : null}
                <Text className="text-[10px] text-ink-muted dark:text-slate-500">{formatDateTime(item.at)}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
