import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SectionList, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { BulkActionBar } from '@/features/notifications/components/BulkActionBar';
import { FilterChipsRow, type QuickFilterId } from '@/features/notifications/components/FilterChipsRow';
import { NotificationCard } from '@/features/notifications/components/NotificationCard';
import { NotificationDetailsSheet } from '@/features/notifications/components/NotificationDetailsSheet';
import { NotificationGroupHeader } from '@/features/notifications/components/NotificationGroupHeader';
import { NotificationSkeletonList } from '@/features/notifications/components/NotificationSkeleton';
import { SearchBar } from '@/features/notifications/components/SearchBar';
import {
  useArchiveNotificationMutation,
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  usePinNotificationMutation,
  useUnpinNotificationMutation,
} from '@/features/notifications/api/notificationsApi';
import type { Notification } from '@/features/notifications/types';
import { groupByDate, matchesQuickFilter, type ClientFilterId } from '@/features/notifications/utils/notificationHelpers';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/constants/roles';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { NotificationsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<NotificationsStackParamList, 'NotificationList'>;

const PAGE_SIZE = 20;
const CLIENT_FILTER_IDS = new Set<QuickFilterId>(['approval', 'ai', 'approved', 'rejected']);

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - 6);
  return d;
}

export function NotificationsScreen({ navigation }: Props) {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);

  const [search, setSearch] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeChip, setActiveChip] = useState<QuickFilterId>('all');
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailsNotification, setDetailsNotification] = useState<Notification | null>(null);

  const detailsSheetRef = useRef<BottomSheetModal>(null);

  const serverParams = useMemo(() => {
    const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
    if (search.trim()) params.search = search.trim();
    if (activeChip === 'unread') params.isRead = false;
    if (activeChip === 'read') params.isRead = true;
    if (activeChip === 'highPriority') params.priority = 'high';
    if (activeChip === 'bills') params.module = 'bill';
    if (activeChip === 'payments') params.module = 'payment';
    if (activeChip === 'purchaseOrders') params.module = 'purchase_order';
    if (activeChip === 'system') params.module = 'system';
    if (activeChip === 'today') params.since = startOfToday().toISOString();
    if (activeChip === 'thisWeek') params.since = startOfWeek().toISOString();
    // Archived notifications are hidden everywhere else and only surfaced under this one
    // chip — previously `isArchived` was never sent at all, so an "archived" item never
    // actually disappeared from view; pressing Archive had no visible effect.
    params.isArchived = activeChip === 'archived';
    return params;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeChip, page]);

  const { data: notifications = [], isLoading, isFetching, refetch } = useGetNotificationsQuery(serverParams);

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();
  const [archiveNotification] = useArchiveNotificationMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [pinNotification] = usePinNotificationMutation();
  const [unpinNotification] = useUnpinNotificationMutation();

  const visible = CLIENT_FILTER_IDS.has(activeChip)
    ? notifications.filter((n) => matchesQuickFilter(n, activeChip as ClientFilterId))
    : notifications;

  const sections = useMemo(() => {
    return groupByDate(visible).map((section) => ({
      title: section.title,
      count: section.data.length,
      data: collapsed[section.title] ? [] : section.data,
    }));
  }, [visible, collapsed]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasMore = !isLoading && notifications.length >= page * PAGE_SIZE;

  const handleChipChange = useCallback((chip: QuickFilterId) => {
    setActiveChip(chip);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  }, [hasMore, isFetching]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const openDetails = useCallback((n: Notification) => {
    setDetailsNotification(n);
    detailsSheetRef.current?.present();
    if (!n.isRead) markRead(n.id).catch(() => null);
  }, [markRead]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const handlePress = useCallback((n: Notification) => {
    if (selectionMode) {
      toggleSelected(n.id);
      return;
    }
    openDetails(n);
  }, [selectionMode, toggleSelected, openDetails]);

  const handleLongPress = useCallback((n: Notification) => {
    setSelectionMode(true);
    toggleSelected(n.id);
  }, [toggleSelected]);

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkMarkRead = useCallback(() => {
    Promise.all(Array.from(selectedIds).map((id) => markRead(id).catch(() => null))).finally(handleCancelSelection);
  }, [selectedIds, markRead, handleCancelSelection]);

  const handleBulkArchive = useCallback(() => {
    Promise.all(Array.from(selectedIds).map((id) => archiveNotification(id).catch(() => null))).finally(handleCancelSelection);
  }, [selectedIds, archiveNotification, handleCancelSelection]);

  const handleBulkDelete = useCallback(() => {
    Alert.alert('Delete Notifications', `Delete ${selectedIds.size} selected notification(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Promise.all(Array.from(selectedIds).map((id) => deleteNotification(id).catch(() => null))).finally(handleCancelSelection);
        },
      },
    ]);
  }, [selectedIds, deleteNotification, handleCancelSelection]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete Notification', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(id).catch((error) => Alert.alert('Could Not Delete', getErrorMessage(error))) },
    ]);
  }, [deleteNotification]);

  const handleTogglePin = useCallback((n: Notification) => {
    (n.isPinned ? unpinNotification(n.id) : pinNotification(n.id)).catch(() => null);
  }, [pinNotification, unpinNotification]);

  const toggleSection = useCallback((title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  return (
    <Screen padded={false}>
      <AppHeader
        title={unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => setIsSearchVisible((v) => !v)} accessibilityRole="button" accessibilityLabel="Search" hitSlop={8}>
              <Ionicons name="search-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={() => markAllRead()} disabled={isMarkingAll} accessibilityRole="button" accessibilityLabel="Mark all read" hitSlop={8}>
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
            </Pressable>
            {isSuperAdmin ? (
              <Pressable onPress={() => navigation.navigate('NotificationSettings')} accessibilityRole="button" accessibilityLabel="Notification settings" hitSlop={8}>
                <Ionicons name="settings-outline" size={20} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        }
      />

      <View className="flex-1 bg-surface-muted pt-3 dark:bg-surface-dark">
        {isSearchVisible ? <SearchBar value={search} onChangeText={handleSearchChange} /> : null}

        <FilterChipsRow active={activeChip} onChange={handleChipChange} />

        {selectionMode ? (
          <BulkActionBar
            count={selectedIds.size}
            onMarkRead={handleBulkMarkRead}
            onArchive={handleBulkArchive}
            onDelete={handleBulkDelete}
            onCancel={handleCancelSelection}
          />
        ) : null}

        {isLoading ? (
          <NotificationSkeletonList />
        ) : visible.length === 0 ? (
          <EmptyState title="No Notifications" description="You're all caught up — nothing matches this filter yet." />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) =>
              <NotificationGroupHeader
                title={section.title}
                count={section.count}
                collapsed={Boolean(collapsed[section.title])}
                onToggle={() => toggleSection(section.title)}
              />
            }
            renderItem={({ item }) => (
              <NotificationCard
                notification={item}
                selected={selectedIds.has(item.id)}
                selectionMode={selectionMode}
                onPress={handlePress}
                onLongPress={handleLongPress}
                onMarkRead={(id) => markRead(id).catch(() => null)}
                onDelete={handleDelete}
                onOpen={openDetails}
                onTogglePin={handleTogglePin}
              />
            )}
            removeClippedSubviews
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            onEndReachedThreshold={0.4}
            onEndReached={handleEndReached}
            refreshing={isFetching && page === 1}
            onRefresh={handleRefresh}
            contentContainerStyle={{ paddingBottom: 24 }}
            stickySectionHeadersEnabled={false}
          />
        )}
      </View>

      <NotificationDetailsSheet
        ref={detailsSheetRef}
        notification={detailsNotification}
        onDismiss={() => setDetailsNotification(null)}
      />
    </Screen>
  );
}
