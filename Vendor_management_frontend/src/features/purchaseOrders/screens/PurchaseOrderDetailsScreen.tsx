import { useState } from 'react';
import {
  Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { PurchaseOrderStatusBadge } from '@/features/purchaseOrders/components/PurchaseOrderStatusBadge';
import {
  useEmailPurchaseOrderMutation,
  useGetPurchaseOrderByIdQuery,
  useSharePurchaseOrderMutation,
  useTriggerAiVerificationMutation,
} from '@/features/purchaseOrders/api/purchaseOrdersApi';
import { AiVerificationCard } from '@/features/aiVerification/components/AiVerificationCard';
import { useAuth } from '@/hooks/useAuth';
import { secureStorage } from '@/utils/secureStorage';
import type { DepartmentUserTabParamList, PurchaseOrderStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PurchaseOrderStackParamList, 'PurchaseOrderDetails'>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') ?? '';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PurchaseOrderDetailsScreen({ route, navigation }: Props) {
  const { purchaseOrderId } = route.params;
  const { user } = useAuth();

  const { data: po, isLoading, isError, error, refetch } = useGetPurchaseOrderByIdQuery(purchaseOrderId);
  const [triggerAi, { isLoading: isVerifying }] = useTriggerAiVerificationMutation();
  const [recordShare] = useSharePurchaseOrderMutation();
  const [emailToVendor, { isLoading: isEmailing }] = useEmailPurchaseOrderMutation();
  const [isSharing, setIsSharing] = useState(false);

  const isAccountsOrAdmin = user?.role === 'accounts' || user?.role === 'super_admin';
  // Phase 8 — same roles that may generate a PO in the first place (GRN_CREATE_ROLES on the
  // backend) may record Goods Receipt against it.
  const canRecordGoodsReceipt = user?.role === 'department_user' || user?.role === 'hod' || user?.role === 'super_admin';
  // Matches BILL_WRITE_ROLES on the backend exactly (billService.create()) — Super Admin
  // cannot create a Bill, unlike Goods Receipt.
  const canCreateBill = user?.role === 'department_user' || user?.role === 'hod';

  const handleTriggerAi = () => {
    if (!po) return;
    Alert.alert(
      'Run AI Verification',
      'This will compare the Purchase Order with the linked Bill using AI. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run AI',
          onPress: async () => {
            try {
              await triggerAi(po.id).unwrap();
              Alert.alert('Success', 'AI Verification complete. Results are now available.');
            } catch (err: unknown) {
              const msg = (err as { data?: { message?: string } })?.data?.message ?? 'AI Verification failed';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const handleDownloadPdf = async () => {
    if (!po) return;
    const url = `${API_BASE}/api/v1/purchase-orders/${po.id}/pdf`;
    await Linking.openURL(url);
  };

  // Downloads the PO PDF into local storage (the /pdf route requires auth, so the token has
  // to travel as a header — Linking.openURL can't do that), then hands it to the OS share
  // sheet, which itself lists every installed app capable of receiving a PDF (Email, WhatsApp,
  // Print via a print-service target on Android, AirPrint on iOS, etc.) — no per-channel
  // integration needed. Recording happens after the sheet closes, regardless of what the user
  // picked (or canceled), since the OS doesn't report back which target was chosen.
  const handleShare = async () => {
    if (!po) return;
    setIsSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing Unavailable', 'This device cannot open the share sheet.');
        return;
      }

      const token = await secureStorage.getAccessToken();
      const url = `${API_BASE}/api/v1/purchase-orders/${po.id}/pdf`;
      const destination = new File(Paths.cache, `${po.poNumber}.pdf`);
      const downloaded = await File.downloadFileAsync(url, destination, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        idempotent: true,
      });

      await Sharing.shareAsync(downloaded.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Purchase Order ${po.poNumber}`,
      });

      recordShare({ id: po.id }).unwrap().catch(() => null);
    } catch {
      Alert.alert('Could Not Share', 'Failed to prepare the Purchase Order PDF for sharing.');
    } finally {
      setIsSharing(false);
    }
  };

  // Phase 7 — actually sends the PO PDF to the vendor via SMTP server-side (distinct from
  // handleShare above, which only opens the OS share sheet). `sent: false` (e.g. SMTP not
  // configured on this deployment) is reported as an informational alert, not an error.
  const handleEmailToVendor = async () => {
    if (!po) return;
    try {
      const result = await emailToVendor({ id: po.id }).unwrap();
      if (result.sent) {
        Alert.alert('Email Sent', `Purchase Order emailed to ${result.recipientEmail}.`);
      } else {
        Alert.alert('Email Not Sent', result.reason ? `${result.reason} (recipient: ${result.recipientEmail})` : 'The email could not be sent.');
      }
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to email the Purchase Order';
      Alert.alert('Error', msg);
    }
  };

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Purchase Order" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </Screen>
    );
  }

  if (isError || !po) {
    const errorMsg = (error as { data?: { message?: string } })?.data?.message || 'Purchase Order not found';
    return (
      <Screen padded={false}>
        <AppHeader title="Purchase Order" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={{ fontSize: 16, color: '#EF4444', marginBottom: 12, textAlign: 'center' }}>{errorMsg}</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.actionBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppHeader title={po.poNumber} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.poNumber}>{po.poNumber}</Text>
              <Text style={styles.poDate}>{formatDate(po.poDate)}</Text>
            </View>
            <PurchaseOrderStatusBadge status={po.status} />
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.grandTotal}>{formatCurrency(po.grandTotal)}</Text>
            <Text style={styles.headerSub}>Grand Total</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDownloadPdf}>
            <Ionicons name="download-outline" size={18} color="#2563EB" />
            <Text style={styles.actionBtnText}>Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} disabled={isSharing}>
            {isSharing
              ? <ActivityIndicator size="small" color="#2563EB" />
              : <Ionicons name="share-social-outline" size={18} color="#2563EB" />}
            <Text style={styles.actionBtnText}>{isSharing ? 'Preparing…' : 'Share'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleEmailToVendor} disabled={isEmailing}>
            {isEmailing
              ? <ActivityIndicator size="small" color="#2563EB" />
              : <Ionicons name="mail-outline" size={18} color="#2563EB" />}
            <Text style={styles.actionBtnText}>{isEmailing ? 'Sending…' : 'Email to Vendor'}</Text>
          </TouchableOpacity>
          {isAccountsOrAdmin && po.billId && !po.aiVerification && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnAi]}
              onPress={handleTriggerAi}
              disabled={isVerifying}
            >
              {isVerifying
                ? <ActivityIndicator size="small" color="#7C3AED" />
                : <Ionicons name="sparkles-outline" size={18} color="#7C3AED" />}
              <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>
                {isVerifying ? 'Verifying...' : 'Run AI Verification'}
              </Text>
            </TouchableOpacity>
          )}
          {isAccountsOrAdmin && po.aiVerification && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnComparison]}
              onPress={() => navigation.navigate('ComparisonScreen', { purchaseOrderId: po.id })}
            >
              <Ionicons name="git-compare-outline" size={18} color="#059669" />
              <Text style={[styles.actionBtnText, { color: '#059669' }]}>Compare PO vs Bill</Text>
            </TouchableOpacity>
          )}
          {canRecordGoodsReceipt && !po.goodsReceiptId && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnComparison]}
              onPress={() => navigation.navigate('RecordGoodsReceipt', { purchaseOrderId: po.id })}
            >
              <Ionicons name="cube-outline" size={18} color="#059669" />
              <Text style={[styles.actionBtnText, { color: '#059669' }]}>Record Goods Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AI Verification Card */}
        {po.aiVerification && (
          <AiVerificationCard aiVerification={po.aiVerification} />
        )}

        {/* PO Details */}
        <SectionCard title="Purchase Order Details">
          {po.requirementNumber ? <Row label="Requirement" value={po.requirementNumber} /> : null}
          <Row label="Quotation Ref" value={po.quotationCode} />
          <Row label="Department" value={po.departmentName} />
          <Row label="PO Date" value={formatDate(po.poDate)} />
        </SectionCard>

        {/* Vendor */}
        <SectionCard title="Vendor Details">
          <Row label="Name" value={po.vendorName} />
          <Row label="GST" value={po.vendorGst} />
          <Row label="Address" value={po.vendorAddress} />
        </SectionCard>

        {/* Line Items */}
        <SectionCard title="Line Items">
          {po.items.map((item, idx) => (
            <View key={idx} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemName}>{item.itemName}</Text>
                <Text style={styles.lineItemTotal}>{formatCurrency(item.total)}</Text>
              </View>
              {item.description ? <Text style={styles.lineItemDesc}>{item.description}</Text> : null}
              <View style={styles.lineItemMeta}>
                <Text style={styles.lineItemMetaText}>Qty: {item.quantity}</Text>
                <Text style={styles.lineItemMetaText}>× {formatCurrency(item.unitPrice)}</Text>
                <Text style={styles.lineItemMetaText}>GST: {item.gstRate}%</Text>
                {item.discount > 0 && <Text style={styles.lineItemMetaText}>Disc: -{formatCurrency(item.discount)}</Text>}
              </View>
            </View>
          ))}
        </SectionCard>

        {/* Totals */}
        <SectionCard title="Summary">
          <Row label="Subtotal" value={formatCurrency(po.subtotal)} />
          <Row label="Total GST" value={formatCurrency(po.totalGst)} />
          {po.totalTax > 0 && <Row label="Total Tax" value={formatCurrency(po.totalTax)} />}
          {po.totalDiscount > 0 && <Row label="Total Discount" value={`-${formatCurrency(po.totalDiscount)}`} />}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(po.grandTotal)}</Text>
          </View>
        </SectionCard>

        {/* Goods Receipt (Phase 8) */}
        {po.grnNumber && (
          <SectionCard title="Goods Receipt">
            <Row label="GRN Number" value={po.grnNumber} />
            {po.goodsReceiptDate && <Row label="Received Date" value={formatDate(po.goodsReceiptDate)} />}
            {po.goodsReceiptCondition && <Row label="Condition" value={po.goodsReceiptCondition.toUpperCase().replace(/_/g, ' ')} />}
          </SectionCard>
        )}
        {po.requirementId && !po.goodsReceiptId && (
          <SectionCard title="Goods Receipt">
            <Text style={styles.termsText}>
              This Purchase Order requires Goods Receipt to be recorded before a Bill can be created.
            </Text>
          </SectionCard>
        )}

        {/* Create Bill — the only entry point for a Requirement-originated PO's Bill, since the
            standalone "Create Bill" button on QuotationDetailsScreen only ever applies to the
            legacy quotation-picking flow (that screen never lists a Requirement-linked
            quotation). Reuses the existing Bills tab / CreateBillScreen — nothing new built. */}
        {canCreateBill && po.requirementId && po.goodsReceiptId && !po.billId && (
          <SectionCard title="Bill">
            <Text style={styles.termsText}>
              Goods Receipt recorded — a Bill can now be created against this Purchase Order.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnComparison, { marginTop: 12, alignSelf: 'flex-start' }]}
              onPress={() =>
                navigation
                  .getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>()
                  ?.navigate('Bills', { screen: 'CreateBill', params: { quotationId: po.quotationId } })
              }
            >
              <Ionicons name="receipt-outline" size={18} color="#059669" />
              <Text style={[styles.actionBtnText, { color: '#059669' }]}>Create Bill</Text>
            </TouchableOpacity>
          </SectionCard>
        )}

        {/* Linked Bill */}
        {po.billCode && (
          <SectionCard title="Linked Bill">
            <Row label="Bill Code" value={po.billCode} />
            {po.billStatus && <Row label="Bill Status" value={po.billStatus.toUpperCase().replace(/_/g, ' ')} />}
            {po.billInvoiceAmount !== undefined && (
              <Row label="Invoice Amount" value={formatCurrency(po.billInvoiceAmount)} />
            )}
          </SectionCard>
        )}

        {po.terms && (
          <SectionCard title="Terms & Conditions">
            <Text style={styles.termsText}>{po.terms}</Text>
          </SectionCard>
        )}
        {po.notes && (
          <SectionCard title="Notes">
            <Text style={styles.termsText}>{po.notes}</Text>
          </SectionCard>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:            { padding: 16, paddingBottom: 40 },
  centered:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard:        { backgroundColor: '#1D4ED8', borderRadius: 14, padding: 20, marginBottom: 12 },
  headerTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  poNumber:          { fontSize: 18, fontWeight: '800', color: '#fff' },
  poDate:            { fontSize: 12, color: '#BFDBFE', marginTop: 2 },
  headerMeta:        {},
  grandTotal:        { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub:         { fontSize: 12, color: '#BFDBFE', marginTop: 2 },
  actionsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  actionBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  actionBtnAi:       { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' },
  actionBtnComparison: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  actionBtnText:     { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  card:              { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardTitle:         { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  row:               { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel:          { fontSize: 13, color: '#6B7280', flex: 1 },
  rowValue:          { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1.5, textAlign: 'right' },
  lineItem:          { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lineItemHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineItemName:      { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  lineItemTotal:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  lineItemDesc:      { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  lineItemMeta:      { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  lineItemMetaText:  { fontSize: 12, color: '#6B7280' },
  grandTotalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4 },
  grandTotalLabel:   { fontSize: 15, fontWeight: '700', color: '#111827' },
  grandTotalValue:   { fontSize: 15, fontWeight: '800', color: '#1D4ED8' },
  termsText:         { fontSize: 13, color: '#374151', lineHeight: 20 },
});
