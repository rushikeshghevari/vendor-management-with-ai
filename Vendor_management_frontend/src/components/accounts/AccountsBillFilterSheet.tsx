import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';

export interface AccountsBillFilters {
  vendorId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface FilterOption {
  id: string;
  name: string;
}

interface AccountsBillFilterSheetProps {
  visible: boolean;
  vendors: FilterOption[];
  departments: FilterOption[];
  value: AccountsBillFilters;
  onApply: (filters: AccountsBillFilters) => void;
  onClose: () => void;
}

function ChipPicker({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: FilterOption[];
  selectedId?: string;
  onSelect: (id?: string) => void;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-sm font-medium text-ink dark:text-slate-200">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable
          onPress={() => onSelect(undefined)}
          className={`rounded-full border px-3.5 py-2 ${
            !selectedId ? 'border-primary-600 bg-primary-600' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
          }`}
        >
          <Text className={`text-xs font-semibold ${!selectedId ? 'text-white' : 'text-ink dark:text-white'}`}>All</Text>
        </Pressable>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              className={`rounded-full border px-3.5 py-2 ${
                isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-ink dark:text-white'}`}>{option.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Vendor/Department options come from the already-fetched Bill list, not a separate Vendor/Department API call. */
export function AccountsBillFilterSheet({ visible, vendors, departments, value, onApply, onClose }: AccountsBillFilterSheetProps) {
  const [draft, setDraft] = useState<AccountsBillFilters>(value);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => setDraft(value)}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()} className="max-h-[85%] rounded-t-3xl bg-white p-6 dark:bg-slate-900">
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200 dark:bg-slate-700" />
          <Text className="text-lg font-bold text-ink dark:text-white">Filter Bills</Text>

          <ChipPicker label="Vendor" options={vendors} selectedId={draft.vendorId} onSelect={(vendorId) => setDraft((prev) => ({ ...prev, vendorId }))} />
          <ChipPicker
            label="Department"
            options={departments}
            selectedId={draft.departmentId}
            onSelect={(departmentId) => setDraft((prev) => ({ ...prev, departmentId }))}
          />

          <Text className="mb-2 mt-4 text-sm font-medium text-ink dark:text-slate-200">Invoice Date Range</Text>
          <View className="flex-row gap-3">
            <TextInput
              value={draft.dateFrom ?? ''}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, dateFrom: text }))}
              placeholder="From YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-ink dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <TextInput
              value={draft.dateTo ?? ''}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, dateTo: text }))}
              placeholder="To YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-ink dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </View>

          <Button label="Apply Filters" onPress={() => onApply(draft)} className="mt-5" />
          <Button
            label="Clear Filters"
            variant="ghost"
            onPress={() => {
              setDraft({});
              onApply({});
            }}
            className="mt-2"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
