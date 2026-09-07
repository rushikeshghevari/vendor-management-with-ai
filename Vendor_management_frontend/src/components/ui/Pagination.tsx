import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Simple Prev / page-indicator / Next pager for client-paginated lists. */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <View className="flex-row items-center justify-center gap-4 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        className={`h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 ${
          page <= 1 ? 'opacity-40' : ''
        }`}
      >
        <Ionicons name="chevron-back" size={18} color="#1e88e5" />
      </Pressable>

      <Text className="text-sm font-medium text-ink-muted dark:text-slate-400">
        Page {page} of {totalPages}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next page"
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        className={`h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 ${
          page >= totalPages ? 'opacity-40' : ''
        }`}
      >
        <Ionicons name="chevron-forward" size={18} color="#1e88e5" />
      </Pressable>
    </View>
  );
}
