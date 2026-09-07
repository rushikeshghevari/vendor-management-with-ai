import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import type { Vendor } from '@/features/vendors/types';

interface VendorPickerSheetProps {
  visible: boolean;
  vendors: Vendor[];
  onSelect: (vendor: Vendor) => void;
  onRegisterVendor: () => void;
  onClose: () => void;
}

/** Active-only vendor picker for the quotation form — inactive/blacklisted/deleted vendors never appear. */
export function VendorPickerSheet({ visible, vendors, onSelect, onRegisterVendor, onClose }: VendorPickerSheetProps) {
  const [query, setQuery] = useState('');

  const activeVendors = useMemo(() => vendors.filter((item) => item.status === 'active'), [vendors]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return activeVendors;
    return activeVendors.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.code.toLowerCase().includes(search) ||
        (item.gstNumber ?? '').toLowerCase().includes(search),
    );
  }, [activeVendors, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="max-h-[80%] rounded-t-3xl bg-white p-6 dark:bg-slate-900"
        >
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200 dark:bg-slate-700" />
          <Text className="text-lg font-bold text-ink dark:text-white">Select Vendor</Text>

          {activeVendors.length === 0 ? (
            <View className="items-center px-4 py-10">
              <Ionicons name="storefront-outline" size={36} color="#94a3b8" />
              <Text className="mt-3 text-center text-base font-bold text-ink dark:text-white">
                No Active Vendor Found
              </Text>
              <Text className="mt-1 text-center text-sm text-ink-muted dark:text-slate-400">
                Register a vendor first — you'll be brought back here automatically.
              </Text>
              <Button label="Register Vendor" onPress={onRegisterVendor} className="mt-5 w-full" />
            </View>
          ) : (
            <>
              <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <Ionicons name="search-outline" size={18} color="#94a3b8" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search by name, code, GST..."
                  placeholderTextColor="#94a3b8"
                  accessibilityLabel="Search vendors"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-sm text-ink dark:text-white"
                />
              </View>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item.name}`}
                    onPress={() => onSelect(item)}
                    className="mb-2 flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-bold text-ink dark:text-white">{item.name}</Text>
                      <Text className="mt-0.5 text-xs font-semibold text-primary-600">{item.code}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text className="py-6 text-center text-sm text-ink-muted dark:text-slate-400">
                    No vendor matches your search.
                  </Text>
                }
              />
            </>
          )}

          <Button label="Cancel" variant="secondary" onPress={onClose} className="mt-2" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
