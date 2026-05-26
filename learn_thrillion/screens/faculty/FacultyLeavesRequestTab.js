import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import DatePickerField from '../../components/DatePickerField';
import {
  createFacultyLeaveRequest,
  fetchFacultyLeaveSummary,
} from '../../utils/schoolApi';

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'emergency', label: 'Emergency leave' },
  { value: 'vacation', label: 'Vacation leave' },
];

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (typeof d === 'object' && d !== null) {
    const first = Object.values(d).find((v) => Array.isArray(v) && v[0]);
    if (first?.[0]) return String(first[0]);
  }
  return err?.message || 'Request failed';
}

function labelForLeaveType(v) {
  return LEAVE_TYPES.find((t) => t.value === v)?.label || v || '—';
}

export default function FacultyLeavesRequestTab({ onSuccess }) {
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [leaveType, setLeaveType] = useState('casual');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await fetchFacultyLeaveSummary();
      setSummary(data);
    } catch (e) {
      setSummary(null);
      Alert.alert('Could not load leave balance', formatApiError(e));
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleSubmit = async () => {
    if (!dateFrom || !dateTo) {
      Alert.alert('Dates required', 'Please select from and to dates.');
      return;
    }
    if (dateFrom > dateTo) {
      Alert.alert('Invalid range', 'From date cannot be after to date.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please describe the reason for your leave.');
      return;
    }

    setSubmitting(true);
    try {
      await createFacultyLeaveRequest({
        date_from: dateFrom,
        date_to: dateTo,
        leave_type: leaveType,
        reason: reason.trim(),
      });
      Alert.alert('Submitted', 'Your leave request was sent for approval.');
      setDateFrom('');
      setDateTo('');
      setReason('');
      setLeaveType('casual');
      await loadSummary();
      if (onSuccess) onSuccess();
    } catch (e) {
      Alert.alert('Submit failed', formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount =
    summary?.pending_request_count ?? summary?.pending_count ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Leave balance</Text>
          {summaryLoading ? (
            <ActivityIndicator color="#15803d" style={{ marginVertical: 16 }} />
          ) : (
            <>
              {summary?.detail ? (
                <Text style={styles.warn}>{summary.detail}</Text>
              ) : null}
              {summary?.academic_year_label ? (
                <Text style={styles.ayLabel}>Academic year: {summary.academic_year_label}</Text>
              ) : null}
              <View style={styles.statGrid}>
                <View style={[styles.statPill, styles.statTotal]}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>{summary?.total_leaves ?? 0}</Text>
                </View>
                <View style={[styles.statPill, styles.statAvailed]}>
                  <Text style={styles.statLabel}>Availed</Text>
                  <Text style={styles.statValue}>{summary?.leaves_availed ?? 0}</Text>
                </View>
                <View style={[styles.statPill, styles.statBalance]}>
                  <Text style={styles.statLabel}>Available</Text>
                  <Text style={styles.statValue}>{summary?.leave_balance ?? 0}</Text>
                </View>
                <View style={[styles.statPill, styles.statPending]}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={styles.statValue}>{pendingCount}</Text>
                </View>
              </View>
              {Array.isArray(summary?.by_type) && summary.by_type.length > 0 ? (
                <View style={styles.byTypeWrap}>
                  <Text style={styles.byTypeTitle}>By type</Text>
                  {summary.by_type.map((b) => (
                    <Text key={b.leave_type} style={styles.byTypeRow}>
                      {labelForLeaveType(b.leave_type)}: {b.leave_balance ?? 0} left of{' '}
                      {b.maximum_leaves ?? 0}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Apply for leave</Text>
          <Text style={styles.fieldLabel}>Leave type</Text>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholder}
            selectedTextStyle={styles.selected}
            data={LEAVE_TYPES}
            labelField="label"
            valueField="value"
            value={leaveType}
            onChange={(item) => setLeaveType(item.value)}
          />

          <DatePickerField
            label="From date"
            value={dateFrom}
            onChangeValue={setDateFrom}
            placeholder="Select start date"
          />
          <DatePickerField
            label="To date"
            value={dateTo}
            onChangeValue={setDateTo}
            placeholder="Select end date"
            minimumDate={dateFrom ? new Date(dateFrom) : undefined}
          />

          <Text style={styles.fieldLabel}>Reason</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
            placeholder="Describe the reason for your leave"
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting || summaryLoading}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit request</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#14532d', marginBottom: 12 },
  warn: { fontSize: 13, color: '#b45309', marginBottom: 8 },
  ayLabel: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statPill: {
    width: '47%',
    borderRadius: 12,
    padding: 12,
    minWidth: 140,
  },
  statTotal: { backgroundColor: '#dbeafe' },
  statAvailed: { backgroundColor: '#ffedd5' },
  statBalance: { backgroundColor: '#dcfce7' },
  statPending: { backgroundColor: '#f3e8ff' },
  statLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  byTypeWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  byTypeTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  byTypeRow: { fontSize: 13, color: '#475569', marginBottom: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  placeholder: { fontSize: 14, color: '#94a3b8' },
  selected: { fontSize: 14, color: '#0f172a' },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  submitBtn: {
    marginTop: 16,
    backgroundColor: '#15803d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
