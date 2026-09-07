import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { DateField } from '@/components/ui/DateField';

interface FormDateFieldProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  name: Path<TFormValues>;
  label: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function FormDateField<TFormValues extends FieldValues>({
  control,
  name,
  label,
  minimumDate,
  maximumDate,
}: FormDateFieldProps<TFormValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <DateField
          label={label}
          value={(value as string) ?? ''}
          onChange={onChange}
          errorMessage={error?.message}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    />
  );
}
