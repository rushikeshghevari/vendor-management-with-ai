import { Pressable, Text, View } from 'react-native';

interface ChipSelectOption<T extends string> {
  value: T;
  label: string;
}

interface ChipSelectProps<T extends string> {
  label: string;
  value: T | undefined;
  options: ChipSelectOption<T>[];
  onChange: (value: T) => void;
  errorMessage?: string;
}

/** Label + row of selectable chips, used for Status in the Department form. */
export function ChipSelect<T extends string>({ label, value, options, onChange, errorMessage }: ChipSelectProps<T>) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-200">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              className={`rounded-full border px-4 py-2 ${
                isSelected
                  ? 'border-primary-600 bg-primary-600'
                  : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
              }`}
            >
              <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-ink dark:text-white'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errorMessage ? <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</Text> : null}
    </View>
  );
}
