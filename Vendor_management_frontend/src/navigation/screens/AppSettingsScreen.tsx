import { Alert, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Screen } from '@/components/ui/Screen';
import { baseApi } from '@/store/baseApi';
import type { ProfileStackParamList } from '@/navigation/types';
import { useTheme } from '@/providers/ThemeProvider';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AppSettings'>;

export function AppSettingsScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const { preference, setPreference } = useTheme();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const appName = Constants.expoConfig?.name ?? 'EKAM ERP';

  const handleClearCache = () => {
    Alert.alert(
      'Clear App Cache',
      'This will clear all locally cached data. Fresh data will be loaded from the server on next use. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => {
            dispatch(baseApi.util.resetApiState());
            Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
          },
        },
      ],
    );
  };

  return (
    <Screen padded={false}>
      <AppHeader title="App Settings" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView
        className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <DashboardCard className="mb-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Appearance</Text>
          <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
            Choose between Light, Dark, or System theme mode.
          </Text>
          <View className="mt-3 flex-row gap-2">
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isActive = preference === mode;
              return (
                <Button
                  key={mode}
                  label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                  variant={isActive ? 'primary' : 'secondary'}
                  onPress={() => setPreference(mode)}
                  className="flex-1"
                />
              );
            })}
          </View>
        </DashboardCard>

        <DashboardCard className="mb-4">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Data Management</Text>
          <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
            Clear the local cache to force a fresh reload of all data from the server. Use this if
            you notice stale or outdated information.
          </Text>
          <Button
            label="Clear App Cache"
            variant="dangerOutline"
            onPress={handleClearCache}
            className="mt-3"
          />
        </DashboardCard>

        <DashboardCard>
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">Application Info</Text>
          <View className="mt-3 gap-y-2">
            <View className="flex-row justify-between">
              <Text className="text-xs text-ink-muted dark:text-slate-400">App Name</Text>
              <Text className="text-xs font-medium text-ink dark:text-slate-200">{appName}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-ink-muted dark:text-slate-400">Version</Text>
              <Text className="text-xs font-medium text-ink dark:text-slate-200">{appVersion}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-ink-muted dark:text-slate-400">Module</Text>
              <Text className="text-xs font-medium text-ink dark:text-slate-200">Vendor Management</Text>
            </View>
          </View>
        </DashboardCard>
      </ScrollView>
    </Screen>
  );
}
