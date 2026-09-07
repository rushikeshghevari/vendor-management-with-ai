import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DepartmentCard } from '@/components/departments/DepartmentCard';
import { DepartmentEmptyState } from '@/components/departments/DepartmentEmptyState';
import { DepartmentSearch } from '@/components/departments/DepartmentSearch';
import { DepartmentSkeleton } from '@/components/departments/DepartmentSkeleton';
import { FilterSortButton } from '@/components/departments/FilterSortButton';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Fab } from '@/components/ui/Fab';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { Screen } from '@/components/ui/Screen';
import { useGetDepartmentsQuery } from '@/features/departments/api/departmentsApi';
import type { Department } from '@/features/departments/types';
import { useAuth } from '@/hooks/useAuth';
import { useDrawer } from '@/navigation/context/DrawerContext';
import type { DepartmentsStackParamList } from '@/navigation/types';

const SKELETON_PLACEHOLDERS = [1, 2, 3, 4];

type Props = NativeStackScreenProps<DepartmentsStackParamList, 'DepartmentList'>;

export function DepartmentsListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const drawer = useDrawer();
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  const searchInputRef = useRef<TextInput>(null);

  const { data: departments, isLoading } = useGetDepartmentsQuery();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = departments ?? [];
    if (!query) return list;
    return list.filter(
      (department) => department.name.toLowerCase().includes(query) || department.code.toLowerCase().includes(query),
    );
  }, [departments, searchQuery]);

  const handleCardPress = (department: Department) =>
    navigation.navigate('DepartmentDetails', { departmentId: department.id });

  const handleAddDepartment = () => navigation.navigate('AddDepartment');

  return (
    <Screen padded={false}>
      <AppHeader
        title="Departments"
        rightSlot={
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={8}
              onPress={() => searchInputRef.current?.focus()}
            >
              <Ionicons name="search-outline" size={22} color="#ffffff" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" className="relative" hitSlop={8}>
              <Ionicons name="notifications-outline" size={22} color="#ffffff" />
              <NotificationBadge count={5} />
            </Pressable>
            <Avatar initials={initials} size={32} online onPress={() => drawer?.openDrawer()} />
          </>
        }
      />

      <View className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark">
        <DepartmentSearch ref={searchInputRef} value={searchQuery} onChangeText={setSearchQuery} />

        <View className="mt-3 flex-row gap-3">
          <FilterSortButton icon="filter-outline" label="Filter" />
          <FilterSortButton icon="swap-vertical-outline" label="Sort" />
        </View>

        {isLoading ? (
          <View className="mt-4">
            {SKELETON_PLACEHOLDERS.map((key) => (
              <DepartmentSkeleton key={key} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredDepartments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <DepartmentCard department={item} onPress={handleCardPress} />}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 96 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<DepartmentEmptyState onCreatePress={handleAddDepartment} />}
          />
        )}
      </View>

      {/* Cleared to sit above the Super Admin bottom tab bar (~80px) — this screen is its
          "Departments" tab's root, so the bar is always visible here. */}
      <View className="absolute bottom-24 right-6">
        <Fab accessibilityLabel="Add Department" onPress={handleAddDepartment} />
      </View>
    </Screen>
  );
}
