import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { BillStatus } from '@/features/bills/types';

type StepState = 'done' | 'current' | 'pending' | 'failed' | 'branched';

interface Step {
  key: string;
  label: string;
  state: StepState;
}

const STEP_META: Record<StepState, { color: string; bg: string; icon?: keyof typeof Ionicons.glyphMap }> = {
  done:     { color: '#059669', bg: '#059669', icon: 'checkmark' },
  current:  { color: '#1e88e5', bg: '#1e88e5' },
  pending:  { color: '#94A3B8', bg: '#E2E8F0' },
  failed:   { color: '#DC2626', bg: '#DC2626', icon: 'close' },
  branched: { color: '#D97706', bg: '#D97706', icon: 'return-up-back' },
};

/** Maps a Bill's current status onto the fixed 6-stage workflow. Director Financial Approval
 *  is no longer a gate a bill waits at — AI verification (success or failure/outage) now
 *  forwards straight to Accounts, so there's no separate "Director" stage to show here anymore.
 *  The three director_* statuses can still occur on data from before that change, or via the
 *  still-present manual override endpoint; all three are mapped onto the 'accounts' stage,
 *  since that's the step they actually gate/resolve now. Terminal branch statuses (rejected/
 *  sent-back at Accounts) are shown as a distinct failed/branched marker on the stage they
 *  stopped at, rather than forced further along the happy path. */
function buildSteps(status: BillStatus): Step[] {
  const stageOrder = ['uploaded', 'ai_processing', 'ai_verified', 'accounts', 'payment', 'completed'] as const;
  const labels: Record<(typeof stageOrder)[number], string> = {
    uploaded: 'Bill Uploaded',
    ai_processing: 'AI Processing',
    ai_verified: 'AI Verified',
    accounts: 'Accounts',
    payment: 'Payment',
    completed: 'Completed',
  };

  // How far the bill has progressed along the happy path, and any branch/failure marker.
  let reachedIndex = 0;
  let branchAt: (typeof stageOrder)[number] | null = null;
  let branchState: StepState = 'branched';

  switch (status) {
    case 'draft': reachedIndex = -1; break;
    case 'submitted': reachedIndex = 0; break;
    case 'ai_failed': reachedIndex = 0; branchAt = 'ai_processing'; branchState = 'failed'; break;
    case 'ai_verified': reachedIndex = 2; break;
    case 'director_approved': reachedIndex = 3; break;
    case 'director_rejected': reachedIndex = 2; branchAt = 'accounts'; branchState = 'failed'; break;
    case 'director_correction': reachedIndex = 2; branchAt = 'accounts'; branchState = 'branched'; break;
    case 'verified': reachedIndex = 4; break;
    case 'correction_requested': reachedIndex = 2; branchAt = 'accounts'; branchState = 'branched'; break;
    case 'rejected': reachedIndex = 2; branchAt = 'accounts'; branchState = 'failed'; break;
    case 'payment_pending': reachedIndex = 4; break;
    case 'paid': reachedIndex = 4; break;
    case 'completed': reachedIndex = 5; break;
    default: reachedIndex = -1;
  }

  return stageOrder.map((key, i) => {
    let state: StepState = 'pending';
    if (branchAt === key) state = branchState;
    else if (i < reachedIndex || (i === reachedIndex && status === 'completed')) state = 'done';
    else if (i === reachedIndex) state = status === 'paid' && key === 'payment' ? 'done' : 'current';
    return { key, label: labels[key], state };
  });
}

export function BillProgressStepper({ status }: { status: BillStatus }) {
  const steps = buildSteps(status);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
      <View className="flex-row items-center">
        {steps.map((step, i) => {
          const meta = STEP_META[step.state];
          const isLast = i === steps.length - 1;
          return (
            <View key={step.key} className="flex-row items-center">
              <View className="items-center" style={{ width: 76 }}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 26, height: 26,
                    backgroundColor: step.state === 'pending' ? '#E2E8F0' : meta.bg,
                  }}
                >
                  {meta.icon ? (
                    <Ionicons name={meta.icon} size={13} color="#fff" />
                  ) : step.state === 'current' ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                  ) : null}
                </View>
                <Text
                  className="mt-1 text-center text-[10px] font-medium"
                  style={{ color: step.state === 'pending' ? '#94A3B8' : meta.color }}
                  numberOfLines={2}
                >
                  {step.label}
                </Text>
              </View>
              {!isLast ? (
                <View style={{ width: 20, height: 2, backgroundColor: step.state === 'done' ? '#059669' : '#E2E8F0', marginBottom: 16 }} />
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
