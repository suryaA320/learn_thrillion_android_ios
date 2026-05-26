import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import {
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchAcademicYearsSchool,
  fetchFacultyActionPlans,
  createFacultyActionPlan,
} from '../../utils/schoolApi';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CURRENT_YEAR = new Date().getFullYear();
const STATUS_ITEMS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatDateKey(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parsePlansResponse(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

function planAppliesOnDate(plan, date) {
  const key = formatDateKey(date);
  if (!key || !plan?.from_date) return false;
  const from = plan.from_date;
  const to = plan.to_date || plan.from_date;
  return key >= from && key <= to;
}

function planStatusColor(status) {
  const x = (status || '').toLowerCase();
  if (x === 'completed') return '#16a34a';
  if (x === 'active') return '#2563eb';
  if (x === 'cancelled') return '#9ca3af';
  return '#7c3aed';
}

function formatApiError(err, fallback = 'Request failed') {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (typeof d?.message === 'string') return d.message;
  return err?.message || fallback;
}

/**
 * Mobile port of web `ActionPlanCalendar.js` (Add Plan → Add action plan tab).
 */
export default function FacultyActionPlanCalendar({ onPlanSaved }) {
  const { width } = useWindowDimensions();
  const cellWidth = Math.floor((width - 32) / 7);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarPlans, setCalendarPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [modalSections, setModalSections] = useState([]);
  const [loadingModalSections, setLoadingModalSections] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalYear, setModalYear] = useState(null);
  const [modalClass, setModalClass] = useState(null);
  const [modalSection, setModalSection] = useState(null);
  const [actionPlan, setActionPlan] = useState('');
  const [planStatus, setPlanStatus] = useState('draft');
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [year, month]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [years, cls] = await Promise.all([
          fetchAcademicYearsSchool(),
          fetchSchoolClasses(),
        ]);
        if (cancelled) return;
        setAcademicYears(Array.isArray(years) ? years : []);
        setClasses(Array.isArray(cls) ? cls : []);
      } catch {
        if (!cancelled) {
          setAcademicYears([]);
          setClasses([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalClass) {
      setModalSections([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingModalSections(true);
      try {
        const data = await fetchSectionsByClass(modalClass);
        if (!cancelled) setModalSections(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setModalSections([]);
      } finally {
        if (!cancelled) setLoadingModalSections(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalClass]);

  const fetchCalendarPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const raw = await fetchFacultyActionPlans({
        month: monthKey,
        page: 1,
        page_size: 200,
      });
      setCalendarPlans(parsePlansResponse(raw));
    } catch (e) {
      setCalendarPlans([]);
      Alert.alert('Could not load plans', formatApiError(e, 'Could not load action plans for this month.'));
    } finally {
      setLoadingPlans(false);
    }
  }, [monthKey]);

  useEffect(() => {
    fetchCalendarPlans();
  }, [fetchCalendarPlans]);

  const plansForDate = (date) => calendarPlans.filter((p) => planAppliesOnDate(p, date));

  const resetModalForm = () => {
    setModalYear(null);
    setModalClass(null);
    setModalSection(null);
    setActionPlan('');
    setPlanStatus('draft');
    setModalSections([]);
  };

  const openDate = (date) => {
    setSelectedDate(date);
    resetModalForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setSelectedDate(null);
    resetModalForm();
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      Alert.alert('Date', 'Please select a date on the calendar.');
      return;
    }
    if (!modalYear || !modalClass || !modalSection) {
      Alert.alert('Missing fields', 'Please select academic year, class, and section.');
      return;
    }
    if (!actionPlan.trim()) {
      Alert.alert('Description', 'Please enter an action plan description.');
      return;
    }

    setSubmitting(true);
    const fromDate = formatDateKey(selectedDate);
    try {
      await createFacultyActionPlan({
        academic_year: modalYear,
        class_id: modalClass,
        section_id: modalSection,
        action_plan: actionPlan.trim(),
        from_date: fromDate,
        to_date: fromDate,
        status: planStatus,
      });
      Alert.alert('Saved', 'Action plan submitted successfully.');
      setModalOpen(false);
      setSelectedDate(null);
      resetModalForm();
      await fetchCalendarPlans();
      onPlanSaved?.();
    } catch (e) {
      Alert.alert('Could not save', formatApiError(e, 'Could not submit action plan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = selectedDate
    ? `Add action plan — ${selectedDate.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}`
    : 'Add action plan';

  const yearItems = useMemo(
    () =>
      (academicYears || []).map((y) => ({
        label: y.academic_year || 'Year',
        value: String(y.id),
      })),
    [academicYears]
  );

  const classItems = useMemo(
    () =>
      (classes || []).map((c) => ({
        label: c.class_name || 'Class',
        value: String(c.id),
      })),
    [classes]
  );

  const sectionItems = useMemo(
    () =>
      (modalSections || []).map((s) => ({
        label: s.section_name || 'Section',
        value: String(s.id),
      })),
    [modalSections]
  );

  const monthTitle = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.toolbar}>
            <View style={styles.toolbarGroup}>
              <TouchableOpacity
                style={styles.navBtnSecondary}
                onPress={() => setCurrentDate(new Date(year - 1, month, 1))}
              >
                <Text style={styles.navBtnSecondaryText}>⏪ Prev Year</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => setCurrentDate(new Date(year, month - 1, 1))}
              >
                <Text style={styles.navBtnText}>◀ Prev Month</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.titleWrap}>
              <Text style={styles.monthTitle}>{monthTitle}</Text>
              {loadingPlans ? <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 6 }} /> : null}
            </View>

            <View style={styles.toolbarGroup}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => setCurrentDate(new Date(year, month + 1, 1))}
              >
                <Text style={styles.navBtnText}>Next Month ▶</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtnSecondary, year >= CURRENT_YEAR + 1 && styles.navDisabled]}
                onPress={() => {
                  if (year < CURRENT_YEAR + 1) {
                    setCurrentDate(new Date(year + 1, month, 1));
                  }
                }}
                disabled={year >= CURRENT_YEAR + 1}
              >
                <Text style={styles.navBtnSecondaryText}>Next Year ⏩</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => (
              <View key={day} style={[styles.weekdayCell, { width: cellWidth }]}>
                <Text style={styles.weekdayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <View key={`e-${idx}`} style={[styles.cell, styles.cellEmpty, { width: cellWidth }]} />;
              }
              const dayPlans = plansForDate(date);
              return (
                <TouchableOpacity
                  key={formatDateKey(date)}
                  style={[styles.cell, { width: cellWidth }]}
                  activeOpacity={0.85}
                  onPress={() => openDate(date)}
                >
                  <Text style={styles.dayNum}>{date.getDate()}</Text>
                  <View style={styles.planList}>
                    {dayPlans.map((p) => (
                      <View
                        key={p.id}
                        style={[styles.planPill, { backgroundColor: planStatusColor(p.status) }]}
                      >
                        <Text style={styles.planPillText} numberOfLines={1}>
                          {(p.action_plan || '').slice(0, 40)}
                          {(p.action_plan || '').length > 40 ? '…' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.hint}>
            Click a date to add an action plan. Your plans for this month appear on the calendar.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={modalOpen} animationType="fade" transparent onRequestClose={closeModal}>
        <Pressable style={styles.overlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCenter}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <Text style={styles.modalHint}>
                  Select academic year, class, and section for your school. Lists are loaded from your
                  assigned school only.
                </Text>

                <Text style={styles.lbl}>Academic year</Text>
                <Dropdown
                  style={styles.dd}
                  data={yearItems}
                  labelField="label"
                  valueField="value"
                  placeholder="Select academic year"
                  value={modalYear}
                  disable={submitting}
                  onChange={(item) => setModalYear(item?.value || null)}
                />

                <Text style={styles.lbl}>Class</Text>
                <Dropdown
                  style={styles.dd}
                  data={classItems}
                  labelField="label"
                  valueField="value"
                  placeholder="Select class"
                  value={modalClass}
                  disable={submitting}
                  onChange={(item) => {
                    setModalClass(item?.value || null);
                    setModalSection(null);
                  }}
                />

                <Text style={styles.lbl}>Section</Text>
                <Dropdown
                  style={[styles.dd, (!modalClass || loadingModalSections) && styles.ddDisabled]}
                  data={sectionItems}
                  labelField="label"
                  valueField="value"
                  placeholder={loadingModalSections ? 'Loading…' : 'Select section'}
                  value={modalSection}
                  disable={!modalClass || loadingModalSections || submitting}
                  onChange={(item) => setModalSection(item?.value || null)}
                />

                <Text style={styles.lbl}>Status</Text>
                <Dropdown
                  style={styles.dd}
                  data={STATUS_ITEMS}
                  labelField="label"
                  valueField="value"
                  value={planStatus}
                  disable={submitting}
                  onChange={(item) => setPlanStatus(item?.value || 'draft')}
                />

                <Text style={styles.lbl}>Description</Text>
                <TextInput
                  style={styles.textarea}
                  multiline
                  value={actionPlan}
                  onChangeText={setActionPlan}
                  placeholder="Describe the action plan for this date..."
                  placeholderTextColor="#94a3b8"
                  textAlignVertical="top"
                  editable={!submitting}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnCancel} onPress={closeModal} disabled={submitting}>
                    <Text style={styles.btnCancelText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnPrimary, submitting && styles.btnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  toolbar: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  toolbarGroup: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  titleWrap: { alignItems: 'center', paddingVertical: 4 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#f8fbff',
  },
  navBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  navBtnSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  navBtnSecondaryText: { fontSize: 12, fontWeight: '600', color: '#4f46e5' },
  navDisabled: { opacity: 0.45 },
  weekdayRow: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  weekdayCell: { paddingVertical: 8, alignItems: 'center' },
  weekdayText: { fontSize: 11, fontWeight: '700', color: '#3730a3' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    minHeight: 96,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 4,
  },
  cellEmpty: { backgroundColor: '#f9fafb' },
  dayNum: { fontWeight: '700', fontSize: 16, color: '#111827', marginBottom: 4 },
  planList: { flex: 1, gap: 4 },
  planPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  planPillText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCenter: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  modalSheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e1b4b', marginBottom: 8 },
  modalHint: { fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 18 },
  lbl: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 8, marginBottom: 4, textTransform: 'uppercase' },
  dd: {
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fbff',
  },
  ddDisabled: { opacity: 0.55 },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fbff',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4f0',
    backgroundColor: '#f8fafc',
  },
  btnCancelText: { color: '#1e1b4b', fontWeight: '600' },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
});
