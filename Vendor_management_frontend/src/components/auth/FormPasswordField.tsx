import { useState } from 'react';
import { Pressable, TextInput, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RefObject } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { FormTextField } from '@/components/ui/FormTextField';

interface FormPasswordFieldProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  name: Path<TFormValues>;
  label: string;
  inputRef?: RefObject<TextInput | null>;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
}

export function FormPasswordField<TFormValues extends FieldValues>({
  control,
  name,
  label,
  inputRef,
  returnKeyType,
  onSubmitEditing,
}: FormPasswordFieldProps<TFormValues>) {
  const [visible, setVisible] = useState(false);

  return (
    <FormTextField
      control={control}
      name={name}
      label={label}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoFocus={false}
      textContentType="password"
      inputRef={inputRef}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      icon={<Ionicons name="lock-closed-outline" size={16} color="#1e88e5" />}
      rightElement={
        <Pressable
          onPress={() => setVisible((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={8}
          className="px-2 py-1"
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#5f5f5f" />
        </Pressable>
      }
    />
  );
}
