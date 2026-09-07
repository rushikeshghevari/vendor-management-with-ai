import { forwardRef } from 'react';
import { Pressable, TextInput, View, type TextInput as RNTextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaymentSearchProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

/** Rounded pill search input used at the top of the Payments list. */
export const PaymentSearch = forwardRef<RNTextInput, PaymentSearchProps>(function PaymentSearch(
  { value, onChangeText, placeholder = 'Search by payment code or invoice...' },
  ref,
) {
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <Ionicons name="search-outline" size={18} color="#94a3b8" />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        accessibilityLabel="Search payments"
        autoCapitalize="none"
        autoCorrect={false}
        className="flex-1 text-sm text-ink dark:text-white"
      />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color="#94a3b8" />
        </Pressable>
      ) : null}
    </View>
  );
});
