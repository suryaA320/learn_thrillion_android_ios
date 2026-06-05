import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import DatePickerField, { MonthPickerField } from '../../components/DatePickerField';
import {
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchAcademicYearsSchool,
  fetchFacultyActionPlans,
  updateFacultyActionPlan,
} from '../../utils/schoolApi';

const PAGE_SIZE = 10;

const STATUS_ITEMS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load action plans.';
}

function normalizePage(res) {
  if (Array.isArray(res)) {
    return { results: res, count: res.length };
  }
  const results = Array.isArray(res?.results) ? res.results : [];
  const count = Number(res?.count);
  return { results, count: Number.isFinite(count) ? count : results.length };
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

function statusLabel(s) {
  const x = String(s || '').toLowerCase();
  if (x === 'completed') return 'COMPLETED';
  if (x === 'active') return 'ACTIVE';
  if (x === 'cancelled') return 'CANCELLED';
  return 'DRAFT';
}

export default function FacultyPlanningViewTab({ active, reloadTick }) {
  const modalScrollRef = useRef(null);
  const [classes, setClasses] = useState([]);
  const [viewClass, setViewClass] = useState(null);
  const [viewSection, setViewSection] = useState(null);
  const [viewSections, setViewSections] = useState([]);
  const [loadingViewSections, setLoadingViewSections] = useState(false);

  const [viewFilter, setViewFilter] = useState('today');
  const [viewMonth, setViewMonth] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editBootLoading, setEditBootLoading] = useState(false);
  const [editLoadingSections, setEditLoadingSections] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [editSections, setEditSections] = useState([]);
  const [editYear, setEditYear] = useState(null);
  const [editClass, setEditClass] = useState(null);
  const [editSection, setEditSection] = useState(null);
  const [editActionPlan, setEditActionPlan] = useState('');
  const [editFromDate, setEditFromDate] = useState('');
  const [editStatus, setEditStatus] = useState('draft');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cls = await fetchSchoolClasses();
        if (!cancelled) setClasses(Array.isArray(cls) ? cls : []);
      } catch {
        if (!cancelled) setClasses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewClass) {
      setViewSections([]);
      setViewSection(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingViewSections(true);
      try {
        const data = await fetchSectionsByClass(viewClass);
        if (!cancelled) {
          setViewSections(Array.isArray(data) ? data : []);
          setViewSection(null);
        }
      } catch {
        if (!cancelled) setViewSections([]);
      } finally {
        if (!cancelled) setLoadingViewSections(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewClass]);

  const classItems = useMemo(
    () => [{ label: 'All classes', value: '' }, ...(classes || []).map((c) => ({ label: c.class_name || 'Class', value: String(c.id) }))],
    [classes]
  );

  const sectionItems = useMemo(
    () => [
      { label: loadingViewSections ? 'Loading…' : 'All sections', value: '' },
      ...(viewSections || []).map((s) => ({ label: s.section_name || 'Section', value: String(s.id) })),
    ],
    [viewSections, loadingViewSections]
  );

  const yearItems = useMemo(
    () =>
      (academicYears || []).map((y) => ({
        label: y.academic_year || 'Year',
        value: String(y.id),
      })),
    [academicYears]
  );

  const editClassItems = useMemo(
    () =>
      (classes || []).map((c) => ({
        label: c.class_name || 'Class',
        value: String(c.id),
      })),
    [classes]
  );

  const editSectionItems = useMemo(
    () =>
      (editSections || []).map((s) => ({
        label: s.section_name || 'Section',
        value: String(s.id),
      })),
    [editSections]
  );

  const load = useCallback(async () => {
    setError('');
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
      };
      if (viewFilter !== 'all') params.filter = viewFilter;
      const m = viewMonth.trim();
      if (m && /^\d{4}-\d{2}$/.test(m)) params.month = m;
      if (viewClass) params.class_id = viewClass;
      if (viewSection) params.section_id = viewSection;

      const raw = await fetchFacultyActionPlans(params);
      const { results, count } = normalizePage(raw);
      setRows(results);
      setTotal(count);
    } catch (e) {
      setError(formatApiError(e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, viewFilter, viewMonth, viewClass, viewSection]);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    load();
  }, [active, reloadTick, load]);

  const loadEditBoot = useCallback(async () => {
    setEditBootLoading(true);
    setEditError('');
    try {
      const years = await fetchAcademicYearsSchool();
      setAcademicYears(Array.isArray(years) ? years : []);
    } catch (e) {
      setEditError(formatApiError(e));
      throw e;
    } finally {
      setEditBootLoading(false);
    }
  }, []);

  const loadEditSections = useCallback(async (classId, sectionIdToSelect = null) => {
    if (!classId) {
      setEditSections([]);
      setEditSection(null);
      return;
    }
    setEditLoadingSections(true);
    try {
      const data = await fetchSectionsByClass(classId);
      const list = Array.isArray(data) ? data : [];
      setEditSections(list);
      if (sectionIdToSelect) {
        setEditSection(String(sectionIdToSelect));
      } else {
        setEditSection(null);
      }
    } catch {
      setEditSections([]);
      setEditSection(null);
    } finally {
      setEditLoadingSections(false);
    }
  }, []);

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
    setEditError('');
    setEditYear(null);
    setEditClass(null);
    setEditSection(null);
    setEditSections([]);
    setEditActionPlan('');
    setEditFromDate('');
    setEditStatus('draft');
  };

  const openEdit = async (row) => {
    if (!row?.can_edit) {
      Alert.alert('Edit', 'You can only edit action plans you created.');
      return;
    }
    setEditRow(row);
    setEditOpen(true);
    setEditError('');
    setEditYear(row.academic_year_id ? String(row.academic_year_id) : null);
    setEditClass(row.class_id ? String(row.class_id) : null);
    setEditSection(row.section_id ? String(row.section_id) : null);
    setEditActionPlan(row.action_plan || '');
    setEditFromDate(row.from_date || '');
    setEditStatus(String(row.status || 'draft').toLowerCase());

    try {
      if (academicYears.length === 0) {
        await loadEditBoot();
      }
      if (row.class_id) {
        await loadEditSections(String(row.class_id), row.section_id);
      }
    } catch {
      /* editError set in loadEditBoot */
    }
  };

  const onEditClassChange = async (classId) => {
    setEditClass(classId || null);
    setEditSection(null);
    await loadEditSections(classId);
  };

  const scrollPlanIntoView = () => {
    setTimeout(() => {
      modalScrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 280 : 120);
  };

  const saveEdit = async () => {
    if (!editRow?.id) return;
    if (!editYear || !editClass || !editSection) {
      Alert.alert('Missing fields', 'Select academic year, class, and section.');
      return;
    }
    if (!editActionPlan.trim()) {
      Alert.alert('Action plan', 'Enter your action plan text.');
      return;
    }
    if (!editFromDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(editFromDate.trim())) {
      Alert.alert('Date', 'Choose a valid plan date.');
      return;
    }
    Keyboard.dismiss();
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await updateFacultyActionPlan(editRow.id, {
        academic_year: editYear,
        class_id: editClass,
        section_id: editSection,
        action_plan: editActionPlan.trim(),
        from_date: editFromDate.trim(),
        to_date: editRow.to_date || editFromDate.trim(),
        status: editStatus,
      });
      setRows((prev) =>
        prev.map((row) => (String(row.id) === String(editRow.id) ? { ...row, ...updated } : row))
      );
      closeEdit();
      Alert.alert('Saved', 'Action plan updated.');
    } catch (e) {
      const msg = formatApiError(e);
      setEditError(msg);
      Alert.alert('Could not save', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const setFilterAndReset = (f) => {
    setViewFilter(f);
    setViewMonth('');
    setPage(1);
  };

  const markCompleted = async (p) => {
    if (!p?.id || String(p.status || '').toLowerCase() === 'completed' || !p.can_edit) return;
    setCompletingId(p.id);
    try {
      const updated = await updateFacultyActionPlan(p.id, {
        academic_year: p.academic_year_id,
        class_id: p.class_id,
        section_id: p.section_id,
        action_plan: p.action_plan,
        from_date: p.from_date,
        to_date: p.to_date ?? p.from_date,
        status: 'completed',
      });
      setRows((prev) =>
        prev.map((row) =>
          row.id === p.id
            ? {
                ...row,
                status: updated?.status || 'completed',
                updated_date: updated?.updated_date || row.updated_date,
                to_date: updated?.to_date ?? row.to_date,
              }
            : row
        )
      );
    } catch (err) {
      const d = err?.response?.data;
      const msg = typeof d?.detail === 'string' ? d.detail : 'Could not update status.';
      Alert.alert('Update failed', msg);
    } finally {
      setCompletingId('');
    }
  };

  const canNext = page * PAGE_SIZE < total;

  if (loading && rows.length === 0 && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.muted}>Loading action plans…</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        <Text style={styles.hint}>Filter and paginate your action plans like the web View Action Plans tab.</Text>

        {error ? <Text style={styles.banner}>{error}</Text> : null}

        <View style={styles.filterRow}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'all', label: 'All' },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, viewFilter === key && styles.filterChipOn]}
              onPress={() => setFilterAndReset(key)}
            >
              <Text style={[styles.filterChipTxt, viewFilter === key && styles.filterChipTxtOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.lbl}>Class</Text>
        <Dropdown
          style={styles.dd}
          placeholderStyle={styles.ddPh}
          selectedTextStyle={styles.ddSel}
          data={classItems}
          labelField="label"
          valueField="value"
          placeholder="All classes"
          value={viewClass ?? ''}
          onChange={(item) => {
            setViewClass(item?.value || null);
            setPage(1);
          }}
        />

        <Text style={styles.lbl}>Section</Text>
        <Dropdown
          style={[styles.dd, !viewClass && styles.ddDisabled]}
          placeholderStyle={styles.ddPh}
          selectedTextStyle={styles.ddSel}
          data={sectionItems}
          labelField="label"
          valueField="value"
          placeholder={!viewClass ? 'Choose a class first' : loadingViewSections ? 'Loading…' : 'All sections'}
          value={viewSection ?? ''}
          disable={!viewClass || loadingViewSections}
          onChange={(item) => {
            setViewSection(item?.value || null);
            setPage(1);
          }}
        />

        <MonthPickerField
          label="Month (optional)"
          value={viewMonth}
          onChangeValue={(v) => {
            setViewMonth(v);
            setPage(1);
          }}
          allowClear
        />

        {rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No action plans</Text>
            <Text style={styles.emptySub}>Nothing matches these filters yet.</Text>
          </View>
        ) : (
          rows.map((row) => {
            const done = String(row.status || '').toLowerCase() === 'completed';
            const busy = completingId === row.id;
            return (
              <View key={String(row.id)} style={styles.card}>
                <View style={[styles.strip, done ? styles.stripDone : styles.stripOpen]} />
                <View style={styles.cardHeader}>
                  <Text style={styles.planPreview} numberOfLines={6}>
                    {row.action_plan || '—'}
                  </Text>
                  {row.can_edit ? (
                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={() => openEdit(row)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit action plan"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="pencil" size={22} color="#4f46e5" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.line}>
                  <Text style={styles.k}>Class: </Text>
                  {row.class_name || '—'}
                </Text>
                <Text style={styles.line}>
                  <Text style={styles.k}>Section: </Text>
                  {row.section_name || '—'}
                </Text>
                <Text style={styles.line}>
                  <Text style={styles.k}>Status: </Text>
                  {statusLabel(row.status)}
                </Text>
                <Text style={styles.line}>
                  <Text style={styles.k}>Plan date: </Text>
                  {row.from_date || '—'}
                </Text>
                <Text style={styles.line}>
                  <Text style={styles.k}>Added: </Text>
                  {formatWhen(row.added_date)}
                </Text>
                <Text style={styles.line}>
                  <Text style={styles.k}>Updated: </Text>
                  {formatWhen(row.updated_date)}
                </Text>
                <View style={styles.switchRow}>
                  <Text style={styles.k}>Mark completed</Text>
                  <Switch
                    value={done}
                    disabled={done || !row.can_edit || busy}
                    onValueChange={(v) => {
                      if (v) markCompleted(row);
                    }}
                    trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
                    thumbColor={done ? '#4f46e5' : '#f4f4f5'}
                  />
                </View>
              </View>
            );
          })
        )}

        {total > 0 ? (
          <View style={styles.pager}>
            <Text style={styles.pagerInfo}>
              Page {page} · {total} total
            </Text>
            <View style={styles.pagerBtns}>
              <TouchableOpacity
                style={[styles.pgBtn, page <= 1 && styles.pgBtnOff]}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Text style={styles.pgBtnTxt}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pgBtn, !canNext && styles.pgBtnOff]}
                disabled={!canNext}
                onPress={() => setPage((p) => p + 1)}
              >
                <Text style={styles.pgBtnTxt}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={closeEdit}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Edit action plan</Text>
              <TouchableOpacity onPress={closeEdit} disabled={editSaving} accessibilityLabel="Close">
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {editBootLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#4f46e5" />
                <Text style={styles.muted}>Loading form…</Text>
              </View>
            ) : (
              <ScrollView
                ref={modalScrollRef}
                keyboardShouldPersistTaps="handled"
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                {editError ? <Text style={styles.editBanner}>{editError}</Text> : null}

                <Text style={styles.fieldLabel}>Academic year</Text>
                <Dropdown
                  style={styles.modalDd}
                  placeholderStyle={styles.ddPh}
                  selectedTextStyle={styles.ddSel}
                  data={yearItems}
                  labelField="label"
                  valueField="value"
                  placeholder="Select academic year"
                  value={editYear}
                  onChange={(item) => setEditYear(item?.value || null)}
                />

                <Text style={styles.fieldLabel}>Class</Text>
                <Dropdown
                  style={styles.modalDd}
                  placeholderStyle={styles.ddPh}
                  selectedTextStyle={styles.ddSel}
                  data={editClassItems}
                  labelField="label"
                  valueField="value"
                  placeholder="Select class"
                  value={editClass}
                  onChange={(item) => onEditClassChange(item?.value || null)}
                />

                <Text style={styles.fieldLabel}>Section</Text>
                <Dropdown
                  style={[styles.modalDd, (!editClass || editLoadingSections) && styles.ddDisabled]}
                  placeholderStyle={styles.ddPh}
                  selectedTextStyle={styles.ddSel}
                  data={editSectionItems}
                  labelField="label"
                  valueField="value"
                  placeholder={editLoadingSections ? 'Loading sections…' : 'Select section'}
                  value={editSection}
                  disable={!editClass || editLoadingSections}
                  onChange={(item) => setEditSection(item?.value || null)}
                />

                <Text style={styles.fieldLabel}>Status</Text>
                <Dropdown
                  style={styles.modalDd}
                  placeholderStyle={styles.ddPh}
                  selectedTextStyle={styles.ddSel}
                  data={STATUS_ITEMS}
                  labelField="label"
                  valueField="value"
                  value={editStatus}
                  onChange={(item) => setEditStatus(item?.value || 'draft')}
                />

                <Text style={styles.fieldLabel}>Action plan</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  value={editActionPlan}
                  onChangeText={setEditActionPlan}
                  onFocus={scrollPlanIntoView}
                  placeholder="Describe the action plan…"
                  placeholderTextColor="#94a3b8"
                  textAlignVertical="top"
                />

                <DatePickerField
                  label="Plan date"
                  value={editFromDate}
                  onChangeValue={setEditFromDate}
                  placeholder="Select date"
                />
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit} disabled={editSaving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, editSaving && styles.saveBtnOff]}
                onPress={saveEdit}
                disabled={editSaving || editBootLoading}
              >
                {editSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 10, color: '#6b7280', fontSize: 14 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 18 },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  filterChipOn: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  filterChipTxt: { fontSize: 13, color: '#4338ca', fontWeight: '600' },
  filterChipTxtOn: { color: '#fff' },
  lbl: { fontSize: 13, fontWeight: '600', color: '#3730a3', marginTop: 8, marginBottom: 4 },
  dd: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  ddDisabled: { opacity: 0.55 },
  ddPh: { fontSize: 14, color: '#9ca3af' },
  ddSel: { fontSize: 14, color: '#111827' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  strip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  stripDone: { backgroundColor: '#4f46e5' },
  stripOpen: { backgroundColor: '#eab308' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginLeft: 6,
    gap: 8,
  },
  planPreview: { flex: 1, fontSize: 14, color: '#111827', lineHeight: 20 },
  editIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  line: { fontSize: 13, color: '#374151', marginBottom: 4, marginLeft: 6 },
  k: { fontWeight: '600', color: '#3730a3' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginLeft: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  pager: { marginTop: 16, marginBottom: 8 },
  pagerInfo: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  pagerBtns: { flexDirection: 'row', gap: 10 },
  pgBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  pgBtnOff: { backgroundColor: '#d1d5db' },
  pgBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#312e81' },
  modalLoading: { paddingVertical: 40, alignItems: 'center' },
  modalScroll: { maxHeight: 440 },
  modalScrollContent: { paddingBottom: 16 },
  editBanner: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#3730a3', marginTop: 10, marginBottom: 4 },
  modalDd: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minHeight: 140,
    fontSize: 15,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
  saveBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    minWidth: 88,
    alignItems: 'center',
  },
  saveBtnOff: { opacity: 0.7 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
