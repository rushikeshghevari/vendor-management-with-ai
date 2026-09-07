import type { Ionicons } from '@expo/vector-icons';

export const NOTIFICATION_MODULES = ['requirement', 'quotation', 'bill', 'payment', 'purchase_order', 'vendor', 'system'] as const;
export type NotificationModule = (typeof NOTIFICATION_MODULES)[number];

export const NOTIFICATION_TYPES = [
  // Requirement
  'requirement_ready_for_review',
  // Quotation
  'quotation_submitted',
  'quotation_reviewed',
  'review_pending',
  'quotation_negotiation',
  'quotation_rejected',
  'quotation_resubmitted',
  'quotation_approved',
  'quotation_approved_fyi',
  // Bill — business lifecycle
  'bill_submitted',
  'bill_reviewed',
  'bill_review_pending',
  'bill_negotiation',
  'bill_rejected',
  'bill_resubmitted',
  'bill_approved',
  'bill_verified',
  // Bill — AI + Director Financial Approval
  'bill_ai_verified',
  'bill_financial_approval_required',
  'bill_financial_approved',
  'bill_financial_rejected',
  'bill_director_correction_required',
  'ai_high_risk_alert',
  'bill_ai_blocked',
  // Payment
  'payment_pending',
  'payment_created',
  'payment_processing',
  'payment_paid',
  'payment_completed',
  'payment_failed',
  // Purchase Order
  'po_generated',
  'po_bill_uploaded',
  'po_ai_verified',
  'po_accounts_verified',
  'po_closed',
  // Vendor
  'vendor_created',
  'vendor_updated',
  'vendor_inactive',
  // HOD / Department user management
  'hod_assigned',
  'hod_transferred',
  'department_user_created',
  'department_user_disabled',
  // AI
  'ai_verification_started',
  'ai_verification_completed',
  // System / Broadcast / Escalation
  'system_announcement',
  'broadcast',
  'escalation',
  'reminder',
  // Payment
  'payment_due_reminder',
  'director_approval_due_reminder',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_CATEGORIES = ['information', 'success', 'warning', 'error'] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface Notification {
  id: string;
  title: string;
  message: string;
  module: NotificationModule;
  relatedRecordId: string;
  notificationType: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  isRead: boolean;
  isArchived: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;
  clickedAt?: string;
}

export interface NotificationAnalytics {
  total: number;
  delivered: number;
  read: number;
  unread: number;
  failed: number;
  readPercentage: number;
}

export interface DeviceInfo {
  token: string;
  deviceId: string;
  platform: 'android' | 'ios' | 'web';
  deviceName?: string;
  createdAt: string;
  lastUsed: string;
  isActive: boolean;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// ─── Shared display constants ───────────────────────────────────────────────
// Single source of truth — previously hand-duplicated across NotificationCard,
// NotificationDetailsScreen, and the dead NotificationListItem.

export const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  requirement_ready_for_review: 'ribbon-outline',
  quotation_submitted:       'document-text-outline',
  quotation_reviewed:        'checkmark-circle-outline',
  review_pending:            'hourglass-outline',
  quotation_negotiation:     'swap-horizontal-outline',
  quotation_rejected:        'close-circle-outline',
  quotation_resubmitted:     'refresh-outline',
  quotation_approved:        'checkmark-done-outline',
  quotation_approved_fyi:    'checkmark-done-outline',
  bill_submitted:            'receipt-outline',
  bill_reviewed:             'shield-checkmark-outline',
  bill_review_pending:       'hourglass-outline',
  bill_negotiation:          'swap-horizontal-outline',
  bill_rejected:             'close-circle-outline',
  bill_resubmitted:          'refresh-outline',
  bill_approved:             'checkmark-done-outline',
  bill_verified:             'shield-checkmark-outline',
  bill_ai_verified:                  'sparkles-outline',
  bill_financial_approval_required:  'cash-outline',
  bill_financial_approved:           'checkmark-done-circle-outline',
  bill_financial_rejected:           'close-circle-outline',
  bill_director_correction_required: 'construct-outline',
  ai_high_risk_alert:                'warning-outline',
  bill_ai_blocked:                   'alert-circle-outline',
  payment_pending:           'time-outline',
  payment_created:           'cash-outline',
  payment_processing:        'sync-outline',
  payment_paid:              'cash-outline',
  payment_completed:         'checkmark-done-circle-outline',
  payment_failed:            'alert-circle-outline',
  po_generated:              'clipboard-outline',
  po_bill_uploaded:          'cloud-upload-outline',
  po_ai_verified:            'sparkles-outline',
  po_accounts_verified:      'checkmark-circle-outline',
  po_closed:                 'lock-closed-outline',
  vendor_created:            'business-outline',
  vendor_updated:            'create-outline',
  vendor_inactive:           'pause-circle-outline',
  hod_assigned:              'ribbon-outline',
  hod_transferred:           'swap-horizontal-outline',
  department_user_created:   'person-add-outline',
  department_user_disabled:  'person-remove-outline',
  ai_verification_started:   'sparkles-outline',
  ai_verification_completed: 'sparkles-outline',
  system_announcement:       'megaphone-outline',
  broadcast:                 'radio-outline',
  escalation:                'warning-outline',
  reminder:                  'alarm-outline',
  payment_due_reminder:      'calendar-outline',
  director_approval_due_reminder: 'checkmark-done-outline',
};

export const CATEGORY_COLOR: Record<NotificationCategory, string> = {
  information: '#2563EB',
  success:     '#16A34A',
  warning:     '#D97706',
  error:       '#DC2626',
};

export const CATEGORY_BG: Record<NotificationCategory, string> = {
  information: '#EFF6FF',
  success:     '#F0FDF4',
  warning:     '#FFFBEB',
  error:       '#FEF2F2',
};

/** Matches the spec's literal priority colors: Critical=Red, High=Orange, Medium=Blue, Low=Gray. */
export const PRIORITY_COLOR: Record<NotificationPriority, { text: string; bg: string }> = {
  critical: { text: '#DC2626', bg: '#FEF2F2' },
  high:     { text: '#D97706', bg: '#FFF7ED' },
  medium:   { text: '#2563EB', bg: '#EFF6FF' },
  low:      { text: '#6B7280', bg: '#F3F4F6' },
};

// ─── Quick-filter type groups ───────────────────────────────────────────────
// Chips that don't map to a single server field (module/isRead/priority/since) —
// filtered client-side against the already-fetched page via matchesQuickFilter().

export const APPROVAL_TYPES = new Set<NotificationType>([
  'quotation_submitted',
  'quotation_resubmitted',
  'review_pending',
  'bill_financial_approval_required',
  'quotation_reviewed',
]);

export const AI_TYPES = new Set<NotificationType>([
  'bill_ai_verified',
  'ai_high_risk_alert',
  'po_ai_verified',
  'ai_verification_started',
  'ai_verification_completed',
]);

export const APPROVED_TYPES = new Set<NotificationType>([
  'quotation_approved',
  'quotation_approved_fyi',
  'bill_approved',
  'bill_financial_approved',
  'po_accounts_verified',
]);

export const REJECTED_TYPES = new Set<NotificationType>([
  'quotation_rejected',
  'bill_rejected',
  'bill_financial_rejected',
  'payment_failed',
]);
