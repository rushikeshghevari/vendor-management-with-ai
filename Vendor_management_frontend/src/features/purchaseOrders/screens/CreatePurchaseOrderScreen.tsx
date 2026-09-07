import { useCallback, useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { useGetDirectorReviewQuery } from '@/features/directorReview/api/directorReviewApi';
import { useCreatePurchaseOrderMutation } from '@/features/purchaseOrders/api/purchaseOrdersApi';
import { useGetQuotationsQuery, useGetRequirementQuotationsQuery } from '@/features/quotations/api/quotationsApi';
import { useGetRequirementByIdQuery } from '@/features/requirements/api/requirementsApi';
import { useGetRegisteredVendorQuery } from '@/features/vendorRegistration/api/vendorRegistrationApi';
import type { PurchaseOrderStackParamList } from '@/navigation/types';
import type { CreatePurchaseOrderItem } from '@/features/purchaseOrders/types';

type Props = NativeStackScreenProps<PurchaseOrderStackParamList, 'CreatePurchaseOrder'>;

interface ItemForm {
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  gstRate: string;
  discount: string;
}

const EMPTY_ITEM: ItemForm = { itemName: '', description: '', quantity: '', unitPrice: '0', gstRate: '18', discount: '0' };

function computeItemTotal(form: ItemForm): { gstAmount: number; taxAmount: number; total: number } {
  const qty = parseFloat(form.quantity) || 0;
  const price = parseFloat(form.unitPrice) || 0;
  const gstRate = parseFloat(form.gstRate) || 0;
  const discount = parseFloat(form.discount) || 0;
  const base = qty * price - discount;
  const gstAmount = (base * gstRate) / 100;
  const taxAmount = 0;
  const total = base + gstAmount + taxAmount;
  return { gstAmount, taxAmount, total };
}

const TERMS_OPTIONS = [
  'Net 30 days payment term. Delivery within 2 weeks.',
  'Net 45 days payment term. Delivery within 3 weeks.',
  '50% advance payment, 50% payment upon delivery.',
  'Immediate payment upon invoice delivery.',
];

export function CreatePurchaseOrderScreen({ navigation, route }: Props) {
  // Phase 7 — a Requirement entry point auto-resolves the registered Vendor and winning
  // Quotation server-side; the Quotation-picker step below is skipped entirely in that mode.
  const requirementId = route.params?.requirementId;
  const [selectedQuotationId, setSelectedQuotationId] = useState(route.params?.quotationId ?? '');
  const [items, setItems] = useState<ItemForm[]>([EMPTY_ITEM]);
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [showQuotationPicker, setShowQuotationPicker] = useState(false);
  const [showTermsPicker, setShowTermsPicker] = useState(false);
  const [hasPrefilledItems, setHasPrefilledItems] = useState(false);

  const { data: quotations = [] } = useGetQuotationsQuery(undefined, { skip: !!requirementId });
  const { data: requirement } = useGetRequirementByIdQuery(requirementId ?? '', { skip: !requirementId });
  const { data: registeredVendor } = useGetRegisteredVendorQuery(requirementId ?? '', { skip: !requirementId });
  // Needed only to find the amount the Director actually approved (see the prefill effect
  // below) — the requirement's own `estimatedRate` is just a budgeting figure from before any
  // quotation existed, not what was quoted and won.
  const { data: reviewPackage, isLoading: isLoadingReview } = useGetDirectorReviewQuery(requirementId ?? '', { skip: !requirementId });
  const { data: requirementQuotations = [] } = useGetRequirementQuotationsQuery(requirementId ?? '', { skip: !requirementId });
  const [createPo, { isLoading }] = useCreatePurchaseOrderMutation();

  // Only approved/billed quotations can generate POs
  const approvedQuotations = quotations.filter(
    (q) => q.status === 'approved' || q.status === 'billed',
  );

  const selectedQuotation = approvedQuotations.find((q) => q.id === selectedQuotationId);
  const winningQuotation = requirementQuotations.find((q) => q.id === reviewPackage?.review.selectedQuotationId);

  // Pre-fill line items from the Requirement's own items (name/qty) — the user can still edit
  // quantity/price/GST/discount per item before saving, same "pre-fill and let the user
  // verify" pattern as Vendor Registration (Phase 6). Unit price is rescaled from the
  // requirement's `estimatedRate` so the combined line-item total matches the winning
  // quotation's actual approved amount, once it's loaded — waits on the Director Review fetch
  // (`isLoadingReview`) rather than prefilling immediately, so it never has to run twice.
  useEffect(() => {
    if (requirementId && requirement && !hasPrefilledItems && !isLoadingReview) {
      const estimatedTotal = requirement.items.reduce((sum, item) => sum + item.quantity * item.estimatedRate, 0);
      const scale = winningQuotation && estimatedTotal > 0 ? winningQuotation.amount / estimatedTotal : 1;

      setItems(
        requirement.items.map((item) => ({
          itemName: item.itemName,
          description: item.specification ?? '',
          quantity: String(item.quantity),
          unitPrice: (item.estimatedRate * scale).toFixed(2),
          gstRate: '18',
          discount: '0',
        })),
      );
      setHasPrefilledItems(true);
    }
  }, [requirementId, requirement, hasPrefilledItems, isLoadingReview, winningQuotation]);

  const updateItem = useCallback((idx: number, field: keyof ItemForm, value: string) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }, []);

  const addItem = useCallback(() => setItems((prev) => [...prev, { ...EMPTY_ITEM }]), []);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = async () => {
    if (!requirementId && !selectedQuotationId) {
      Alert.alert('Error', 'Please select a Quotation');
      return;
    }
    const invalidItem = items.find((i) => !i.itemName.trim() || !parseFloat(i.quantity) || !parseFloat(i.unitPrice));
    if (invalidItem) {
      Alert.alert('Error', 'Please fill all item details (name, quantity, unit price)');
      return;
    }

    const poItems: CreatePurchaseOrderItem[] = items.map((form) => {
      const { gstAmount, taxAmount, total } = computeItemTotal(form);
      return {
        itemName:    form.itemName.trim(),
        description: form.description.trim() || undefined,
        quantity:    parseFloat(form.quantity),
        unitPrice:   parseFloat(form.unitPrice),
        gstRate:     parseFloat(form.gstRate) || 0,
        gstAmount,
        taxAmount,
        discount:    parseFloat(form.discount) || 0,
        total,
      };
    });

    try {
      const po = await createPo({
        ...(requirementId ? { requirementId } : { quotationId: selectedQuotationId }),
        items: poItems,
        terms: terms.trim() || undefined,
        notes: notes.trim() || undefined,
      }).unwrap();
      Alert.alert('Success', `Purchase Order ${po.poNumber} generated`, [
        { text: 'View PO', onPress: () => navigation.replace('PurchaseOrderDetails', { purchaseOrderId: po.id }) },
      ]);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to create Purchase Order';
      Alert.alert('Error', msg);
    }
  };

  const grandTotal = items.reduce((sum, form) => {
    const { total } = computeItemTotal(form);
    return sum + total;
  }, 0);

  return (
    <Screen padded={false}>
      <AppHeader title="Generate Purchase Order" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Requirement (Phase 7) — vendor/quotation auto-resolved server-side, read-only here */}
          {requirementId ? (
            <View style={styles.section}>
              <Text style={styles.label}>Requirement</Text>
              <View style={styles.picker}>
                <Text style={styles.pickerText}>
                  {requirement ? `${requirement.requirementNumber} — ${requirement.title}` : 'Loading...'}
                </Text>
              </View>
              <Text style={styles.label}>Vendor</Text>
              <View style={styles.picker}>
                <Text style={styles.pickerText}>
                  {registeredVendor ? `${registeredVendor.name} (${registeredVendor.code})` : 'Loading...'}
                </Text>
              </View>
            </View>
          ) : (
            /* Quotation Selector — original flow */
            <View style={styles.section}>
              <Text style={styles.label}>Quotation *</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowQuotationPicker((v) => !v)}
              >
                <Text style={[styles.pickerText, !selectedQuotation && styles.placeholder]}>
                  {selectedQuotation
                    ? `${selectedQuotation.quotationCode} — ₹${selectedQuotation.amount?.toLocaleString('en-IN')}`
                    : 'Select an Approved Quotation'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>

              {showQuotationPicker && (
                <View style={styles.dropdownList}>
                  {approvedQuotations.length === 0 ? (
                    <Text style={styles.dropdownEmpty}>No approved quotations available</Text>
                  ) : (
                    approvedQuotations.map((q) => (
                      <TouchableOpacity
                        key={q.id}
                        style={styles.dropdownItem}
                        onPress={() => { setSelectedQuotationId(q.id); setShowQuotationPicker(false); }}
                      >
                        <Text style={styles.dropdownItemText}>{q.quotationCode}</Text>
                        <Text style={styles.dropdownItemSub}>₹{q.amount?.toLocaleString('en-IN')} — {q.vendorName}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* Line Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            {items.map((item, idx) => {
              const { gstAmount, total } = computeItemTotal(item);
              return (
                <View key={idx} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemIndex}>Item {idx + 1}</Text>
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(idx)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.label}>Item Name *</Text>
                  <TextInput style={styles.input} placeholder="e.g. Office Chair" placeholderTextColor="#9CA3AF"
                    value={item.itemName} onChangeText={(v) => updateItem(idx, 'itemName', v)} />

                  <Text style={styles.label}>Description</Text>
                  <TextInput style={styles.input} placeholder="Optional description" placeholderTextColor="#9CA3AF"
                    value={item.description} onChangeText={(v) => updateItem(idx, 'description', v)} />

                  <View style={styles.row3}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Qty *</Text>
                      <TextInput style={styles.input} keyboardType="numeric" placeholder="1" placeholderTextColor="#9CA3AF"
                        value={item.quantity} onChangeText={(v) => updateItem(idx, 'quantity', v)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Unit Price *</Text>
                      <TextInput style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF"
                        value={item.unitPrice} onChangeText={(v) => updateItem(idx, 'unitPrice', v)} />
                    </View>
                    <View style={{ flex: 0.7 }}>
                      <Text style={styles.label}>GST %</Text>
                      <TextInput style={styles.input} keyboardType="numeric" placeholder="18" placeholderTextColor="#9CA3AF"
                        value={item.gstRate} onChangeText={(v) => updateItem(idx, 'gstRate', v)} />
                    </View>
                  </View>

                  <View style={styles.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Discount</Text>
                      <TextInput style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF"
                        value={item.discount} onChangeText={(v) => updateItem(idx, 'discount', v)} />
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.label}>GST Amt / Total</Text>
                      <View style={styles.computed}>
                        <Text style={styles.computedText}>
                          ₹{gstAmount.toFixed(2)} / <Text style={{ fontWeight: '700', color: '#111827' }}>₹{total.toFixed(2)}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
              <Text style={styles.addItemText}>Add Line Item</Text>
            </TouchableOpacity>
          </View>

          {/* Terms & Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Terms & Conditions</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowTermsPicker((v) => !v)}
            >
              <Text style={[styles.pickerText, !terms && styles.placeholder]}>
                {terms || 'Select Terms & Conditions'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {showTermsPicker && (
              <View style={styles.dropdownList}>
                {TERMS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.dropdownItem}
                    onPress={() => { setTerms(opt); setShowTermsPicker(false); }}
                  >
                    <Text style={styles.dropdownItemText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.multiline]} multiline numberOfLines={2}
              placeholder="Additional notes..." placeholderTextColor="#9CA3AF"
              value={notes} onChangeText={setNotes} />
          </View>

          {/* Grand Total */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>
              ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Generate Purchase Order</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:          { padding: 16, paddingBottom: 40 },
  section:         { marginBottom: 20 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  label:           { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 8 },
  input:           { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  multiline:       { minHeight: 80, textAlignVertical: 'top' },
  picker:          { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText:      { fontSize: 14, color: '#111827', flex: 1 },
  placeholder:     { color: '#9CA3AF' },
  dropdownList:    { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4, maxHeight: 220 },
  dropdownEmpty:   { padding: 16, color: '#9CA3AF', textAlign: 'center' },
  dropdownItem:    { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText:{ fontSize: 14, fontWeight: '600', color: '#111827' },
  dropdownItemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemCard:        { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  itemHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemIndex:       { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  row3:            { flexDirection: 'row', gap: 8 },
  row2:            { flexDirection: 'row', gap: 8 },
  computed:        { backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 10 },
  computedText:    { fontSize: 13, color: '#6B7280' },
  addItemBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#2563EB' },
  addItemText:     { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  totalCard:       { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel:      { fontSize: 15, fontWeight: '600', color: '#1D4ED8' },
  totalValue:      { fontSize: 20, fontWeight: '800', color: '#1D4ED8' },
  submitBtn:       { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitDisabled:  { opacity: 0.6 },
  submitText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
