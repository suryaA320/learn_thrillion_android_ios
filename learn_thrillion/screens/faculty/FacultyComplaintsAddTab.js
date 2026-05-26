import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  FlatList,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchAcademicYearsSchool,
  fetchFacultyComplaintContext,
  searchComplaintStudents,
  submitComplaint,
} from '../../utils/schoolApi';

const DELEGATE_FACULTY_ROLES = [1, 2, 8];

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (typeof d === 'object' && d !== null) return JSON.stringify(d);
  return err?.message || 'Request failed';
}

export default function FacultyComplaintsAddTab({ onSuccess }) {
  const { user } = useAuth();
  const needsDelegateFaculty = DELEGATE_FACULTY_ROLES.includes(Number(user?.role));

  const [ctxLoading, setCtxLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [linkedFaculty, setLinkedFaculty] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [filtersLocked, setFiltersLocked] = useState(false);

  const [subject, setSubject] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHits, setStudentHits] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const [complaintText, setComplaintText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const searchTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCtxLoading(true);
      setFormError('');
      try {
        const [ctx, years, cls] = await Promise.all([
          fetchFacultyComplaintContext(),
          fetchAcademicYearsSchool(),
          fetchSchoolClasses(),
        ]);
        if (cancelled) return;
        setSchoolName(ctx?.school?.name || '');
        const subs = (ctx?.subjects || []).map((s) => s?.name).filter(Boolean);
        setSubjectOptions(subs);
        const linked = ctx?.linked_faculty || null;
        setLinkedFaculty(linked);
        setSelectedFacultyId(linked?.id ? String(linked.id) : '');
        setAcademicYears(Array.isArray(years) ? years : []);
        setClasses(Array.isArray(cls) ? cls : []);
      } catch (e) {
        if (!cancelled) setFormError(formatApiError(e));
      } finally {
        if (!cancelled) setCtxLoading(false);
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
      } catch {
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setLoadingSections(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  const runStudentSearch = useCallback(
    async (q) => {
      if (!filtersLocked || !selectedClass || !selectedSection) {
        setStudentHits([]);
        return;
      }
      setStudentSearchLoading(true);
      try {
        const data = await searchComplaintStudents(selectedClass, selectedSection, q || '');
        setStudentHits(Array.isArray(data) ? data : []);
      } catch {
        setStudentHits([]);
      } finally {
        setStudentSearchLoading(false);
      }
    },
    [filtersLocked, selectedClass, selectedSection]
  );

  useEffect(() => {
    if (!filtersLocked) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      runStudentSearch(studentSearch.trim());
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [studentSearch, filtersLocked, selectedClass, selectedSection, runStudentSearch]);

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
      (sections || []).map((s) => ({
        label: s.section_name || 'Section',
        value: String(s.id),
      })),
    [sections]
  );

  const subjectItems = useMemo(
    () => subjectOptions.map((s) => ({ label: s, value: s })),
    [subjectOptions]
  );

  const applyFilters = () => {
    if (!selectedYear || !selectedClass || !selectedSection) {
      Alert.alert('Context', 'Select academic year, class, and section.');
      return;
    }
    setFiltersLocked(true);
    setSubject(null);
    setStudentSearch('');
    setSelectedStudent(null);
    setStudentHits([]);
    setComplaintText('');
    setSelectedFacultyId(linkedFaculty?.id ? String(linkedFaculty.id) : '');
    runStudentSearch('');
    Alert.alert('Ready', 'Academic context applied. Fill complaint details below.');
  };

  const resetFilters = () => {
    setFiltersLocked(false);
    setSelectedYear(null);
    setSelectedClass(null);
    setSelectedSection(null);
    setSubject(null);
    setStudentSearch('');
    setSelectedStudent(null);
    setStudentHits([]);
    setComplaintText('');
    setSelectedFacultyId(linkedFaculty?.id ? String(linkedFaculty.id) : '');
  };

  const pickStudent = (stu) => {
    setSelectedStudent(stu);
    setStudentSearch(stu.label || `${stu.first_name || ''} ${stu.last_name || ''}`.trim());
    setStudentHits([]);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!filtersLocked) {
      Alert.alert('Context', 'Apply academic year, class, and section first.');
      return;
    }
    if (!subject) {
      Alert.alert('Subject', 'Select a subject.');
      return;
    }
    if (!selectedStudent?.id) {
      Alert.alert('Student', 'Pick a student from the search list.');
      return;
    }
    const text = complaintText.trim();
    if (!text) {
      Alert.alert('Complaint', 'Enter complaint details.');
      return;
    }
    if (text.length > 250) {
      Alert.alert('Complaint', 'Complaint details must be 250 characters or fewer.');
      return;
    }
    if (needsDelegateFaculty && (!linkedFaculty || !selectedFacultyId)) {
      Alert.alert(
        'Faculty profile',
        'No faculty record matches your login email for this school. Complaints cannot be logged from this account.'
      );
      return;
    }

    const body = {
      academic_year_complaint: selectedYear,
      classes_detail_complaint: selectedClass,
      sections_detail_complaint: selectedSection,
      student_details_complaint: selectedStudent.id,
      subject,
      complaint_details: text,
    };
    if (needsDelegateFaculty) {
      body.faculty_name = selectedFacultyId;
    }

    setSubmitting(true);
    try {
      await submitComplaint(body);
      Alert.alert('Success', 'Complaint logged.');
      setComplaintText('');
      setSelectedStudent(null);
      setStudentSearch('');
      onSuccess?.();
    } catch (e) {
      const msg = formatApiError(e);
      setFormError(msg);
      Alert.alert('Could not submit', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (ctxLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.muted}>Loading school & subjects…</Text>
      </View>
    );
  }

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
        {schoolName ? (
          <Text style={styles.schoolBanner}>
            School: <Text style={styles.schoolStrong}>{schoolName}</Text>
          </Text>
        ) : null}
        {formError ? <Text style={styles.banner}>{formError}</Text> : null}

        <Text style={styles.sectionTitle}>1. Academic context</Text>
        <View style={styles.card}>
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
            onChange={(item) => setSelectedYear(item.value)}
            disable={filtersLocked}
          />

          <Text style={[styles.label, styles.mt]}>Class</Text>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.ph}
            selectedTextStyle={styles.sel}
            data={classItems}
            labelField="label"
            valueField="value"
            placeholder="Select class"
            value={selectedClass}
            onChange={(item) => {
              setSelectedClass(item.value);
              setSelectedSection(null);
            }}
            disable={filtersLocked}
          />

          <Text style={[styles.label, styles.mt]}>Section</Text>
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
              disable={filtersLocked || !selectedClass}
            />
          )}

          {!filtersLocked ? (
            <Button mode="contained" buttonColor="#14532d" style={styles.mtBtn} onPress={applyFilters}>
              Apply context
            </Button>
          ) : (
            <Button mode="outlined" textColor="#14532d" style={styles.mtBtn} onPress={resetFilters}>
              Change context
            </Button>
          )}
        </View>

        <Text style={styles.sectionTitle}>2. Complaint details</Text>
        <View style={styles.card}>
          {!filtersLocked ? (
            <Text style={styles.muted}>Apply year, class, and section above to enable this form.</Text>
          ) : (
            <>
              {needsDelegateFaculty ? (
                <View style={styles.delegateBox}>
                  <Text style={styles.label}>Complaint logged for faculty</Text>
                  {linkedFaculty ? (
                    <Text style={styles.linkedName}>
                      {linkedFaculty.first_name} {linkedFaculty.last_name}
                    </Text>
                  ) : (
                    <Text style={styles.warn}>
                      No faculty record uses your login email for this school. Use a faculty/class teacher account,
                      or ensure your email matches an onboarded faculty profile.
                    </Text>
                  )}
                  <Text style={styles.smallMuted}>Subject choices follow this faculty profile.</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Subject</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.ph}
                selectedTextStyle={styles.sel}
                data={subjectItems}
                labelField="label"
                valueField="value"
                placeholder={subjectItems.length ? 'Select subject' : 'No subjects — update faculty profile'}
                value={subject}
                onChange={(item) => setSubject(item.value)}
                disable={subjectItems.length === 0}
              />
              {subjectItems.length === 0 ? (
                <Text style={styles.warn}>Ask your admin to assign subjects on your faculty profile.</Text>
              ) : null}

              <Text style={[styles.label, styles.mt]}>Student</Text>
              <TextInput
                style={styles.input}
                placeholder="Search name or admission no."
                value={
                  selectedStudent
                    ? selectedStudent.label ||
                      `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim()
                    : studentSearch
                }
                onFocus={() => {
                  if (selectedStudent) {
                    setStudentSearch(
                      selectedStudent.label ||
                        `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim()
                    );
                    setSelectedStudent(null);
                  }
                }}
                onChangeText={(t) => {
                  setSelectedStudent(null);
                  setStudentSearch(t);
                }}
                placeholderTextColor="#9ca3af"
              />
              {studentSearchLoading ? (
                <ActivityIndicator color="#15803d" style={{ marginVertical: 6 }} />
              ) : null}
              {studentHits.length > 0 ? (
                <FlatList
                  data={studentHits}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled={false}
                  style={styles.hitList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.hitRow} onPress={() => pickStudent(item)}>
                      <Text style={styles.hitTxt}>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                />
              ) : filtersLocked && studentSearch.trim().length > 0 && !studentSearchLoading ? (
                <Text style={styles.smallMuted}>No matches — keep typing</Text>
              ) : null}

              <Text style={[styles.label, styles.mt]}>Complaint (max 250)</Text>
              <TextInput
                style={styles.textarea}
                multiline
                maxLength={250}
                value={complaintText}
                onChangeText={setComplaintText}
                placeholder="Describe the complaint"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.counter}>{complaintText.length}/250</Text>

              <Button
                mode="contained"
                buttonColor="#15803d"
                style={styles.mtBtn}
                onPress={handleSubmit}
                disabled={submitting || (needsDelegateFaculty && !linkedFaculty)}
              >
                {submitting ? 'Submitting…' : 'Submit complaint'}
              </Button>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 10, color: '#6b7280', fontSize: 14 },
  schoolBanner: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  schoolStrong: { fontWeight: '800', color: '#14532d' },
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
  label: { fontSize: 12, fontWeight: '700', color: '#374151' },
  mt: { marginTop: 12 },
  mtBtn: { marginTop: 14 },
  dropdown: {
    minHeight: 48,
    marginTop: 6,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fafafa',
  },
  ph: { fontSize: 15, color: '#9ca3af' },
  sel: { fontSize: 15, color: '#111' },
  delegateBox: { marginBottom: 12 },
  linkedName: { fontSize: 16, fontWeight: '800', color: '#14532d', marginTop: 6 },
  warn: { fontSize: 13, color: '#b45309', marginTop: 6, lineHeight: 18 },
  smallMuted: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  hitList: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  hitRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6' },
  hitTxt: { fontSize: 15, color: '#111827' },
  textarea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    textAlignVertical: 'top',
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  counter: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
