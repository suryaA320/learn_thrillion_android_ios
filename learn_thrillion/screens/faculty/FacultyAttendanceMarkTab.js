import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from 'react-native-paper';
import DatePickerField from '../../components/DatePickerField';
import {
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchStudentsByClassSection,
  submitAttendanceSession,
} from '../../utils/schoolApi';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

export function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (Array.isArray(d?.detail))
    return d.detail.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n');
  if (d?.detail && typeof d.detail === 'object') return JSON.stringify(d.detail);
  if (typeof d?.error === 'string') return d.error;
  return err?.message || 'Something went wrong';
}

/** Mark attendance form (embedded under Attendance tabs). */
export default function FacultyAttendanceMarkTab() {
  const { user } = useAuth();
  const isClassTeacher = Number(user?.role) === ROLES.CLASS_TEACHER;
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sessionType, setSessionType] = useState('MORNING');
  const [sessionDate, setSessionDate] = useState(todayISO);
  const [attendance, setAttendance] = useState({});
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingClasses(true);
      setListError('');
      try {
        const data = await fetchSchoolClasses({ forAttendance: true });
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setClasses(list);
          if (list.length === 1) {
            setSelectedClass(String(list[0].id));
          }
        }
      } catch (e) {
        if (!cancelled) setListError(formatApiError(e));
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setSections([]);
      setSelectedSection(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSections(true);
      setListError('');
      try {
        const data = await fetchSectionsByClass(selectedClass, { forAttendance: true });
        if (!cancelled) {
          setSections(Array.isArray(data) ? data : []);
          setSelectedSection(null);
          setStudents([]);
          setAttendance({});
        }
      } catch (e) {
        if (!cancelled) setListError(formatApiError(e));
      } finally {
        if (!cancelled) setLoadingSections(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

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
      (sections || []).map((s) => ({
        label: s.section_name || 'Section',
        value: String(s.id),
      })),
    [sections]
  );

  const loadStudents = useCallback(async () => {
    if (!selectedClass || !selectedSection) {
      Alert.alert('Select class & section', 'Choose a class and section, then load students.');
      return;
    }
    setLoadingStudents(true);
    setListError('');
    try {
      const data = await fetchStudentsByClassSection(selectedClass, selectedSection);
      const list = Array.isArray(data) ? data : [];
      setStudents(list);
      const next = {};
      list.forEach((stu) => {
        next[String(stu.id)] = 'PRESENT';
      });
      setAttendance(next);
      if (list.length === 0) {
        Alert.alert('No students', 'No students found for this class and section.');
      }
    } catch (e) {
      setListError(formatApiError(e));
      setStudents([]);
      setAttendance({});
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClass, selectedSection]);

  const toggleStatus = useCallback((studentId) => {
    const id = String(studentId);
    setAttendance((prev) => {
      const cur = prev[id] || 'PRESENT';
      return { ...prev, [id]: cur === 'PRESENT' ? 'ABSENT' : 'PRESENT' };
    });
  }, []);

  const submit = useCallback(async () => {
    if (!selectedClass || !selectedSection) {
      Alert.alert('Missing selection', 'Select class and section.');
      return;
    }
    const keys = Object.keys(attendance);
    if (keys.length === 0) {
      Alert.alert('No students', 'Load students before submitting.');
      return;
    }
    const dateStr = (sessionDate || '').trim() || todayISO();
    const payload = {
      class_name: selectedClass,
      section_name: selectedSection,
      session_type: sessionType,
      session_date: dateStr,
      records: keys.map((id) => ({
        student: id,
        status: attendance[id] || 'ABSENT',
      })),
    };
    setSubmitting(true);
    setListError('');
    try {
      await submitAttendanceSession(payload);
      Alert.alert('Success', 'Attendance saved.');
      setStudents([]);
      setAttendance({});
    } catch (e) {
      const msg = formatApiError(e);
      setListError(msg);
      Alert.alert('Could not save', msg);
    } finally {
      setSubmitting(false);
    }
  }, [selectedClass, selectedSection, sessionType, sessionDate, attendance]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {listError ? <Text style={styles.banner}>{listError}</Text> : null}

        <Text style={styles.sectionTitle}>Session</Text>
        <View style={styles.card}>
          {loadingClasses ? (
            <ActivityIndicator color="#15803d" style={{ marginVertical: 12 }} />
          ) : classItems.length === 0 ? (
            <Text style={styles.empty}>
              {isClassTeacher
                ? 'No class is assigned to you as class teacher. Ask your school admin to assign you on the faculty profile.'
                : 'No classes found for your school.'}
            </Text>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>Class</Text>
              {isClassTeacher && classItems.length === 1 ? (
                <View style={styles.readOnlyClass}>
                  <Text style={styles.readOnlyClassText}>{classItems[0].label}</Text>
                </View>
              ) : (
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.ph}
                  selectedTextStyle={styles.sel}
                  data={classItems}
                  labelField="label"
                  valueField="value"
                  placeholder="Select class"
                  value={selectedClass}
                  onChange={(item) => setSelectedClass(item.value)}
                />
              )}
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Section</Text>
            {loadingSections ? (
              <ActivityIndicator color="#15803d" style={{ marginVertical: 8 }} />
            ) : (
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.ph}
                selectedTextStyle={styles.sel}
                data={sectionItems}
                labelField="label"
                valueField="value"
                placeholder={selectedClass ? 'Select section' : 'Select class first'}
                value={selectedSection}
                onChange={(item) => setSelectedSection(item.value)}
                disable={!selectedClass}
              />
            )}
          </View>

          <Text style={styles.label}>Session</Text>
          <View style={styles.sessionRow}>
            <TouchableOpacity
              style={[styles.chip, sessionType === 'MORNING' && styles.chipOn]}
              onPress={() => setSessionType('MORNING')}
            >
              <Text style={[styles.chipText, sessionType === 'MORNING' && styles.chipTextOn]}>Morning</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, sessionType === 'AFTERNOON' && styles.chipOn]}
              onPress={() => setSessionType('AFTERNOON')}
            >
              <Text style={[styles.chipText, sessionType === 'AFTERNOON' && styles.chipTextOn]}>Afternoon</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 12 }}>
            <DatePickerField
              label="Session date"
              value={sessionDate}
              onChangeValue={setSessionDate}
              placeholder={todayISO()}
            />
          </View>

          <Button
            mode="contained"
            buttonColor="#14532d"
            style={styles.loadBtn}
            onPress={loadStudents}
            disabled={loadingStudents || !selectedClass || !selectedSection}
          >
            {loadingStudents ? 'Loading…' : 'Load students'}
          </Button>
        </View>

        <Text style={styles.sectionTitle}>Students</Text>
        <View style={styles.card}>
          {students.length === 0 ? (
            <Text style={styles.empty}>Load students to mark present or absent.</Text>
          ) : (
            students.map((stu, index) => {
              const id = String(stu.id);
              const st = attendance[id] || 'ABSENT';
              const name = [stu.first_name, stu.last_name].filter(Boolean).join(' ') || 'Student';
              return (
                <View key={id} style={styles.studentRow}>
                  <Text style={styles.idx}>{index + 1}</Text>
                  <Text style={styles.stuName} numberOfLines={2}>
                    {name}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pill, st === 'PRESENT' ? styles.pillPresent : styles.pillAbsent]}
                    onPress={() => toggleStatus(id)}
                  >
                    <Text style={[styles.pillText, st !== 'PRESENT' && styles.pillTextAbsent]}>{st}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {students.length > 0 ? (
            <Button
              mode="contained"
              buttonColor="#15803d"
              style={styles.submitBtn}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit attendance'}
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d1fae5',
    marginBottom: 12,
  },
  field: { marginBottom: 12 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  dropdown: {
    minHeight: 48,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fafafa',
  },
  ph: { fontSize: 15, color: '#9ca3af' },
  sel: { fontSize: 15, color: '#111' },
  readOnlyClass: {
    minHeight: 48,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
  },
  readOnlyClassText: { fontSize: 15, color: '#111827', fontWeight: '600' },
  sessionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  chipOn: { backgroundColor: '#14532d' },
  chipText: { fontWeight: '700', color: '#374151' },
  chipTextOn: { color: '#fff' },
  loadBtn: { marginTop: 4 },
  empty: { color: '#6b7280', fontSize: 15, paddingVertical: 8 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  idx: { width: 28, fontSize: 14, color: '#6b7280', fontWeight: '600' },
  stuName: { flex: 1, fontSize: 16, color: '#111827', paddingRight: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    minWidth: 88,
    alignItems: 'center',
  },
  pillPresent: { backgroundColor: '#bbf7d0' },
  pillAbsent: { backgroundColor: '#fecaca' },
  pillText: { fontWeight: '800', fontSize: 13, color: '#14532d' },
  pillTextAbsent: { color: '#991b1b' },
  submitBtn: { marginTop: 16 },
});
