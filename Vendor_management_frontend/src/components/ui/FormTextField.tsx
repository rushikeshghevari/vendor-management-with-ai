import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import type { ReactNode, RefObject } from 'react';
import type { TextInput, TextInputProps } from 'react-native';

import { TextField } from '@/components/ui/TextField';

interface FormTextFieldProps<TFormValues extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<TFormValues>;
  name: Path<TFormValues>;
  label: string;
  rightElement?: ReactNode;
  icon?: ReactNode;
  inputRef?: RefObject<TextInput | null>;
}

export function FormTextField<TFormValues extends FieldValues>({
  control,
  name,
  label,
  rightElement,
  icon,
  inputRef,
  ...inputProps
}: FormTextFieldProps<TFormValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <TextField
          ref={inputRef}
          label={label}
          value={value as string}
          onChangeText={onChange}
          onBlur={onBlur}
          errorMessage={error?.message}
          rightElement={rightElement}
          icon={icon}
          {...inputProps}
        />
      )}
    />
  );
}
