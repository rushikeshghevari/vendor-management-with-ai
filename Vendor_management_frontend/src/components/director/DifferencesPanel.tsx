import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { AiDifference } from '@/features/purchaseOrders/types';

const SEVERITY_META = {
  high: { label: 'High', color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle' as const },
  medium: { label: 'Medium', color: '#D97706', bg: '#FFFBEB', icon: 'warning' as const },
  low: { label: 'Low', color: '#059669', bg: '#ECFDF5', icon: 'information-circle' as const },
};

interface DifferencesPanelProps {
  bySeverity: { high: AiDifference[]; medium: AiDifference[]; low: AiDifference[] };
}

function Group({ tier, items }: { tier: keyof typeof SEVERITY_META; items: AiDifference[] }) {
  const [expanded, setExpanded] = useState(tier === 'high');
  const meta = SEVERITY_META[tier];
  if (items.length === 0) return null;

  return (
    <View className="mb-2 overflow-hidden rounded-xl" style={{ backgroundColor: meta.bg }}>
      <Pressable
        className="flex-row items-center justify-between px-3 py-2.5"
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name={meta.icon} size={15} color={meta.color} />
          <Text className="text-xs font-bold" style={{ color: meta.color }}>
            {meta.label} ({items.length})
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={meta.color} />
      </Pressable>

      {expanded ? (
        <View className="bg-white px-3 pb-2 dark:bg-slate-900">
          {items.map((d, i) => (
            <View key={`${d.field}-${i}`} className="border-t border-slate-100 py-2 dark:border-slate-800">
              <Text className="text-xs font-semibold text-ink dark:text-slate-200">{d.field}</Text>
              <Text className="mt-0.5 text-[11px] text-ink-muted dark:text-slate-400">{d.difference}</Text>
              <View className="mt-1 flex-row gap-3">
                <Text className="flex-1 text-[11px] text-primary-600" numberOfLines={1}>
                  Expected (PO): {String(d.purchaseOrder ?? '—')}
                </Text>
                <Text className="flex-1 text-[11px] text-amber-700" numberOfLines={1}>
                  Found (Bill): {String(d.bill ?? '—')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Grouped Critical/High → uses the real "high" tier (no distinct Critical tier is captured
 *  by the AI pipeline — see director.service.ts), then Medium, then Low. */
export function DifferencesPanel({ bySeverity }: DifferencesPanelProps) {
  const total = bySeverity.high.length + bySeverity.medium.length + bySeverity.low.length;
  if (total === 0) {
    return (
      <View className="flex-row items-center gap-2 rounded-xl bg-success-50 px-3 py-3 dark:bg-success-900/20">
        <Ionicons name="checkmark-circle" size={16} color="#059669" />
        <Text className="text-xs font-medium text-success-700 dark:text-success-400">
          No differences flagged by AI verification.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Group tier="high" items={bySeverity.high} />
      <Group tier="medium" items={bySeverity.medium} />
      <Group tier="low" items={bySeverity.low} />
    </View>
  );
}
