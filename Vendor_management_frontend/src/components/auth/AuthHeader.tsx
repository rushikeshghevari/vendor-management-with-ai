import { Text, View } from 'react-native';

import { BrandLogo } from '@/components/branding/BrandLogo';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View className="mb-8 items-center">
      <BrandLogo size="md" />
      <Text
        className="mt-6 text-center text-2xl font-bold text-primary-600 dark:text-primary-400"
        accessibilityRole="header"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-center text-base text-ink-muted dark:text-slate-400">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
