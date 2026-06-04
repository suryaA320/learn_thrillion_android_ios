import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import ParentBottomNav from '../../components/ParentBottomNav';
import ParentChildPicker from '../../components/ParentChildPicker';
import { fetchParentFees } from '../../utils/schoolApi';
import { useParentPortal } from '../../context/ParentPortalContext';

const ACCENT = '#0f766e';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load fee details.';
}

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function FeeRow({ label, value, highlight = false, danger = false }) {
  return (
    <View style={styles.feeRow}>
      <Text style={styles.feeLabel}>{label}</Text>
      <Text
        style={[
          styles.feeValue,
          highlight && styles.feeValueHighlight,
          danger && styles.feeValueDanger,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ParentFeesScreen() {
  const { selectedStudentId, loading: portalLoading, error: portalError } = useParentPortal();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feeData, setFeeData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!selectedStudentId) {
      setFeeData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError('');
    try {
      const data = await fetchParentFees(selectedStudentId);
      setFeeData(data && typeof data === 'object' ? data : null);
    } catch (e) {
      setFeeData(null);
      setError(formatApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStudentId]);

  useFocusEffect(
    useCallback(() => {
      if (portalLoading) return;
      setLoading(true);
      load();
    }, [load, portalLoading])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const banner = portalError || error;
  const payments = Array.isArray(feeData?.payments) ? feeData.payments : [];
  const hasAccount = Boolean(feeData?.id || feeData?.fee_account_id);
  const balance = Number(feeData?.balance ?? 0);
  const waiting = (portalLoading || loading) && !banner && !feeData;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Fees info" />
        <ParentChildPicker />

        {waiting ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.muted}>Loading fee details…</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
            }
          >
            {banner ? <Text style={styles.banner}>{banner}</Text> : null}

            {feeData ? (
              <>
                <View style={styles.heroCard}>
                  <Text style={styles.heroTitle}>{feeData.student_name || 'Student'}</Text>
                  <Text style={styles.heroMeta}>
                    {[
                      feeData.admission_number ? `#${feeData.admission_number}` : '',
                      feeData.class_name,
                      feeData.section_name,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {feeData.academic_year ? (
                    <Text style={styles.heroYear}>Academic year: {feeData.academic_year}</Text>
                  ) : null}
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.sectionTitle}>Fee summary</Text>
                  <FeeRow label="Basic fees" value={formatMoney(feeData.basic_fees)} />
                  <FeeRow label="Concession" value={formatMoney(feeData.concession_fees)} />
                  <FeeRow label="Total fees" value={formatMoney(feeData.total_fees)} highlight />
                  <FeeRow label="Total paid" value={formatMoney(feeData.total_paid)} />
                  <FeeRow
                    label="Balance due"
                    value={formatMoney(feeData.balance)}
                    highlight
                    danger={balance > 0}
                  />
                  {!hasAccount ? (
                    <Text style={styles.note}>
                      No fee account is set up for this academic year yet. Contact your school office.
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.sectionTitle}>Payment history</Text>
                {payments.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No payments recorded</Text>
                    <Text style={styles.emptySub}>Payments made at school will appear here.</Text>
                  </View>
                ) : (
                  payments.map((p, idx) => (
                    <View key={`${p.receipt_no || 'pay'}-${idx}`} style={styles.paymentCard}>
                      <View style={styles.paymentTop}>
                        <Text style={styles.paymentAmount}>{formatMoney(p.amount_paid)}</Text>
                        <Text style={styles.paymentStatus}>{p.payment_status || 'Paid'}</Text>
                      </View>
                      <Text style={styles.paymentMeta}>
                        {formatDate(p.payment_date)}
                        {p.month ? ` · ${p.month}` : ''}
                        {p.payment_mode ? ` · ${p.payment_mode}` : ''}
                      </Text>
                      {p.receipt_no ? (
                        <Text style={styles.paymentReceipt}>Receipt: {p.receipt_no}</Text>
                      ) : null}
                      {p.notes ? <Text style={styles.paymentNotes}>{p.notes}</Text> : null}
                    </View>
                  ))
                )}
              </>
            ) : !banner ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No fee data</Text>
                <Text style={styles.emptySub}>Select a linked child to view fees.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        <ParentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdfa' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 10, color: '#64748b', fontSize: 14 },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  heroCard: {
    backgroundColor: '#0f766e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#ccfbf1',
  },
  heroYear: {
    marginTop: 8,
    fontSize: 12,
    color: '#99f6e4',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#134e4a',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  feeLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  feeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#134e4a',
  },
  feeValueHighlight: {
    color: ACCENT,
  },
  feeValueDanger: {
    color: '#dc2626',
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#134e4a' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#64748b', lineHeight: 18 },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  paymentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: ACCENT,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  paymentMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
  },
  paymentReceipt: {
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  paymentNotes: {
    marginTop: 6,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});
