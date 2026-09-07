import { Pressable, ScrollView, Text } from 'react-native';

interface FilterChipRowOption<T extends string> {
  value: T;
  label: string;
}

interface FilterChipRowProps<T extends string> {
  value: T;
  options: FilterChipRowOption<T>[];
  onChange: (value: T) => void;
}

/** Horizontal scrollable chip row — used to filter the Users list by role, status, or department. */
export function FilterChipRow<T extends string>({ value, options, onChange }: FilterChipRowProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${option.label}`}
            onPress={() => onChange(option.value)}
            className={`rounded-full border px-3.5 py-2 ${
              isSelected
                ? 'border-primary-600 bg-primary-600'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-ink dark:text-white'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
