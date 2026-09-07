import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

/** Live search input — debounces ~300ms before calling onChangeText so the search query
 *  param isn't fired on every keystroke. */
export function SearchBar({ value, onChangeText, placeholder = 'Search vendor, quotation, bill, PO...' }: Props) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(value), [value]);

  const handleChange = (text: string) => {
    setDraft(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChangeText(text), 300);
  };

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDraft('');
    onChangeText('');
  };

  return (
    <View className="mx-4 mb-2 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" style={{ height: 42 }}>
      <Ionicons name="search-outline" size={16} color="#94A3B8" />
      <TextInput
        className="ml-2 flex-1 text-sm text-ink dark:text-white"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={draft}
        onChangeText={handleChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {draft.length > 0 ? (
        <Pressable onPress={handleClear} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
          <Ionicons name="close-circle" size={16} color="#94A3B8" />
        </Pressable>
      ) : null}
    </View>
  );
}
