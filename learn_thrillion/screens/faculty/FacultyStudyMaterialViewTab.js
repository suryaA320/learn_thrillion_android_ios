import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from 'react-native-paper';
import {
  fetchStudyMaterial,
  deleteStudyMaterial,
  updateStudyMaterialWritten,
  fetchSchoolClasses,
  fetchSchoolSubjects,
} from '../../utils/schoolApi';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load study material.';
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function FacultyStudyMaterialViewTab({ active, reloadTick }) {
  const modalScrollRef = useRef(null);
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
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [editClass, setEditClass] = useState(null);
  const [editSubject, setEditSubject] = useState(null);
  const [editChapter, setEditChapter] = useState('');
  const [editLesson, setEditLesson] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const raw = await fetchStudyMaterial({ mine: 'true' });
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
    try {
      const [cls, subs] = await Promise.all([
        fetchSchoolClasses(),
        fetchSchoolSubjects({ assignedOnly: true }),
      ]);
      setClasses(Array.isArray(cls) ? cls : []);
      setSubjects(Array.isArray(subs) ? subs : []);
    } catch (e) {
      setEditError(formatApiError(e));
      throw e;
    } finally {
      setEditBootLoading(false);
    }
  }, []);

  const classItems = useMemo(
    () =>
      (classes || []).map((c) => ({
        label: c.class_name || 'Class',
        value: String(c.id),
      })),
    [classes]
  );

  const subjectItems = useMemo(
    () =>
      (subjects || []).map((s) => ({
        label: s.subject_name || 'Subject',
        value: String(s.id),
      })),
    [subjects]
  );

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
    setEditError('');
    setEditClass(null);
    setEditSubject(null);
    setEditChapter('');
    setEditLesson('');
    setEditTitle('');
    setEditNotes('');
  };

  const openEdit = async (row) => {
    if (row.content_type !== 'written') {
      Alert.alert('Edit', 'Only written notes can be edited here. Re-upload files from the Upload tab.');
      return;
    }
    setEditRow(row);
    setEditOpen(true);
    setEditError('');
    setEditClass(row.class_id ? String(row.class_id) : null);
    setEditSubject(row.subject_id ? String(row.subject_id) : null);
    setEditChapter(row.chapter_number || '');
    setEditLesson(row.lesson_number || '');
    setEditTitle(row.title || '');
    setEditNotes(row.notes || '');
    try {
      if (classes.length === 0 || subjects.length === 0) {
        await loadEditBoot();
      }
    } catch {
      /* editError set in loadEditBoot */
    }
  };

  const scrollNotesIntoView = () => {
    setTimeout(() => {
      modalScrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 280 : 120);
  };

  const saveEdit = async () => {
    if (!editRow?.id) return;
    if (!editClass || !editSubject || !editChapter.trim() || !editLesson.trim() || !editTitle.trim()) {
      Alert.alert('Missing fields', 'Fill class, subject, chapter, lesson, and title.');
      return;
    }
    if (!editNotes.trim()) {
      Alert.alert('Notes required', 'Enter study notes before saving.');
      return;
    }
    Keyboard.dismiss();
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await updateStudyMaterialWritten(editRow.id, {
        class_id: editClass,
        subject: editSubject,
        chapter_number: editChapter.trim(),
        lesson_number: editLesson.trim(),
        title: editTitle.trim(),
        notes: editNotes.trim(),
      });
      setRows((prev) =>
        prev.map((r) => (String(r.id) === String(editRow.id) ? { ...r, ...updated } : r))
      );
      closeEdit();
      Alert.alert('Saved', 'Notes updated.');
    } catch (e) {
      const msg = formatApiError(e);
      setEditError(msg);
      Alert.alert('Could not save', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const onDelete = (row) => {
    Alert.alert('Delete', `Delete "${row.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(row.id);
          try {
            await deleteStudyMaterial(row.id);
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

  if (loading && rows.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#4f46e5"
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {rows.length === 0 && !error ? (
          <Text style={styles.muted}>You have not added study material yet.</Text>
        ) : null}
        {rows.map((row) => (
          <View key={row.id} style={styles.card}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.meta}>
              {row.class_name} · {row.subject_name} · Ch {row.chapter_number} · L {row.lesson_number}
            </Text>
            <Text style={styles.badge}>{row.content_type}</Text>
            {row.content_type === 'written' ? (
              <Text style={styles.notes}>{row.notes}</Text>
            ) : row.file_url ? (
              <TouchableOpacity onPress={() => Linking.openURL(row.file_url)}>
                <Text style={styles.link}>Open uploaded file</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.audit}>
              Added by {row.added_by_name || '—'} · {formatWhen(row.created_at)}
              {row.updated_at && row.updated_at !== row.created_at
                ? `\nUpdated by ${row.updated_by_name || '—'} · ${formatWhen(row.updated_at)}`
                : ''}
            </Text>
            <View style={styles.actions}>
              {row.content_type === 'written' ? (
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(row)}>
                  <Text style={styles.editBtnTxt}>Edit</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.delBtn, deletingId === row.id && styles.delBtnOff]}
                disabled={deletingId === row.id}
                onPress={() => onDelete(row)}
              >
                <Text style={styles.delBtnTxt}>{deletingId === row.id ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={closeEdit}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit notes</Text>
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
                {editError ? <Text style={styles.banner}>{editError}</Text> : null}

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
                  onChange={(item) => setEditClass(item?.value || null)}
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

                <Text style={styles.fieldLabel}>Chapter number</Text>
                <TextInput style={styles.input} value={editChapter} onChangeText={setEditChapter} />

                <Text style={styles.fieldLabel}>Lesson number</Text>
                <TextInput style={styles.input} value={editLesson} onChangeText={setEditLesson} />

                <Text style={styles.fieldLabel}>Title</Text>
                <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  value={editNotes}
                  onChangeText={setEditNotes}
                  onFocus={scrollNotesIntoView}
                  placeholder="Study notes for students…"
                  placeholderTextColor="#94a3b8"
                  textAlignVertical="top"
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
  scroll: { padding: 16, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  error: { color: '#b91c1c', marginBottom: 8 },
  muted: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#3730a3' },
  meta: { color: '#64748b', fontSize: 12, marginTop: 4 },
  badge: { color: '#4f46e5', fontWeight: '600', fontSize: 12, marginTop: 6 },
  notes: { marginTop: 8, color: '#334155' },
  link: { color: '#4f46e5', fontWeight: '600', marginTop: 8 },
  audit: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  editBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
  },
  editBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  delBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff',
  },
  delBtnOff: { opacity: 0.6 },
  delBtnTxt: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
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
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#3730a3', marginBottom: 12 },
  modalLoading: { paddingVertical: 40, alignItems: 'center' },
  modalScroll: { maxHeight: 420 },
  modalScrollContent: { paddingBottom: 16 },
  banner: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#3730a3', marginTop: 10, marginBottom: 4 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  ddPh: { fontSize: 14, color: '#9ca3af' },
  ddSel: { fontSize: 14, color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#111827',
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
