import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { TimelineEvent } from '@/features/director/types';

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Pending';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function ReviewTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const completed = event.status === 'completed';
        return (
          <View key={event.key} className="flex-row">
            <View className="items-center" style={{ width: 24 }}>
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  backgroundColor: completed ? '#059669' : '#E2E8F0',
                }}
              >
                {completed ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
              </View>
              {!isLast ? (
                <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: completed ? '#059669' : '#E2E8F0' }} />
              ) : null}
            </View>
            <View className="flex-1 pb-4 pl-2">
              <Text
                className={`text-xs font-semibold ${completed ? 'text-ink dark:text-slate-200' : 'text-ink-muted dark:text-slate-500'}`}
              >
                {event.label}
              </Text>
              <Text className="mt-0.5 text-[11px] text-ink-muted dark:text-slate-500">
                {formatDateTime(event.timestamp)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
