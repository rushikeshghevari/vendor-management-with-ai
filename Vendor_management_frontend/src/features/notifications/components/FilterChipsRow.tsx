import { Pressable, ScrollView, Text } from 'react-native';

export type QuickFilterId =
  | 'all'
  | 'unread'
  | 'read'
  | 'highPriority'
  | 'approval'
  | 'bills'
  | 'payments'
  | 'purchaseOrders'
  | 'system'
  | 'ai'
  | 'rejected'
  | 'approved'
  | 'today'
  | 'thisWeek'
  | 'archived';

export const QUICK_FILTERS: Array<{ id: QuickFilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
  { id: 'highPriority', label: 'High Priority' },
  { id: 'approval', label: 'Approval' },
  { id: 'bills', label: 'Bills' },
  { id: 'payments', label: 'Payments' },
  { id: 'purchaseOrders', label: 'Purchase Orders' },
  { id: 'system', label: 'System' },
  { id: 'ai', label: 'AI' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'approved', label: 'Approved' },
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'archived', label: 'Archived' },
];

interface Props {
  active: QuickFilterId;
  onChange: (id: QuickFilterId) => void;
}

/** Horizontally scrollable quick-filter chips. Single-select — matches the design mock's
 *  bracketed "[ All ] [Unread] ..." single-active-state row. */
export function FilterChipsRow({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-2"
      style={{ flexGrow: 0, maxHeight: 44 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
    >
      {QUICK_FILTERS.map((chip) => {
        const isActive = active === chip.id;
        return (
          <Pressable
            key={chip.id}
            onPress={() => onChange(chip.id)}
            accessibilityRole="button"
            accessibilityLabel={chip.label}
            className={`rounded-full border px-3.5 py-1.5 ${
              isActive
                ? 'border-primary-600 bg-primary-600'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-ink-muted dark:text-slate-300'}`}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
