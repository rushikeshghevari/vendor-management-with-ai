import {
  AI_TYPES,
  APPROVAL_TYPES,
  APPROVED_TYPES,
  REJECTED_TYPES,
  type Notification,
} from '@/features/notifications/types';

export function formatTimeAgo(isoDate: string): string {
  const diffMs  = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatFullDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export interface NotificationSection {
  title: 'Today' | 'Yesterday' | 'Earlier';
  data: Notification[];
}

/** Buckets an already-sorted (newest-first) notification list into Today / Yesterday / Earlier
 *  sections for a SectionList — empty buckets are omitted. */
export function groupByDate(notifications: Notification[]): NotificationSection[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const notification of notifications) {
    const createdAt = new Date(notification.createdAt).getTime();
    if (createdAt >= startOfToday) today.push(notification);
    else if (createdAt >= startOfYesterday) yesterday.push(notification);
    else earlier.push(notification);
  }

  const sections: NotificationSection[] = [];
  if (today.length) sections.push({ title: 'Today', data: today });
  if (yesterday.length) sections.push({ title: 'Yesterday', data: yesterday });
  if (earlier.length) sections.push({ title: 'Earlier', data: earlier });
  return sections;
}

/** Quick-filter chip ids that don't map to a single server query param — evaluated
 *  client-side against the notification type. See FilterChipsRow for the full chip list;
 *  chips not present here (all/unread/read/highPriority/bills/payments/purchaseOrders/
 *  system/today/thisWeek) are implemented as server query params instead. */
export type ClientFilterId = 'approval' | 'ai' | 'approved' | 'rejected';

const CLIENT_FILTER_SETS: Record<ClientFilterId, Set<Notification['notificationType']>> = {
  approval: APPROVAL_TYPES,
  ai:       AI_TYPES,
  approved: APPROVED_TYPES,
  rejected: REJECTED_TYPES,
};

export function matchesQuickFilter(notification: Notification, filterId: ClientFilterId): boolean {
  return CLIENT_FILTER_SETS[filterId].has(notification.notificationType);
}
