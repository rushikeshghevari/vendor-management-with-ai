import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { Button } from '@/components/ui/Button';
import { formatDisplayDate, parseIsoDate, toIsoDateString } from '@/utils/date';

interface DateFieldProps {
  label: string;
  /** ISO `YYYY-MM-DD`, matching the value the form/backend already expect — only the display changes. */
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * Native date-only picker. Never renders a text input, so a keyboard can never open —
 * Android opens the system dialog immediately on tap; iOS opens an inline spinner sheet
 * (no equivalent imperative API exists on iOS, so it needs a small bottom-sheet shell).
 */
export function DateField({ label, value, onChange, errorMessage, minimumDate, maximumDate }: DateFieldProps) {
  const [iosPickerDate, setIosPickerDate] = useState<Date | null>(null);

  const openPicker = () => {
    const current = parseIsoDate(value);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        maximumDate,
        onValueChange: (_event, selectedDate) => {
          if (selectedDate) onChange(toIsoDateString(selectedDate));
        },
      });
      return;
    }

    // iOS has no imperative "open" API — show the picker in a bottom sheet instead.
    setIosPickerDate(current);
  };

  return (
    <View className="mb-4">
      <Text className="mb-1 text-base font-medium text-ink dark:text-slate-200">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ? formatDisplayDate(value) : 'not set'}`}
        onPress={openPicker}
        className={`flex-row items-center justify-between rounded-[10px] border px-4 py-3 dark:bg-slate-900 ${
          errorMessage ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        <Text className={`text-lg ${value ? 'text-ink dark:text-white' : 'text-slate-400'}`}>
          {value ? formatDisplayDate(value) : 'DD/MM/YYYY'}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
      </Pressable>
      {errorMessage ? <Text className="mt-1 text-base text-red-600 dark:text-red-400">{errorMessage}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosPickerDate !== null} transparent animationType="slide" onRequestClose={() => setIosPickerDate(null)}>
          <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setIosPickerDate(null)}>
            <Pressable onPress={(event) => event.stopPropagation()} className="rounded-t-3xl bg-white p-6 dark:bg-slate-900">
              <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200 dark:bg-slate-700" />
              <Text className="mb-2 text-center text-base font-semibold text-ink dark:text-white">{label}</Text>
              {iosPickerDate ? (
                <DateTimePicker
                  value={iosPickerDate}
                  mode="date"
                  display="spinner"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onValueChange={(_event, selectedDate) => setIosPickerDate(selectedDate)}
                />
              ) : null}
              <Button
                label="Done"
                onPress={() => {
                  if (iosPickerDate) onChange(toIsoDateString(iosPickerDate));
                  setIosPickerDate(null);
                }}
                className="mt-4"
              />
              <Button label="Cancel" variant="ghost" onPress={() => setIosPickerDate(null)} className="mt-2" />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
