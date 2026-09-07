import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { AiVerification, AiDifference } from '@/features/purchaseOrders/types';

interface Props {
  aiVerification: AiVerification;
}

const RISK_COLOR = { LOW: '#059669', MEDIUM: '#D97706', HIGH: '#DC2626' } as const;
const RISK_BG    = { LOW: '#ECFDF5', MEDIUM: '#FFFBEB', HIGH: '#FEF2F2' } as const;
const RISK_ICON: Record<string, 'shield-checkmark' | 'warning' | 'alert-circle'> = {
  LOW:    'shield-checkmark',
  MEDIUM: 'warning',
  HIGH:   'alert-circle',
};

const REC_COLOR = { APPROVE: '#059669', MANUAL_REVIEW: '#D97706', REJECT: '#DC2626' } as const;
const REC_BG    = { APPROVE: '#ECFDF5', MANUAL_REVIEW: '#FFFBEB', REJECT: '#FEF2F2' } as const;
const REC_LABEL = { APPROVE: 'Approve', MANUAL_REVIEW: 'Manual Review', REJECT: 'Reject' } as const;

const SEV_COLOR = { HIGH: '#DC2626', MEDIUM: '#D97706', LOW: '#059669' } as const;

function ScoreRing({ value }: { value: number }) {
  const color = value >= 85 ? '#059669' : value >= 65 ? '#D97706' : '#DC2626';
  return (
    <View style={[styles.ring, { borderColor: color }]}>
      <Text style={[styles.ringValue, { color }]}>{value}%</Text>
      <Text style={styles.ringLabel}>Match</Text>
    </View>
  );
}

function SeverityDot({ severity }: { severity?: AiDifference['severity'] }) {
  const color = SEV_COLOR[severity ?? 'MEDIUM'];
  return <View style={[styles.sevDot, { backgroundColor: color }]} />;
}

function formatExecTime(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n?: number): string {
  if (!n) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function shortModel(model?: string): string {
  if (!model || model === 'rule_engine_only') return 'Rule Engine';
  // "gemini-2.0-flash" → "Gemini 2.0 Flash"
  return model
    .replace('gemini-', 'Gemini ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AiVerificationCard({ aiVerification: ai }: Props) {
  const risk = ai.risk as keyof typeof RISK_COLOR;
  const rec  = ai.recommendation as keyof typeof REC_COLOR;
  const isGemini = ai.aiProvider === 'gemini';

  return (
    <View style={styles.card}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={16} color="#7C3AED" />
          <Text style={styles.headerTitle}>AI Verification</Text>
          {isGemini ? (
            <View style={styles.geminiBadge}>
              <Text style={styles.geminiBadgeText}>Gemini</Text>
            </View>
          ) : (
            <View style={styles.fallbackBadge}>
              <Text style={styles.fallbackBadgeText}>Rule Engine</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerDate}>
          {new Date(ai.verifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>

      {/* ── Score + risk/recommendation row ── */}
      <View style={styles.scoreRow}>
        <ScoreRing value={ai.matchPercentage} />
        <View style={styles.scoreRight}>
          <View style={[styles.badge, { backgroundColor: RISK_BG[risk] }]}>
            <Ionicons name={RISK_ICON[risk]} size={13} color={RISK_COLOR[risk]} />
            <Text style={[styles.badgeText, { color: RISK_COLOR[risk] }]}>Risk: {risk}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: REC_BG[rec], marginTop: 6 }]}>
            <Ionicons name="bulb-outline" size={13} color={REC_COLOR[rec]} />
            <Text style={[styles.badgeText, { color: REC_COLOR[rec] }]}>
              AI: {REC_LABEL[rec]}
            </Text>
          </View>
          <Text style={styles.confidence}>Confidence: {ai.confidence}%</Text>
        </View>
      </View>

      {/* ── Metrics row ── */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricVal}>{ai.ruleEngineScore ?? '—'}%</Text>
          <Text style={styles.metricLabel}>Rule Engine</Text>
        </View>
        <View style={[styles.metric, styles.metricBorder]}>
          <Text style={styles.metricVal}>{ai.differences.length}</Text>
          <Text style={styles.metricLabel}>Differences</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricVal}>{ai.confidence}%</Text>
          <Text style={styles.metricLabel}>Confidence</Text>
        </View>
      </View>

      {/* ── Gemini metadata row (only when Gemini ran) ── */}
      {isGemini && (
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text style={styles.metaText}>{formatExecTime(ai.executionTimeMs)}</Text>
            <Text style={styles.metaLabel}>Time</Text>
          </View>
          <View style={[styles.metaItem, styles.metaBorder]}>
            <Ionicons name="hardware-chip-outline" size={12} color="#6B7280" />
            <Text style={styles.metaText}>{shortModel(ai.modelVersion)}</Text>
            <Text style={styles.metaLabel}>Model</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="analytics-outline" size={12} color="#6B7280" />
            <Text style={styles.metaText}>
              {ai.tokenUsage ? formatTokens(ai.tokenUsage.totalTokens) : '—'}
            </Text>
            <Text style={styles.metaLabel}>Tokens</Text>
          </View>
        </View>
      )}

      {/* ── Summary ── */}
      {ai.summary ? (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{ai.summary}</Text>
        </View>
      ) : null}

      {/* ── Differences with severity badges ── */}
      {ai.differences.length > 0 && (
        <View style={styles.diffsSection}>
          <Text style={styles.diffsTitle}>
            Field Differences ({ai.differences.length})
          </Text>
          {ai.differences.map((d, i) => (
            <View key={i} style={styles.diffRow}>
              <SeverityDot severity={d.severity} />
              <View style={styles.diffContent}>
                <Text style={styles.diffField}>{d.field}</Text>
                <Text style={styles.diffDesc} numberOfLines={2}>{d.difference}</Text>
                {(d.purchaseOrder != null || d.bill != null) && (
                  <View style={styles.diffValues}>
                    <Text style={styles.diffPo} numberOfLines={1}>
                      PO: {String(d.purchaseOrder ?? '—')}
                    </Text>
                    <Text style={styles.diffBill} numberOfLines={1}>
                      Bill: {String(d.bill ?? '—')}
                    </Text>
                  </View>
                )}
              </View>
              {d.severity && (
                <View style={[styles.sevBadge, { backgroundColor: SEV_COLOR[d.severity] + '20' }]}>
                  <Text style={[styles.sevText, { color: SEV_COLOR[d.severity] }]}>
                    {d.severity}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── Disclaimer ── */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={13} color="#6B7280" />
        <Text style={styles.disclaimerText}>
          AI assists decision-making. Accounts Department makes the final decision.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:           { backgroundColor: '#FAF5FF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E9D5FF' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle:    { fontSize: 14, fontWeight: '700', color: '#6D28D9' },
  geminiBadge:    { backgroundColor: '#EDE9FE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  geminiBadgeText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  fallbackBadge:  { backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  fallbackBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  headerDate:     { fontSize: 11, color: '#9CA3AF' },
  scoreRow:       { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  ring:           { width: 80, height: 80, borderRadius: 40, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  ringValue:      { fontSize: 20, fontWeight: '800' },
  ringLabel:      { fontSize: 10, color: '#6B7280', marginTop: 1 },
  scoreRight:     { flex: 1 },
  badge:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, alignSelf: 'flex-start' },
  badgeText:      { fontSize: 12, fontWeight: '600' },
  confidence:     { fontSize: 12, color: '#6B7280', marginTop: 6 },
  metricsRow:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10 },
  metric:         { flex: 1, alignItems: 'center' },
  metricBorder:   { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F3F4F6' },
  metricVal:      { fontSize: 16, fontWeight: '700', color: '#111827' },
  metricLabel:    { fontSize: 11, color: '#6B7280', marginTop: 2 },
  metaRow:        { flexDirection: 'row', backgroundColor: '#F3F0FF', borderRadius: 10, padding: 10, marginBottom: 10 },
  metaItem:       { flex: 1, alignItems: 'center', gap: 2 },
  metaBorder:     { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E9D5FF' },
  metaText:       { fontSize: 12, fontWeight: '600', color: '#5B21B6' },
  metaLabel:      { fontSize: 10, color: '#8B5CF6' },
  summary:        { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 10 },
  summaryText:    { fontSize: 13, color: '#374151', lineHeight: 19 },
  diffsSection:   { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 10 },
  diffsTitle:     { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  diffRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sevDot:         { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  diffContent:    { flex: 1 },
  diffField:      { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  diffDesc:       { fontSize: 11, color: '#6B7280', marginTop: 1, lineHeight: 15 },
  diffValues:     { flexDirection: 'row', gap: 8, marginTop: 3 },
  diffPo:         { fontSize: 11, color: '#1D4ED8', flex: 1 },
  diffBill:       { fontSize: 11, color: '#B45309', flex: 1 },
  sevBadge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  sevText:        { fontSize: 10, fontWeight: '700' },
  disclaimer:     { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 2 },
  disclaimerText: { fontSize: 11, color: '#6B7280', flex: 1, lineHeight: 16 },
});
