import { useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AiVerificationCard } from '@/features/aiVerification/components/AiVerificationCard';
import {
  useGetPurchaseOrderByIdQuery,
  useCreateAuditLogMutation,
  useGetAuditLogsByPoQuery,
} from '@/features/purchaseOrders/api/purchaseOrdersApi';
import { useAuth } from '@/hooks/useAuth';
import type { PurchaseOrderStackParamList } from '@/navigation/types';
import type { AiDifference } from '@/features/purchaseOrders/types';

type Props = NativeStackScreenProps<PurchaseOrderStackParamList, 'ComparisonScreen'>;

type Decision = 'verified' | 'correction_requested' | 'rejected';

const DECISION_CONFIG: Record<Decision, { label: string; color: string; bg: string; icon: string }> = {
  verified:             { label: 'Verify & Approve',     color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle' },
  correction_requested: { label: 'Request Correction',   color: '#D97706', bg: '#FFFBEB', icon: 'create-outline' },
  rejected:             { label: 'Reject Bill',           color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle' },
};

type DiffStatus = 'match' | 'warning' | 'mismatch';

function diffColor(status: DiffStatus) {
  if (status === 'match')    return '#059669';
  if (status === 'warning')  return '#D97706';
  return '#DC2626';
}
function diffBg(status: DiffStatus) {
  if (status === 'match')    return '#ECFDF5';
  if (status === 'warning')  return '#FFFBEB';
  return '#FFF5F5';
}
function diffBorder(status: DiffStatus) {
  if (status === 'match')    return '#A7F3D0';
  if (status === 'warning')  return '#FDE68A';
  return '#FECACA';
}

function classifyDiff(diff: AiDifference): DiffStatus {
  const lc = diff.difference.toLowerCase();
  if (lc.includes('match') || lc.includes('identical')) return 'match';
  if (lc.includes('minor') || lc.includes('warning') || lc.includes('small')) return 'warning';
  return 'mismatch';
}

function CompareRow({
  field, poValue, billValue, status,
}: { field: string; poValue: unknown; billValue: unknown; status: DiffStatus }) {
  const color = diffColor(status);
  const bg    = diffBg(status);
  const border = diffBorder(status);

  const icon: 'checkmark-circle' | 'warning' | 'close-circle' =
    status === 'match' ? 'checkmark-circle' : status === 'warning' ? 'warning' : 'close-circle';

  return (
    <View style={[styles.compareRow, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.compareField}>
        <Ionicons name={icon} size={14} color={color} style={{ marginRight: 5 }} />
        <Text style={[styles.compareFieldName, { color }]}>{field}</Text>
      </View>
      <View style={styles.compareValues}>
        <View style={styles.compareCol}>
          <Text style={styles.compareColLabel}>PO</Text>
          <Text style={styles.compareColValue} numberOfLines={2}>{String(poValue ?? '—')}</Text>
        </View>
        <View style={[styles.compareCol, styles.compareColRight]}>
          <Text style={styles.compareColLabel}>Bill</Text>
          <Text style={styles.compareColValue} numberOfLines={2}>{String(billValue ?? '—')}</Text>
        </View>
      </View>
    </View>
  );
}

function DecisionSheet({
  visible, decision, isSubmitting, onConfirm, onClose,
}: {
  visible: boolean;
  decision: Decision | null;
  isSubmitting: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  if (!decision) return null;
  const cfg = DECISION_CONFIG[decision];
  const requiresReason = decision !== 'verified';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={[styles.sheetHeader, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as never} size={22} color={cfg.color} />
            <Text style={[styles.sheetTitle, { color: cfg.color }]}>{cfg.label}</Text>
          </View>

          {decision === 'verified' && (
            <Text style={styles.sheetInfo}>
              You are confirming that this Bill matches the Purchase Order. An Audit Log will be created.
            </Text>
          )}
          {decision === 'correction_requested' && (
            <Text style={styles.sheetInfo}>
              You are requesting a correction. The Department User will be notified to resubmit.
            </Text>
          )}
          {decision === 'rejected' && (
            <Text style={styles.sheetInfo}>
              You are rejecting this Bill. Please provide a reason. This cannot be undone.
            </Text>
          )}

          {requiresReason && (
            <>
              <Text style={styles.sheetReasonLabel}>Reason *</Text>
              <TextInput
                style={styles.sheetReasonInput}
                multiline
                numberOfLines={3}
                placeholder="Explain why..."
                placeholderTextColor="#9CA3AF"
                value={reason}
                onChangeText={setReason}
              />
            </>
          )}

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => { setReason(''); onClose(); }}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetConfirm, { backgroundColor: cfg.color }]}
              onPress={() => { onConfirm(reason || undefined); setReason(''); }}
              disabled={isSubmitting || (requiresReason && !reason.trim())}
            >
              {isSubmitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.sheetConfirmText}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ComparisonScreen({ route, navigation }: Props) {
  const { purchaseOrderId } = route.params;
  const { user } = useAuth();

  const { data: po, isLoading } = useGetPurchaseOrderByIdQuery(purchaseOrderId);
  const { data: auditLogs = [] } = useGetAuditLogsByPoQuery(purchaseOrderId);
  const [createAuditLog, { isLoading: isDeciding }] = useCreateAuditLogMutation();

  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);

  const isAccountsOrAdmin = user?.role === 'accounts' || user?.role === 'super_admin';
  const canDecide = isAccountsOrAdmin && po?.status === 'ai_verified' && !auditLogs.length;

  const handleConfirm = async (reason?: string) => {
    if (!po || !pendingDecision) return;
    if (!po.billId || !po.quotationId) {
      Alert.alert('Error', 'Bill or Quotation reference missing on this PO');
      return;
    }
    try {
      await createAuditLog({
        purchaseOrderId: po.id,
        billId: po.billId,
        quotationId: po.quotationId,
        accountsDecision: pendingDecision,
        reason,
      }).unwrap();
      setPendingDecision(null);
      Alert.alert('Decision Recorded', 'The Audit Log has been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to record decision';
      Alert.alert('Error', msg);
    }
  };

  if (isLoading || !po) {
    return (
      <Screen padded={false}>
        <AppHeader title="PO vs Bill Comparison" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>
      </Screen>
    );
  }

  const differences = po.aiVerification?.differences ?? [];

  // Build comparison rows from AI differences
  const comparisonRows = differences.map((d) => ({
    field: d.field,
    poValue: d.purchaseOrder,
    billValue: d.bill,
    status: classifyDiff(d),
  }));

  const matchCount    = comparisonRows.filter((r) => r.status === 'match').length;
  const warningCount  = comparisonRows.filter((r) => r.status === 'warning').length;
  const mismatchCount = comparisonRows.filter((r) => r.status === 'mismatch').length;

  return (
    <Screen padded={false}>
      <AppHeader title="PO vs Bill Comparison" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerPo}>{po.poNumber}</Text>
          {po.billCode && <Text style={styles.headerBill}>Bill: {po.billCode}</Text>}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
            <Text style={styles.legendText}>Matched ({matchCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.legendText}>Warning ({warningCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Mismatch ({mismatchCount})</Text>
          </View>
        </View>

        {/* AI Verification Card */}
        {po.aiVerification && <AiVerificationCard aiVerification={po.aiVerification} />}

        {/* Comparison table */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Field-by-Field Comparison</Text>
          {comparisonRows.length === 0 ? (
            <Text style={styles.emptyText}>No field-level differences reported by AI.</Text>
          ) : (
            comparisonRows.map((row, idx) => (
              <CompareRow key={idx} {...row} />
            ))
          )}
        </View>

        {/* Summary totals */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.compareRow}>
            <View style={styles.compareValues}>
              <View style={styles.compareCol}>
                <Text style={styles.compareColLabel}>PO Grand Total</Text>
                <Text style={[styles.compareColValue, { fontWeight: '700', color: '#1D4ED8' }]}>
                  ₹{po.grandTotal.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.compareCol, styles.compareColRight]}>
                <Text style={styles.compareColLabel}>Bill Invoice Amount</Text>
                <Text style={[styles.compareColValue, { fontWeight: '700', color: '#111827' }]}>
                  {po.billInvoiceAmount ? `₹${po.billInvoiceAmount.toLocaleString('en-IN')}` : '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Audit Log History */}
        {auditLogs.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Decision History</Text>
            {auditLogs.map((log, idx) => {
              const decColor = log.accountsDecision === 'verified' ? '#059669'
                : log.accountsDecision === 'rejected' ? '#DC2626' : '#D97706';
              return (
                <View key={idx} style={[styles.auditEntry, idx > 0 && styles.auditEntryBorder]}>
                  <View style={styles.auditHeader}>
                    <Text style={[styles.auditDecision, { color: decColor }]}>
                      {log.accountsDecision.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.auditDate}>
                      {new Date(log.decidedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.auditBy}>By {log.decidedByName}</Text>
                  {log.reason && <Text style={styles.auditReason}>{log.reason}</Text>}
                </View>
              );
            })}
          </View>
        )}

        {/* Accounts Decision buttons */}
        {canDecide && (
          <View style={styles.decisionSection}>
            <Text style={styles.decisionTitle}>Accounts Decision</Text>
            <Text style={styles.decisionSubtitle}>
              AI recommends: {po.aiVerification?.recommendation.replace(/_/g, ' ')} — but you make the final call.
            </Text>
            {(['verified', 'correction_requested', 'rejected'] as Decision[]).map((d) => {
              const cfg = DECISION_CONFIG[d];
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.decisionBtn, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                  onPress={() => setPendingDecision(d)}
                >
                  <Ionicons name={cfg.icon as never} size={18} color={cfg.color} />
                  <Text style={[styles.decisionBtnText, { color: cfg.color }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {po.status === 'accounts_verified' && (
          <View style={styles.verifiedBanner}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
            <Text style={styles.verifiedText}>This PO has been verified by Accounts.</Text>
          </View>
        )}
      </ScrollView>

      <DecisionSheet
        visible={!!pendingDecision}
        decision={pendingDecision}
        isSubmitting={isDeciding}
        onConfirm={handleConfirm}
        onClose={() => setPendingDecision(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:            { padding: 16, paddingBottom: 40 },
  centered:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard:        { backgroundColor: '#1D4ED8', borderRadius: 12, padding: 16, marginBottom: 12 },
  headerPo:          { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerBill:        { fontSize: 13, color: '#BFDBFE', marginTop: 2 },
  legend:            { flexDirection: 'row', gap: 16, marginBottom: 12, paddingHorizontal: 4 },
  legendItem:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:         { width: 10, height: 10, borderRadius: 5 },
  legendText:        { fontSize: 12, color: '#6B7280' },
  sectionCard:       { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  sectionTitle:      { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  emptyText:         { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
  compareRow:        { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 8 },
  compareField:      { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  compareFieldName:  { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  compareValues:     { flexDirection: 'row', gap: 8 },
  compareCol:        { flex: 1 },
  compareColRight:   { borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.06)', paddingLeft: 8 },
  compareColLabel:   { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  compareColValue:   { fontSize: 13, color: '#111827' },
  auditEntry:        { paddingVertical: 8 },
  auditEntryBorder:  { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  auditHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditDecision:     { fontSize: 13, fontWeight: '700' },
  auditDate:         { fontSize: 11, color: '#9CA3AF' },
  auditBy:           { fontSize: 12, color: '#6B7280', marginTop: 2 },
  auditReason:       { fontSize: 13, color: '#374151', marginTop: 4, fontStyle: 'italic' },
  decisionSection:   { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  decisionTitle:     { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  decisionSubtitle:  { fontSize: 12, color: '#6B7280', marginBottom: 14 },
  decisionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 8 },
  decisionBtnText:   { fontSize: 14, fontWeight: '600' },
  verifiedBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#A7F3D0' },
  verifiedText:      { fontSize: 13, color: '#059669', fontWeight: '600', flex: 1 },
  sheetBackdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:             { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 14 },
  sheetTitle:        { fontSize: 16, fontWeight: '700' },
  sheetInfo:         { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 14 },
  sheetReasonLabel:  { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  sheetReasonInput:  { backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 10, fontSize: 14, color: '#111827', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  sheetActions:      { flexDirection: 'row', gap: 10 },
  sheetCancel:       { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  sheetCancelText:   { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  sheetConfirm:      { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  sheetConfirmText:  { fontSize: 14, fontWeight: '600', color: '#fff' },
});
