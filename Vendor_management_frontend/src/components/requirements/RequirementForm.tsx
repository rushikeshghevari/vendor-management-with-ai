import { Controller, useFieldArray, type Control } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { FormDateField } from '@/components/ui/FormDateField';
import { FormSearchableDropdown } from '@/components/ui/FormSearchableDropdown';
import { TextField } from '@/components/ui/TextField';
import type { RequirementFormValues } from '@/features/requirements/requirementSchema';

const EMPTY_ITEM = {
  itemName: '',
  quantity: '' as unknown as number,
};

interface RequirementFormProps {
  control: Control<RequirementFormValues>;
  departmentName: string;
  /** The requester's own department plus any Super-Admin-flagged requirement-target
   *  departments — always at least the requester's own, so the picker never shows empty.
   *  Only rendered as a real dropdown when there's an actual choice (length > 1); otherwise
   *  the plain read-only department field is shown instead, same as before this existed. */
  departmentOptions?: { value: string; label: string }[];
  requirementNumber?: string;
  /** The parent screen's ScrollView — item fields sit low enough in this form that Android's
   *  window-resize alone doesn't reliably scroll a focused one above the keyboard (a real gap
   *  in RN's own auto-scroll under this app's edge-to-edge display mode). `measureLayout` on a
   *  child ref would be the precise fix, but NativeWind's cssInterop wrapping of TextInput
   *  doesn't forward a ref that satisfies it ("ref.measureLayout must be called with a ref to
   *  a native component", even with a real forwardRef). Scrolling to the end on focus instead
   *  is coarser but always works — this form is short (one header card + items), so "the end"
   *  and "just below the keyboard" are the same place for the common single-item case; extra
   *  bottom padding keeps it reachable when more items are added. Optional so the form still
   *  renders standalone. */
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

const READ_ONLY_FIELD_CLASS = 'bg-slate-100 text-ink-muted dark:bg-slate-800';

/** Purely presentational — the screen owns `useForm`, matching QuotationForm's split.
 *  Deliberately minimal: the requester only says what's needed, how much, and (optionally)
 *  which department it belongs to — title/budget/required-date/unit/rate are all decided
 *  later (quotation collection) or auto-derived server-side, see requirement.service.ts. */
export function RequirementForm({ control, departmentName, departmentOptions, requirementNumber, scrollViewRef }: RequirementFormProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const scrollToKeyboard = () => setTimeout(() => scrollViewRef?.current?.scrollToEnd({ animated: true }), 150);

  return (
    <View>
      <DashboardCard className="mb-4">
        <TextField label="Requirement Number" value={requirementNumber ?? 'Auto-generated after saving'} editable={false} className={READ_ONLY_FIELD_CLASS} />
        {departmentOptions && departmentOptions.length > 1 ? (
          <FormSearchableDropdown
            control={control}
            name="targetDepartment"
            label="Department"
            placeholder="Select department..."
            options={departmentOptions}
          />
        ) : (
          <TextField label="Department" value={departmentName} editable={false} className={READ_ONLY_FIELD_CLASS} />
        )}
        <FormDateField control={control} name="requiredDate" label="Required By" minimumDate={new Date()} />
      </DashboardCard>

      <DashboardCard className="mb-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Items</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add item"
            onPress={() => append(EMPTY_ITEM)}
            className="flex-row items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 dark:bg-primary-900/30"
          >
            <Ionicons name="add" size={16} color="#1e88e5" />
            <Text className="text-xs font-semibold text-primary-600 dark:text-primary-400">Add Item</Text>
          </Pressable>
        </View>

        {fields.map((field, index) => (
          <View key={field.id} className={index > 0 ? 'mt-2 border-t border-slate-100 pt-4 dark:border-slate-800' : ''}>
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-ink-muted dark:text-slate-500">Item {index + 1}</Text>
              {fields.length > 1 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove item ${index + 1}`} onPress={() => remove(index)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color="#e53935" />
                </Pressable>
              ) : null}
            </View>

            <Controller
              control={control}
              name={`items.${index}.itemName`}
              render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                <TextField
                  label="What's needed"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onFocus={scrollToKeyboard}
                  errorMessage={error?.message}
                  placeholder="e.g. Chair"
                />
              )}
            />
            <Controller
              control={control}
              name={`items.${index}.quantity`}
              render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                <TextField
                  label="How many"
                  value={String(value ?? '')}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onFocus={scrollToKeyboard}
                  errorMessage={error?.message}
                  keyboardType="numeric"
                  placeholder="e.g. 5"
                />
              )}
            />
          </View>
        ))}
      </DashboardCard>
    </View>
  );
}

export { EMPTY_ITEM as EMPTY_REQUIREMENT_ITEM };
