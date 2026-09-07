import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge } from '@/components/ui/Badge';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { ROLES } from '@/constants/roles';
import { useGetPurchaseOrderByRequirementQuery } from '@/features/purchaseOrders/api/purchaseOrdersApi';
import { useGetPaymentByQuotationQuery } from '@/features/payments/api/paymentsApi';
import { useGetRequirementQuotationsQuery } from '@/features/quotations/api/quotationsApi';
import { useGetRequirementByIdQuery } from '@/features/requirements/api/requirementsApi';
import type { RequirementStatus } from '@/features/requirements/types';
import { useGetRegisteredVendorQuery } from '@/features/vendorRegistration/api/vendorRegistrationApi';
import { useAuth } from '@/hooks/useAuth';
import type { DepartmentUserTabParamList, RequirementsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RequirementsStackParamList, 'RequirementPipeline'>;

type StepState = 'done' | 'pending' | 'not_reached';

const REQUIREMENT_STATUSES_BEFORE_VENDOR: RequirementStatus[] = [
  'draft', 'submitted', 'quotation_collection', 'quotation_comparison', 'director_review',
];

const STATE_STYLE: Record<StepState, { icon: keyof typeof Ionicons.glyphMap; color: string; badge: 'success' | 'primary' | 'neutral' }> = {
  done: { icon: 'checkmark-circle', color: '#059669', badge: 'success' },
  pending: { icon: 'time', color: '#d97706', badge: 'primary' },
  not_reached: { icon: 'ellipse-outline', color: '#94a3b8', badge: 'neutral' },
};

const STATE_LABEL: Record<StepState, string> = {
  done: 'Done',
  pending: 'In Progress',
  not_reached: 'Not Reached',
};

interface Step {
  key: string;
  title: string;
  detail: string;
  state: StepState;
  onPress?: () => void;
}

function StepRow({ step, isLast }: { step: Step; isLast: boolean }) {
  const style = STATE_STYLE[step.state];
  const Wrapper = step.onPress ? Pressable : View;

  return (
    <View className="flex-row">
      <View className="items-center" style={{ width: 32 }}>
        <Ionicons name={style.icon} size={22} color={style.color} />
        {!isLast ? <View className="mt-1 w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" /> : null}
      </View>
      <Wrapper
        {...(step.onPress ? { accessibilityRole: 'button', onPress: step.onPress } : {})}
        className="mb-5 ml-3 flex-1 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-sm font-semibold text-ink dark:text-white">{step.title}</Text>
          <Badge label={STATE_LABEL[step.state]} variant={style.badge} />
        </View>
        <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">{step.detail}</Text>
        {step.onPress ? (
          <View className="mt-2 flex-row items-center gap-1">
            <Text className="text-xs font-semibold text-primary-600">View details</Text>
            <Ionicons name="chevron-forward" size={12} color="#1e88e5" />
          </View>
        ) : null}
      </Wrapper>
    </View>
  );
}

/** Read-only, cross-role view of one Requirement's full journey — Requirement → Quotations/AI
 *  Comparison → Director Approval → Vendor Registration → Purchase Order → Goods Receipt →
 *  Bill → Payment. Stitches together the already-existing GET-by-requirement endpoints
 *  (no new aggregation endpoint — PurchaseOrder already denormalizes Goods Receipt and Bill
 *  status onto itself, per Phase 7/8, so a single PO fetch covers three stages). Every
 *  tap-through opens that stage's own existing detail screen; this screen never mutates
 *  anything itself. */
export function RequirementPipelineScreen({ navigation, route }: Props) {
  const { requirementId } = route.params;
  const { hasRole } = useAuth();

  const { data: requirement, isLoading } = useGetRequirementByIdQuery(requirementId);
  const { data: quotations = [] } = useGetRequirementQuotationsQuery(requirementId);

  const canSeeVendor = !!requirement && !REQUIREMENT_STATUSES_BEFORE_VENDOR.includes(requirement.status);
  const { data: vendor } = useGetRegisteredVendorQuery(requirementId, { skip: !canSeeVendor });

  const { data: po } = useGetPurchaseOrderByRequirementQuery(requirementId, {
    skip: !canSeeVendor,
  });

  const { data: payment } = useGetPaymentByQuotationQuery(po?.quotationId ?? '', { skip: !po?.quotationId });

  // Tab availability differs by role — CEO and Payment Department have no PurchaseOrders/Bills
  // tab mounted at all; HOD/Director/CEO have no Payments tab. Tap-through is only rendered
  // where a real destination exists, rather than firing a cross-tab navigate that silently
  // fails.
  const canOpenPurchaseOrder = !hasRole(ROLES.CEO, ROLES.PAYMENT_DEPARTMENT);
  const canOpenBill = !hasRole(ROLES.CEO, ROLES.PAYMENT_DEPARTMENT);
  const canOpenPayment = hasRole(ROLES.DEPARTMENT_USER, ROLES.ACCOUNTS, ROLES.PAYMENT_DEPARTMENT, ROLES.SUPER_ADMIN);
  const isAccounts = hasRole(ROLES.ACCOUNTS);
  const isDirector = hasRole(ROLES.DIRECTOR);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Pipeline Status" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!requirement) {
    return (
      <Screen padded={false}>
        <AppHeader title="Pipeline Status" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Requirement not found.</Text>
      </Screen>
    );
  }

  const status = requirement.status;
  const reachedQuotationStage = status !== 'draft';
  const passedQuotationStage = !['draft', 'submitted', 'quotation_collection'].includes(status);
  const reachedDirectorStage = ['quotation_comparison', 'director_review', 'approved', 'rejected', 'vendor_finalized', 'closed'].includes(status);
  const passedDirectorStage = ['approved', 'rejected', 'vendor_finalized', 'closed'].includes(status);
  const isRejected = status === 'rejected';

  const parent = navigation.getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>();
  // Loosely-typed escape hatch only for the two role-specific Bill tab/screen-name variants
  // (Accounts' own AccountsBillsNavigator, Director's differently-named "PendingBillApprovals"
  // tab) — every other cross-tab call above stays on the strongly-typed `parent`.
  const looseParent = parent as unknown as { navigate: (name: string, params?: unknown) => void } | undefined;

  const navigateToBill = (billId: string) => {
    if (isAccounts) {
      looseParent?.navigate('Bills', { screen: 'AccountsBillDetails', params: { billId } });
    } else if (isDirector) {
      looseParent?.navigate('PendingBillApprovals', { screen: 'BillDetails', params: { billId } });
    } else {
      parent?.navigate('Bills', { screen: 'BillDetails', params: { billId } });
    }
  };

  const steps: Step[] = [
    {
      key: 'requirement',
      title: 'Requirement',
      detail: `${requirement.requirementNumber} — ${requirement.title}`,
      state: 'done',
      onPress: () => navigation.navigate('RequirementDetails', { requirementId }),
    },
    {
      key: 'quotations',
      title: 'Quotations / AI Comparison',
      detail: quotations.length > 0
        ? `${quotations.length} quotation(s) collected.`
        : reachedQuotationStage ? 'Awaiting quotations.' : 'Not started.',
      state: !reachedQuotationStage ? 'not_reached' : passedQuotationStage ? 'done' : 'pending',
      onPress: quotations.length > 0 ? () => navigation.navigate('AiComparison', { requirementId }) : undefined,
    },
    {
      key: 'director-review',
      title: 'Director Approval',
      detail: isRejected ? 'Rejected by Director.' : passedDirectorStage ? 'Approved by Director.' : reachedDirectorStage ? 'Awaiting Director decision.' : 'Not reached yet.',
      state: !reachedDirectorStage ? 'not_reached' : isRejected || passedDirectorStage ? 'done' : 'pending',
      onPress: reachedDirectorStage ? () => navigation.navigate('DirectorReview', { requirementId }) : undefined,
    },
    {
      key: 'vendor',
      title: 'Vendor Registration',
      detail: vendor ? `${vendor.name} registered.` : canSeeVendor ? 'Awaiting vendor registration.' : 'Not reached yet.',
      state: vendor ? 'done' : canSeeVendor ? 'pending' : 'not_reached',
      onPress: canSeeVendor ? () => navigation.navigate('VendorRegistration', { requirementId }) : undefined,
    },
    {
      key: 'purchase-order',
      title: 'Purchase Order',
      detail: po ? `${po.poNumber} — ₹${po.grandTotal.toLocaleString('en-IN')}` : canSeeVendor ? 'Awaiting Purchase Order generation.' : 'Not reached yet.',
      state: po ? 'done' : canSeeVendor ? 'pending' : 'not_reached',
      onPress: po && canOpenPurchaseOrder
        ? () => parent?.navigate('PurchaseOrders', { screen: 'PurchaseOrderDetails', params: { purchaseOrderId: po.id } })
        : undefined,
    },
    {
      key: 'goods-receipt',
      title: 'Goods Receipt',
      detail: po?.grnNumber ? `${po.grnNumber} — ${po.goodsReceiptCondition ?? 'recorded'}.` : po ? 'Awaiting Goods Receipt.' : 'Not reached yet.',
      state: po?.grnNumber ? 'done' : po ? 'pending' : 'not_reached',
      onPress: po && canOpenPurchaseOrder
        ? () => parent?.navigate('PurchaseOrders', { screen: 'PurchaseOrderDetails', params: { purchaseOrderId: po.id } })
        : undefined,
    },
    {
      key: 'bill',
      // `director_approved` is a literal status value from before Director Financial Approval
      // was removed as a bill gate — it now just means "forwarded to Accounts," so it's spelled
      // out here rather than shown as raw `replace(/_/g, ' ')` text ("director approved"), which
      // would misleadingly read as if a Director had acted on it.
      title: 'Bill',
      detail: po?.billCode
        ? `${po.billCode} — ${po.billStatus === 'director_approved' ? 'with Accounts' : (po.billStatus ?? '').replace(/_/g, ' ') || 'raised'}.`
        : po ? 'Awaiting Bill creation.' : 'Not reached yet.',
      state: po?.billId ? 'done' : po ? 'pending' : 'not_reached',
      onPress: po?.billId && canOpenBill ? () => navigateToBill(po.billId!) : undefined,
    },
    {
      key: 'payment',
      title: 'Payment',
      detail: payment
        ? `${payment.paymentCode} — ${payment.status.replace(/_/g, ' ')}.`
        : ['paid', 'completed'].includes(po?.billStatus ?? '')
        ? `Payment ${po?.billStatus}.`
        : ['verified', 'payment_pending'].includes(po?.billStatus ?? '')
        ? 'Awaiting Payment.'
        : 'Not reached yet.',
      state: payment
        ? (['paid', 'completed'].includes(payment.status) ? 'done' : 'pending')
        : ['paid', 'completed'].includes(po?.billStatus ?? '')
        ? 'done'
        : ['verified', 'payment_pending'].includes(po?.billStatus ?? '')
        ? 'pending'
        : 'not_reached',
      onPress: payment && canOpenPayment
        ? () => parent?.navigate('Payments', { screen: 'PaymentDetails', params: { paymentId: payment.id } })
        : undefined,
    },
  ];

  return (
    <Screen padded={false}>
      <AppHeader title="Pipeline Status" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 32 }}>
        <DashboardCard className="mb-5">
          <Text className="text-sm font-semibold text-ink dark:text-slate-200">{requirement.requirementNumber}</Text>
          <Text className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">
            Full journey for this requirement — read-only. Tap any stage for details.
          </Text>
        </DashboardCard>

        {steps.map((step, index) => (
          <StepRow key={step.key} step={step} isLast={index === steps.length - 1} />
        ))}
      </ScrollView>
    </Screen>
  );
}
