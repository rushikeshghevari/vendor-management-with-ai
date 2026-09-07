import { Text, View } from 'react-native';

import type { ComparisonRow, ComparisonStatus } from '@/features/director/types';

const STATUS_STYLE: Record<ComparisonStatus, { dot: string; label: string; text: string }> = {
  matched: { dot: '#059669', label: 'Matched', text: '#059669' },
  low: { dot: '#059669', label: 'Low', text: '#059669' },
  medium: { dot: '#D97706', label: 'Medium', text: '#D97706' },
  high: { dot: '#DC2626', label: 'High', text: '#DC2626' },
  not_tracked: { dot: '#94A3B8', label: 'Not tracked', text: '#64748B' },
  not_verified: { dot: '#94A3B8', label: 'Pending', text: '#64748B' },
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  if (value instanceof Date) return new Date(value).toLocaleDateString('en-IN');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return String(value);
}

function Row({ row }: { row: ComparisonRow }) {
  const style = STATUS_STYLE[row.status];
  return (
    <View className="border-t border-slate-100 py-2.5 dark:border-slate-800">
      <View className="flex-row items-center gap-2">
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: style.dot }} />
        <Text className="flex-1 text-xs font-semibold text-ink dark:text-slate-200">{row.field}</Text>
        <Text style={{ color: style.text }} className="text-[10px] font-bold uppercase tracking-wide">
          {style.label}
        </Text>
      </View>
      <View className="mt-1.5 flex-row gap-2 pl-[15px]">
        <View className="flex-1">
          <Text className="text-[9px] uppercase text-ink-muted dark:text-slate-500">Quotation</Text>
          <Text className="text-xs text-ink dark:text-slate-300" numberOfLines={2}>{formatCell(row.quotation)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[9px] uppercase text-ink-muted dark:text-slate-500">PO</Text>
          <Text className="text-xs text-ink dark:text-slate-300" numberOfLines={2}>{formatCell(row.purchaseOrder)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[9px] uppercase text-ink-muted dark:text-slate-500">Bill</Text>
          <Text className="text-xs text-ink dark:text-slate-300" numberOfLines={2}>{formatCell(row.bill)}</Text>
        </View>
      </View>
      {row.note ? (
        <Text className="mt-1 pl-[15px] text-[10px] italic text-ink-muted dark:text-slate-500">{row.note}</Text>
      ) : null}
    </View>
  );
}

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (rows.length === 0) return null;
  return (
    <View>
      {rows.map((row) => (
        <Row key={row.field} row={row} />
      ))}
    </View>
  );
}
