import { forwardRef, type ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  errorMessage?: string;
  /** Optional element (e.g. a show/hide password toggle) rendered inside the field, on the right. */
  rightElement?: ReactNode;
  /** Optional small icon rendered to the left of the label (e.g. a mail or lock glyph). */
  icon?: ReactNode;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, errorMessage, rightElement, icon, className = '', ...inputProps }, ref) => {
    return (
      <View className="mb-4">
        <View className="mb-1 flex-row items-center">
          {icon ? <View className="mr-1.5">{icon}</View> : null}
          <Text className="text-base font-medium text-ink dark:text-slate-200">{label}</Text>
        </View>
        <View className="relative flex-row items-center">
          <TextInput
            ref={ref}
            placeholderTextColor="#9ca3af"
            accessibilityLabel={label}
            className={`flex-1 rounded-[10px] border px-4 py-3 text-lg text-ink dark:text-white ${
              rightElement ? 'pr-12' : ''
            } ${errorMessage ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} ${className}`}
            {...inputProps}
          />
          {rightElement ? <View className="absolute right-2">{rightElement}</View> : null}
        </View>
        {errorMessage ? (
          <Text className="mt-1 text-base text-red-600 dark:text-red-400">{errorMessage}</Text>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';
