import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ResetPasswordSheet } from '@/components/users/ResetPasswordSheet';
import { DeleteUserSheet } from '@/components/users/DeleteUserSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { ROLE_LABELS } from '@/constants/roleLabels';
import {
  useDeleteUserMutation,
  useGetUsersQuery,
  useResetUserPasswordMutation,
  useSetUserStatusMutation,
} from '@/features/users/api/usersApi';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { UsersStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<UsersStackParamList, 'UserDetails'>;

function formatDate(isoDate?: string): string {
  if (!isoDate) return 'Never';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function UserDetailsScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const [isDeleteSheetVisible, setIsDeleteSheetVisible] = useState(false);
  const [isResetSheetVisible, setIsResetSheetVisible] = useState(false);

  const { data: users, isLoading } = useGetUsersQuery();
  const [setUserStatus] = useSetUserStatusMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetUserPasswordMutation();

  const user = users?.find((item) => item.id === userId);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="User Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen padded={false}>
        <AppHeader title="User Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">User not found.</Text>
      </Screen>
    );
  }

  const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
  const initials = user.name.charAt(0).toUpperCase();

  const handleToggleStatus = async () => {
    try {
      await setUserStatus({ id: user.id, isActive: !user.isActive }).unwrap();
    } catch (error) {
      Alert.alert('Could Not Update Status', getErrorMessage(error));
    }
  };

  const handleDeletePress = () => {
    if (isSuperAdmin) {
      Alert.alert('Cannot Delete Super Admin', 'The primary Super Admin account cannot be deleted.', [{ text: 'OK' }]);
      return;
    }
    setIsDeleteSheetVisible(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteUser(user.id).unwrap();
      setIsDeleteSheetVisible(false);
      navigation.goBack();
    } catch (error) {
      setIsDeleteSheetVisible(false);
      Alert.alert('Could Not Delete User', getErrorMessage(error));
    }
  };

  const handleConfirmReset = async (newPassword: string) => {
    try {
      await resetPassword({ id: user.id, newPassword }).unwrap();
      setIsResetSheetVisible(false);
      Alert.alert('Password Reset', `${user.name}'s password has been reset.`);
    } catch (error) {
      Alert.alert('Could Not Reset Password', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="User Details" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />

      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard>
          <View className="flex-row items-start justify-between">
            <Avatar initials={initials} size={56} />
            <Badge label={user.isActive ? 'Active' : 'Inactive'} variant={user.isActive ? 'success' : 'neutral'} />
          </View>

          <Text className="mt-3 text-xl font-bold text-ink dark:text-white">{user.name}</Text>
          <Text className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">{user.email}</Text>

          <View className="mt-3 flex-row items-center gap-1.5">
            <Ionicons name="shield-outline" size={14} color="#5f5f5f" />
            <Text className="text-xs text-ink-muted dark:text-slate-400">{ROLE_LABELS[user.role]}</Text>
          </View>

          {user.phone ? (
            <View className="mt-2 flex-row items-center gap-1.5">
              <Ionicons name="call-outline" size={14} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-400">{user.phone}</Text>
            </View>
          ) : null}

          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="business-outline" size={14} color="#5f5f5f" />
            <Text className="text-xs text-ink-muted dark:text-slate-400">{user.departmentName || 'No department'}</Text>
          </View>

          <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">Created {formatDate(user.createdAt)}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={13} color="#5f5f5f" />
              <Text className="text-xs text-ink-muted dark:text-slate-500">Last login {formatDate(user.lastLoginAt)}</Text>
            </View>
          </View>
        </DashboardCard>

        <Button label="Edit User" onPress={() => navigation.navigate('EditUser', { userId: user.id })} className="mt-5" />
        <Button
          label={user.isActive ? 'Deactivate' : 'Activate'}
          variant="secondary"
          onPress={handleToggleStatus}
          className="mt-3"
        />
        <Button label="Reset Password" variant="secondary" onPress={() => setIsResetSheetVisible(true)} className="mt-3" />
        <Button
          label="Delete User"
          variant="dangerOutline"
          loading={isDeleting}
          onPress={handleDeletePress}
          className="mt-3"
        />
      </ScrollView>

      <DeleteUserSheet
        visible={isDeleteSheetVisible}
        userName={user.name}
        onCancel={() => setIsDeleteSheetVisible(false)}
        onConfirm={handleConfirmDelete}
      />

      <ResetPasswordSheet
        visible={isResetSheetVisible}
        userName={user.name}
        isSubmitting={isResetting}
        onCancel={() => setIsResetSheetVisible(false)}
        onConfirm={handleConfirmReset}
      />
    </Screen>
  );
}
