import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import {
  fetchFacultyHomework,
  deleteFacultyHomework,
  updateFacultyHomework,
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchAcademicYearsSchool,
  fetchSchoolSubjects,
} from '../../utils/schoolApi';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (typeof d?.message === 'string') return d.message;
  if (typeof d === 'object' && d !== null) return JSON.stringify(d);
  return err?.message || 'Could not load homework.';
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

export default function FacultyHomeworkMyTab({ active, reloadTick }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editBootLoading, setEditBootLoading] = useState(false);
  const [editLoadingSections, setEditLoadingSections] = useState(false);

  const [classes, setClasses] = useState([]);
  const [editSections, setEditSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [editYear, setEditYear] = useState(null);
  const [editClass, setEditClass] = useState(null);
  const [editSection, setEditSection] = useState(null);
  const [editSubject, setEditSubject] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const raw = await fetchFacultyHomework();
      setRows(Array.isArray(raw) ? raw : []);
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

  const loadEditBoot = useCallback(async () => {
    setEditBootLoading(true);
    setEditError('');
    try {
      const [years, cls, subs] = await Promise.all([
        fetchAcademicYearsSchool(),
        fetchSchoolClasses(),
        fetchSchoolSubjects({ assignedOnly: true }),
      ]);
      setAcademicYears(Array.isArray(years) ? years : []);
      setClasses(Array.isArray(cls) ? cls : []);
      setSubjects(Array.isArray(subs) ? subs : []);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
    setEditError('');
    setEditYear(null);
    setEditClass(null);
    setEditSection(null);
    setEditSubject(null);
    setEditTitle('');
    setEditDetails('');
    setEditSections([]);
  };

  const openEdit = async (row) => {
    setEditRow(row);
    setEditOpen(true);
    setEditError('');
    setEditTitle(row.title || '');
    setEditDetails(row.homework_details || '');
    setEditYear(row.academic_year_id ? String(row.academic_year_id) : null);
    setEditClass(row.class_id ? String(row.class_id) : null);
    setEditSubject(row.subject_id ? String(row.subject_id) : null);
    setEditSection(null);
    setEditSections([]);

    try {
      if (classes.length === 0 || academicYears.length === 0) {
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

  const saveEdit = async () => {
    if (!editRow?.id) return;
    if (!editYear || !editClass || !editSection || !editSubject) {
      Alert.alert('Missing fields', 'Select academic year, class, section, and subject.');
      return;
    }
    if (!editDetails.trim()) {
      Alert.alert('Homework', 'Enter homework details.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await updateFacultyHomework(editRow.id, {
        academic_year: editYear,
        class_id: editClass,
        section_id: editSection,
        subject: editSubject,
        homework_details: editDetails.trim(),
        title: editTitle.trim(),
      });
      setRows((prev) =>
        prev.map((r) => (String(r.id) === String(editRow.id) ? { ...r, ...updated } : r))
      );
      closeEdit();
      Alert.alert('Saved', 'Homework updated.');
    } catch (e) {
      const msg = formatApiError(e);
      setEditError(msg);
      Alert.alert('Could not save', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = (row) => {
    Alert.alert('Delete homework', 'Remove this homework entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(row.id);
          try {
            await deleteFacultyHomework(row.id);
            setRows((prev) => prev.filter((r) => r.id !== row.id));
          } catch (e) {
            Alert.alert('Error', formatApiError(e));
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

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
      (editSections || []).map((s) => ({
        label: s.section_name || 'Section',
        value: String(s.id),
      })),
    [editSections]
  );

  const subjectItems = useMemo(
    () =>
      (subjects || []).map((s) => ({
        label: s.subject_name || 'Subject',
        value: String(s.id),
      })),
    [subjects]
  );

  if (loading && rows.length === 0 && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.muted}>Loading your homework…</Text>
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
        <Text style={styles.hint}>Only homework you created for your school is listed here.</Text>
        {error ? <Text style={styles.banner}>{error}</Text> : null}

        {rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No homework yet</Text>
            <Text style={styles.emptySub}>Create homework from the other tab.</Text>
          </View>
        ) : (
          rows.map((row) => (
            <View key={String(row.id)} style={styles.card}>
              <Text style={styles.subject}>{row.subject_name || 'Subject'}</Text>
              {row.title ? <Text style={styles.title}>{row.title}</Text> : null}
              <Text style={styles.meta}>
                {row.class_name || '—'} · {row.section_name || '—'} · {row.academic_year_label || '—'}
              </Text>
              <Text style={styles.meta}>Added {formatWhen(row.created_at)}</Text>
              <Text style={styles.body}>{row.homework_details || '—'}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(row)}>
                  <Text style={styles.editBtnTxt}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.delBtn, deletingId === row.id && styles.delBtnOff]}
                  disabled={deletingId === row.id}
                  onPress={() => confirmDelete(row)}
                >
                  <Text style={styles.delBtnTxt}>{deletingId === row.id ? 'Deleting…' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={closeEdit}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit homework</Text>
            {editBootLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#4f46e5" />
                <Text style={styles.muted}>Loading form…</Text>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
                {editError ? <Text style={styles.banner}>{editError}</Text> : null}

                <Text style={styles.fieldLabel}>Academic year</Text>
                <Dropdown
                  style={styles.dropdown}
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
                  style={styles.dropdown}
                  placeholderStyle={styles.ddPh}
                  selectedTextStyle={styles.ddSel}
                  data={classItems}
                  labelField="label"
                  valueField="value"
                  placeholder="Select class"
                  value={editClass}
                  onChange={(item) => onEditClassChange(item?.value || null)}
                />

                <Text style={styles.fieldLabel}>Section</Text>
                <Dropdown
                  style={[styles.dropdown, (!editClass || editLoadingSections) && styles.ddDisabled]}
                  placeholderStyle={styles.ddPh}
                  selectedTextStyle={styles.ddSel}
                  data={sectionItems}
                  labelField="label"
                  valueField="value"
                  placeholder={editLoadingSections ? 'Loading sections…' : 'Select section'}
                  value={editSection}
                  disable={!editClass || editLoadingSections}
                  onChange={(item) => setEditSection(item?.value || null)}
                />

                <Text style={styles.fieldLabel}>Subject</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.ddPh}
                  selectedTextStyle={styles.ddSel}
                  data={subjectItems}
                  labelField="label"
                  valueField="value"
                  placeholder={subjectItems.length ? 'Select subject' : 'No subjects assigned'}
                  value={editSubject}
                  disable={subjectItems.length === 0}
                  onChange={(item) => setEditSubject(item?.value || null)}
                />

                <Text style={styles.fieldLabel}>Title (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Short title"
                  placeholderTextColor="#9ca3af"
                />

                <Text style={styles.fieldLabel}>Homework details</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  value={editDetails}
                  onChangeText={setEditDetails}
                  placeholder="Instructions for students…"
                  placeholderTextColor="#9ca3af"
                  textAlignVertical="top"
                />
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit} disabled={editSaving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={saveEdit}
                disabled={editSaving || editBootLoading}
              >
                {editSaving ? (
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
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  },
  subject: { fontSize: 17, fontWeight: '800', color: '#3730a3' },
  title: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 4 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  body: {
    marginTop: 10,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  editBtnTxt: { color: '#3730a3', fontWeight: '700', fontSize: 13 },
  delBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  delBtnOff: { opacity: 0.6 },
  delBtnTxt: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3730a3',
    marginBottom: 12,
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 420,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3730a3',
    marginTop: 10,
    marginBottom: 4,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  ddDisabled: { opacity: 0.55 },
  ddPh: { fontSize: 14, color: '#9ca3af' },
  ddSel: { fontSize: 14, color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelText: { fontWeight: '700', color: '#374151' },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveText: { fontWeight: '700', color: '#fff' },
});
