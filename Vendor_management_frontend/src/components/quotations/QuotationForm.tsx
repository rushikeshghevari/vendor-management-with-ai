import type { ReactNode } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChipSelect } from '@/components/users/ChipSelect';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { FormDateField } from '@/components/ui/FormDateField';
import { FormTextField } from '@/components/ui/FormTextField';
import { TextField } from '@/components/ui/TextField';
import { QUOTATION_CURRENCIES, QUOTATION_PRIORITIES } from '@/features/quotations/types';
import type { QuotationFormValues } from '@/features/quotations/quotationSchema';

const CURRENCY_OPTIONS = QUOTATION_CURRENCIES.map((value) => ({ value, label: value }));
const PRIORITY_OPTIONS = QUOTATION_PRIORITIES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

import { FormSearchableDropdown } from '@/components/ui/FormSearchableDropdown';

const PAYMENT_TERMS_OPTIONS = [
  { value: 'Net 30', label: 'Net 30' },
  { value: 'Net 45', label: 'Net 45' },
  { value: 'Net 60', label: 'Net 60' },
  { value: 'Immediate Payment', label: 'Immediate Payment' },
  { value: '50% Advance / 50% Delivery', label: '50% Advance / 50% Delivery' },
];

const DELIVERY_TERMS_OPTIONS = [
  { value: 'Immediate Delivery', label: 'Immediate Delivery' },
  { value: 'Within 1 Week', label: 'Within 1 Week' },
  { value: 'Within 2 Weeks', label: 'Within 2 Weeks' },
  { value: 'Within 1 Month', label: 'Within 1 Month' },
];

const READ_ONLY_FIELD_CLASS = 'bg-slate-100 text-ink-muted dark:bg-slate-800';

interface SelectedVendor {
  id: string;
  name: string;
  code: string;
}

interface QuotationFormProps {
  control: Control<QuotationFormValues>;
  quotationCode?: string;
  departmentName: string;
  selectedVendor: SelectedVendor | null;
  onChangeVendor: () => void;
  /** Section 6 — injected by the screen, since it owns the staged-file/upload state. */
  pdfSection: ReactNode;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">{children}</Text>;
}

function ReadOnlyBadge() {
  return (
    <View className="absolute right-3 top-0 rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-700">
      <Text className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Read Only</Text>
    </View>
  );
}

/** Purely presentational — the screen owns `useForm` (and therefore the sticky Save/Submit footer). */
export function QuotationForm({ control, quotationCode, departmentName, selectedVendor, onChangeVendor, pdfSection }: QuotationFormProps) {
  return (
    <View>
      <DashboardCard className="mb-4">
        <SectionTitle>Quotation Information</SectionTitle>

        <View className="relative">
          <ReadOnlyBadge />
          <TextField label="Quotation Number" value={quotationCode ?? 'Auto-generated after saving'} editable={false} className={READ_ONLY_FIELD_CLASS} />
        </View>

        <View className="relative">
          <ReadOnlyBadge />
          <TextField label="Department" value={departmentName} editable={false} className={READ_ONLY_FIELD_CLASS} />
        </View>

        <View className="relative">
          <ReadOnlyBadge />
          <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-200">Vendor</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vendor (read only — tap to change)"
            onPress={onChangeVendor}
            className={`mb-4 flex-row items-center justify-between rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-600 ${READ_ONLY_FIELD_CLASS}`}
          >
            <Text className={selectedVendor ? 'text-sm font-semibold text-ink dark:text-white' : 'text-sm text-slate-400'}>
              {selectedVendor ? `${selectedVendor.name} (${selectedVendor.code})` : 'Tap to select an active vendor'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </Pressable>
        </View>
      </DashboardCard>

      <DashboardCard className="mb-4">
        <SectionTitle>Dates</SectionTitle>
        <FormDateField control={control} name="quotationDate" label="Quotation Date" />
        <FormDateField control={control} name="requiredDate" label="Required Date" />
      </DashboardCard>

      <DashboardCard className="mb-4">
        <SectionTitle>Financial Details</SectionTitle>
        <FormTextField control={control} name="amount" label="Total Amount" placeholder="e.g. 50000" keyboardType="numeric" />
        <FormTextField control={control} name="gst" label="GST (%)" placeholder="e.g. 18" keyboardType="numeric" />
        <FormTextField control={control} name="creditPeriod" label="Credit Period (days)" placeholder="e.g. 30" keyboardType="numeric" />
        <Controller
          control={control}
          name="currency"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <ChipSelect label="Currency" value={value} options={CURRENCY_OPTIONS} onChange={onChange} errorMessage={error?.message} />
          )}
        />
      </DashboardCard>

      <DashboardCard className="mb-4">
        <FormSearchableDropdown
          control={control}
          name="paymentTerms"
          label="Payment Terms"
          placeholder="Select Payment Terms"
          options={PAYMENT_TERMS_OPTIONS}
        />
        <FormSearchableDropdown
          control={control}
          name="deliveryTerms"
          label="Delivery Terms"
          placeholder="Select Delivery Terms"
          options={DELIVERY_TERMS_OPTIONS}
        />
        <Controller
          control={control}
          name="priority"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <ChipSelect label="Priority" value={value} options={PRIORITY_OPTIONS} onChange={onChange} errorMessage={error?.message} />
          )}
        />
      </DashboardCard>

      <DashboardCard className="mb-4">
        <SectionTitle>Description</SectionTitle>
        <FormTextField
          control={control}
          name="description"
          label=""
          placeholder="What is this quotation for?"
          multiline
          numberOfLines={5}
          className="h-32"
          textAlignVertical="top"
        />
      </DashboardCard>

      {pdfSection}

      <DashboardCard className="mb-4">
        <SectionTitle>Remarks</SectionTitle>
        <FormTextField
          control={control}
          name="remarks"
          label=""
          placeholder="Any notes for this quotation"
          multiline
          numberOfLines={3}
          className="h-20"
          textAlignVertical="top"
        />
      </DashboardCard>
    </View>
  );
}
