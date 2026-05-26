import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import DatePickerField from '../../components/DatePickerField';
import {
  fetchFacultyLeaveRequests,
  updateFacultyLeaveRequest,
} from '../../utils/schoolApi';

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'emergency', label: 'Emergency leave' },
  { value: 'vacation', label: 'Vacation leave' },
];

const STATUS_STYLES = {
  pending: { bg: '#fff3e0', border: '#ed6c02', text: '#e65100' },
  accepted: { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20' },
  rejected: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c' },
};

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Request failed';
}

function labelForLeaveType(v) {
  return LEAVE_TYPES.find((t) => t.value === v)?.label || v || '—';
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString();
  } catch {
    return String(iso);
  }
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function FacultyLeavesListTab({ active, reloadTick }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editLeaveType, setEditLeaveType] = useState('casual');
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await fetchFacultyLeaveRequests();
      setRows(list);
    } catch (e) {
      setError(formatApiError(e));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    load();
  }, [active, reloadTick, load]);

  const filtered = rows.filter((r) => {
    if (statusFilter === 'all') return true;
    return String(r.status || '').toLowerCase() === statusFilter;
  });

  const openEdit = (row) => {
    if (String(row.status || '').toLowerCase() !== 'pending') {
      Alert.alert('Not editable', 'Only pending requests can be updated.');
      return;
    }
    setEditRow(row);
    setEditLeaveType(row.leave_type || 'casual');
    setEditFrom(row.date_from || '');
    setEditTo(row.date_to || '');
    setEditReason(row.reason || '');
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
  };

  const saveEdit = async () => {
    if (!editRow?.id) return;
    if (!editFrom || !editTo) {
      Alert.alert('Dates required', 'Please select from and to dates.');
      return;
    }
    if (editFrom > editTo) {
      Alert.alert('Invalid range', 'From date cannot be after to date.');
      return;
    }
    if (!editReason.trim()) {
      Alert.alert('Reason required', 'Please enter a reason.');
      return;
    }
    setSaving(true);
    try {
      await updateFacultyLeaveRequest(editRow.id, {
        date_from: editFrom,
        date_to: editTo,
        leave_type: editLeaveType,
        reason: editReason.trim(),
      });
      Alert.alert('Updated', 'Leave request updated.');
      closeEdit();
      load();
    } catch (e) {
      Alert.alert('Update failed', formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading && rows.length === 0 && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.muted}>Loading requests…</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.filterRow}>
        {['all', 'pending', 'accepted', 'rejected'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {filtered.length === 0 ? (
          <Text style={styles.muted}>No leave requests yet.</Text>
        ) : (
          filtered.map((r) => {
            const st = String(r.status || 'pending').toLowerCase();
            const palette = STATUS_STYLES[st] || STATUS_STYLES.pending;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.rowCard, { borderLeftColor: palette.border }]}
                onPress={() => openEdit(r)}
                activeOpacity={0.85}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.rowDates}>
                    {formatDate(r.date_from)} → {formatDate(r.date_to)}
                  </Text>
                  <View style={[styles.statusChip, { backgroundColor: palette.bg }]}>
                    <Text style={[styles.statusText, { color: palette.text }]}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowType}>{labelForLeaveType(r.leave_type)}</Text>
                {r.academic_year ? (
                  <Text style={styles.rowMeta}>Year: {r.academic_year}</Text>
                ) : null}
                <Text style={styles.rowReason} numberOfLines={3}>
                  {r.reason || '—'}
                </Text>
                <Text style={styles.rowMeta}>Submitted {formatWhen(r.created_at)}</Text>
                {st === 'pending' ? (
                  <Text style={styles.tapHint}>Tap to edit</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={closeEdit}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit pending request</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Leave type</Text>
              <Dropdown
                style={styles.dropdown}
                data={LEAVE_TYPES}
                labelField="label"
                valueField="value"
                value={editLeaveType}
                onChange={(item) => setEditLeaveType(item.value)}
              />
              <DatePickerField label="From" value={editFrom} onChangeValue={setEditFrom} />
              <DatePickerField
                label="To"
                value={editTo}
                onChangeValue={setEditTo}
                minimumDate={editFrom ? new Date(editFrom) : undefined}
              />
              <Text style={styles.fieldLabel}>Reason</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={editReason}
                onChangeText={setEditReason}
                textAlignVertical="top"
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 8, color: '#64748b', fontSize: 14, textAlign: 'center' },
  error: { color: '#b91c1c', marginBottom: 12, fontSize: 14 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  filterChipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  filterText: { fontSize: 13, color: '#14532d', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  scroll: { padding: 12, paddingBottom: 24 },
  rowCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowDates: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  rowType: { fontSize: 13, color: '#15803d', fontWeight: '600', marginTop: 6 },
  rowMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  rowReason: { fontSize: 14, color: '#334155', marginTop: 8 },
  tapHint: { fontSize: 12, color: '#15803d', marginTop: 8, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#14532d', marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    minHeight: 90,
    fontSize: 15,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  cancelText: { color: '#475569', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#15803d',
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
