import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { DirectorApproval, DirectorApprovalStatus } from '@/features/quotations/types';

interface DirectorApprovalHistoryProps {
  approvals: DirectorApproval[];
}

const DECISION_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  negotiation: 'Negotiation',
  correction_required: 'Correction Required',
  rejected: 'Rejected',
};

const DECISION_VARIANT: Record<string, 'primary' | 'success' | 'danger' | 'neutral'> = {
  pending: 'neutral',
  approved: 'success',
  negotiation: 'primary',
  correction_required: 'danger',
  rejected: 'danger',
};

const DECISION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: 'hourglass-outline',
  approved: 'checkmark-circle',
  negotiation: 'swap-horizontal',
  correction_required: 'pencil-outline',
  rejected: 'close-circle',
};

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(isoDate: string | null): string {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Timeline/card view — every Director's decision is independent, never a single shared verdict.
 *  Newest decided entry first; Directors who haven't acted yet sort to the bottom as "Pending". */
export function DirectorApprovalHistory({ approvals }: DirectorApprovalHistoryProps) {
  if (approvals.length === 0) {
    return <Text className="text-sm text-ink-muted dark:text-slate-400">No Directors are configured yet.</Text>;
  }

  return (
    <View>
      {approvals.map((approval, index) => (
        <View
          key={approval.directorId}
          className={`flex-row gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 ${index === 0 ? 'border-t-0 pt-0' : 'mt-3'}`}
        >
          <Avatar initials={approval.directorName.charAt(0).toUpperCase() || 'D'} size={36} />
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-ink dark:text-white">{approval.directorName}</Text>
              <Badge
                label={DECISION_LABEL[approval.decision] || 'Pending'}
                variant={DECISION_VARIANT[approval.decision] || 'neutral'}
              />
            </View>

            <View className="mt-1 flex-row items-center gap-1.5">
              <Ionicons
                name={DECISION_ICON[approval.decision] || 'hourglass-outline'}
                size={13}
                color={approval.decision === 'pending' ? '#94a3b8' : '#5f5f5f'}
              />
              {approval.decidedAt ? (
                <Text className="text-xs text-ink-muted dark:text-slate-500">
                  {formatDate(approval.decidedAt)} · {formatTime(approval.decidedAt)}
                </Text>
              ) : (
                <Text className="text-xs text-ink-muted dark:text-slate-500">Awaiting action</Text>
              )}
            </View>

            {approval.remarks ? <Text className="mt-1 text-sm text-ink dark:text-slate-200">{approval.remarks}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
