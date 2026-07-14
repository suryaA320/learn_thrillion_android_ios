import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from 'react-native-paper';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import {
  fetchAcademicYearsSchool,
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchSchoolExaminations,
  fetchFacultyMarksSheetData,
  saveStudentMarksBulk,
} from '../../utils/schoolApi';
import {
  getComponentScoreValue,
  getDisplayMarks,
  studentDisplayName,
  subjectUsesSplit,
} from '../../utils/marksHelpers';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (typeof d?.error === 'string') return d.error;
  if (Array.isArray(d)) {
    const first = d.find((x) => x && typeof x === 'object' && Object.keys(x).length);
    if (first) {
      const msg =
        first.non_field_errors?.[0] ||
        Object.values(first).flat?.()?.[0] ||
        Object.values(first)?.[0];
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg) && msg[0]) return String(msg[0]);
    }
  }
  return err?.message || 'Something went wrong';
}

function yearLabel(y) {
  return (
    y?.academic_year ||
    y?.name ||
    y?.year ||
    (y?.id != null ? String(y.id) : 'Year')
  );
}

/** Marks-sheet API expects SchoolAcademicYear UUID, not the display label. */
function yearValue(y) {
  return y?.id != null ? String(y.id) : '';
}

export default function FacultyMarksEntry() {
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [exams, setExams] = useState([]);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      setError('');
      try {
        const [yearsData, classesData, examsData] = await Promise.all([
          fetchAcademicYearsSchool(),
          fetchSchoolClasses(),
          fetchSchoolExaminations(),
        ]);
        if (cancelled) return;
        setYears(Array.isArray(yearsData) ? yearsData : []);
        setClasses(Array.isArray(classesData) ? classesData : []);
        setExams(Array.isArray(examsData) ? examsData : []);
      } catch (e) {
        if (!cancelled) setError(formatApiError(e));
      } finally {
        if (!cancelled) setLoadingMeta(false);
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
      try {
        const data = await fetchSectionsByClass(selectedClass);
        if (!cancelled) {
          setSections(Array.isArray(data) ? data : []);
          setSelectedSection(null);
        }
      } catch (e) {
        if (!cancelled) {
          setSections([]);
          setError(formatApiError(e));
        }
      } finally {
        if (!cancelled) setLoadingSections(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  const yearItems = useMemo(
    () =>
      years.map((y) => ({
        label: yearLabel(y),
        value: yearValue(y),
      })),
    [years]
  );
  const classItems = useMemo(
    () =>
      classes.map((c) => ({
        label: c.class_name || c.name || String(c.id),
        value: String(c.id),
      })),
    [classes]
  );
  const sectionItems = useMemo(
    () =>
      sections.map((s) => ({
        label: s.section_name || s.name || String(s.id),
        value: String(s.id),
      })),
    [sections]
  );
  const examItems = useMemo(() => {
    const filtered = selectedYear
      ? exams.filter((e) => {
          const ay = e.academic_year ?? e.academic_year_id;
          return ay != null && String(ay) === String(selectedYear);
        })
      : exams;
    return filtered.map((e) => ({
      label: e.examination_name || e.name || String(e.id),
      value: String(e.id),
    }));
  }, [exams, selectedYear]);

  const editableSubjectIds = useMemo(() => {
    const ids = new Set();
    (subjects || []).forEach((s) => {
      if (s.can_edit !== false) ids.add(String(s.id));
    });
    return ids;
  }, [subjects]);

  const loadSheet = useCallback(async () => {
    if (!selectedYear || !selectedClass || !selectedSection || !selectedExam) {
      Alert.alert('Missing filters', 'Select academic year, class, section, and exam.');
      return;
    }
    setLoadingSheet(true);
    setError('');
    setSheetLoaded(false);
    try {
      const data = await fetchFacultyMarksSheetData({
        academic_year: selectedYear,
        class_id: selectedClass,
        section_id: selectedSection,
        exam_id: selectedExam,
      });
      setStudents(Array.isArray(data?.students) ? data.students : []);
      setSubjects(Array.isArray(data?.subjects) ? data.subjects : []);
      setMarksData(data?.marks_map && typeof data.marks_map === 'object' ? data.marks_map : {});
      setExpandedStudentId(null);
      setSheetLoaded(true);
    } catch (e) {
      setStudents([]);
      setSubjects([]);
      setMarksData({});
      setError(formatApiError(e));
      Alert.alert('Could not load marks sheet', formatApiError(e));
    } finally {
      setLoadingSheet(false);
    }
  }, [selectedYear, selectedClass, selectedSection, selectedExam]);

  const setSingleMark = (studentId, subjectId, value) => {
    if (!editableSubjectIds.has(String(subjectId))) return;
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: {
          ...(prev[studentId]?.[subjectId] || {}),
          marks_obtained: value,
        },
      },
    }));
  };

  const setComponentMark = (studentId, subjectId, componentId, value) => {
    if (!editableSubjectIds.has(String(subjectId))) return;
    setMarksData((prev) => {
      const row = prev[studentId]?.[subjectId] || {};
      const component_scores = { ...(row.component_scores || {}) };
      component_scores[String(componentId)] = value;
      const sub = subjects.find((s) => String(s.id) === String(subjectId));
      const total = sub
        ? getDisplayMarks(
            { [subjectId]: { component_scores } },
            subjectId,
            sub.mark_components
          )
        : 0;
      return {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [subjectId]: {
            ...row,
            component_scores,
            marks_obtained: total > 0 ? String(total) : '',
          },
        },
      };
    });
  };

  const handleSave = async () => {
    const payload = [];
    Object.keys(marksData || {}).forEach((studentId) => {
      Object.keys(marksData[studentId] || {}).forEach((examSubjectId) => {
        if (!editableSubjectIds.has(String(examSubjectId))) return;
        const row = marksData[studentId][examSubjectId];
        const sub = subjects.find((s) => String(s.id) === String(examSubjectId));
        if (sub && subjectUsesSplit(sub)) {
          const comps = sub.mark_components || [];
          const component_scores = [];
          comps.forEach((comp) => {
            const raw = getComponentScoreValue(row?.component_scores, comp.id);
            if (raw !== '' && raw != null) {
              component_scores.push({
                component_id: comp.id,
                marks_obtained: parseFloat(raw),
              });
            }
          });
          if (!component_scores.length) return;
          const total = getDisplayMarks(marksData[studentId], examSubjectId, comps);
          payload.push({
            student: studentId,
            exam_subject: examSubjectId,
            marks_obtained: total,
            component_scores,
          });
          return;
        }
        const value = row?.marks_obtained;
        if (value !== '' && value != null && value !== undefined) {
          payload.push({
            student: studentId,
            exam_subject: examSubjectId,
            marks_obtained: parseFloat(value),
          });
        }
      });
    });

    if (!payload.length) {
      Alert.alert('Nothing to save', 'Enter at least one mark in a subject you can edit.');
      return;
    }

    setSaving(true);
    try {
      await saveStudentMarksBulk(payload);
      Alert.alert('Saved', 'Marks saved successfully.');
    } catch (e) {
      Alert.alert('Save failed', formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const canLoad = selectedYear && selectedClass && selectedSection && selectedExam;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Enter marks" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.intro}>
              Same flow as web: academic year → class → section → exam → enter marks for your
              subjects → save.
            </Text>

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <View style={styles.filters}>
              {loadingMeta ? (
                <ActivityIndicator color="#4f46e5" style={{ marginVertical: 12 }} />
              ) : (
                <>
                  <Text style={styles.label}>Academic year</Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.ph}
                    selectedTextStyle={styles.sel}
                    data={yearItems}
                    labelField="label"
                    valueField="value"
                    placeholder="Select year"
                    value={selectedYear}
                    onChange={(item) => {
                      setSelectedYear(item.value);
                      setSelectedExam(null);
                      setSheetLoaded(false);
                    }}
                  />

                  <Text style={styles.label}>Class</Text>
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

                  <Text style={styles.label}>Section</Text>
                  {loadingSections ? (
                    <ActivityIndicator color="#4f46e5" style={{ marginVertical: 8 }} />
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

                  <Text style={styles.label}>Examination</Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.ph}
                    selectedTextStyle={styles.sel}
                    data={examItems}
                    labelField="label"
                    valueField="value"
                    placeholder={
                      selectedYear ? 'Select exam' : 'Select academic year first'
                    }
                    value={selectedExam}
                    onChange={(item) => setSelectedExam(item.value)}
                    disable={!selectedYear}
                  />

                  <Button
                    mode="contained"
                    buttonColor="#3730a3"
                    style={styles.loadBtn}
                    onPress={loadSheet}
                    disabled={!canLoad || loadingSheet}
                  >
                    {loadingSheet ? 'Loading…' : 'Load marks sheet'}
                  </Button>
                </>
              )}
            </View>

            {sheetLoaded ? (
              <>
                <Text style={styles.sectionTitle}>
                  Students ({students.length}) · Subjects ({subjects.length})
                </Text>
                {!subjects.length ? (
                  <Text style={styles.empty}>
                    No subjects assigned to this exam/class. Ask school admin to assign subjects
                    first.
                  </Text>
                ) : null}
                {!students.length ? (
                  <Text style={styles.empty}>No students found for this class/section.</Text>
                ) : null}

                {students.map((student) => {
                  const sid = String(student.id);
                  const open = expandedStudentId === sid;
                  return (
                    <View key={sid} style={styles.studentCard}>
                      <TouchableOpacity
                        style={styles.studentHeader}
                        onPress={() => setExpandedStudentId(open ? null : sid)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.studentName}>{studentDisplayName(student)}</Text>
                        <Text style={styles.expandHint}>{open ? 'Hide' : 'Enter marks'}</Text>
                      </TouchableOpacity>

                      {open
                        ? subjects.map((sub) => {
                            const editable = sub.can_edit !== false;
                            const usesSplit = subjectUsesSplit(sub);
                            const row = marksData?.[sid]?.[sub.id] || {};
                            return (
                              <View
                                key={String(sub.id)}
                                style={[styles.subjectBlock, !editable && styles.subjectLocked]}
                              >
                                <Text style={styles.subjectName}>
                                  {sub.subject_name || 'Subject'}
                                  {!editable ? ' (view only)' : ''}
                                </Text>
                                <Text style={styles.subjectMeta}>
                                  Max {sub.max_marks ?? '—'} · Pass {sub.passing_marks ?? '—'}
                                </Text>

                                {usesSplit ? (
                                  <>
                                    {(sub.mark_components || []).map((comp) => (
                                      <View key={String(comp.id)} style={styles.compRow}>
                                        <Text style={styles.compLabel}>
                                          {comp.name} (/{comp.max_marks})
                                        </Text>
                                        <TextInput
                                          style={[
                                            styles.input,
                                            !editable && styles.inputDisabled,
                                          ]}
                                          keyboardType="decimal-pad"
                                          editable={editable && !saving}
                                          value={String(
                                            getComponentScoreValue(row.component_scores, comp.id) ??
                                              ''
                                          )}
                                          onChangeText={(t) =>
                                            setComponentMark(sid, sub.id, comp.id, t)
                                          }
                                          placeholder="0"
                                          placeholderTextColor="#94a3b8"
                                        />
                                      </View>
                                    ))}
                                    <Text style={styles.totalLine}>
                                      Total:{' '}
                                      {getDisplayMarks(
                                        marksData[sid] || {},
                                        sub.id,
                                        sub.mark_components
                                      )}
                                    </Text>
                                  </>
                                ) : (
                                  <TextInput
                                    style={[styles.input, !editable && styles.inputDisabled]}
                                    keyboardType="decimal-pad"
                                    editable={editable && !saving}
                                    value={String(row.marks_obtained ?? '')}
                                    onChangeText={(t) => setSingleMark(sid, sub.id, t)}
                                    placeholder="Marks"
                                    placeholderTextColor="#94a3b8"
                                  />
                                )}
                              </View>
                            );
                          })
                        : null}
                    </View>
                  );
                })}

                {students.length && subjects.length ? (
                  <Button
                    mode="contained"
                    buttonColor="#0f766e"
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={saving || loadingSheet}
                  >
                    {saving ? 'Saving…' : 'Save marks'}
                  </Button>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
        <FacultyBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eef2ff' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 14, paddingBottom: 120, paddingTop: 8 },
  intro: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  filters: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338ca',
    marginBottom: 4,
    marginTop: 8,
  },
  dropdown: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  ph: { color: '#94a3b8', fontSize: 14 },
  sel: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  loadBtn: { marginTop: 14, borderRadius: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3730a3',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  empty: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  studentName: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
  expandHint: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  subjectBlock: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  subjectLocked: { opacity: 0.72 },
  subjectName: { fontSize: 14, fontWeight: '700', color: '#1e1b4b' },
  subjectMeta: { fontSize: 11, color: '#64748b', marginBottom: 6, marginTop: 2 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#64748b' },
  compRow: { marginBottom: 8 },
  compLabel: { fontSize: 12, color: '#475569', marginBottom: 4, fontWeight: '600' },
  totalLine: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#0f766e' },
  saveBtn: { marginTop: 8, marginBottom: 16, borderRadius: 10 },
});
