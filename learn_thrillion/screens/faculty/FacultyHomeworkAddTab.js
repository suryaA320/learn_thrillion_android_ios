import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from 'react-native-paper';
import {
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchAcademicYearsSchool,
  fetchSchoolSubjects,
  createFacultyHomework,
} from '../../utils/schoolApi';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (typeof d?.message === 'string') return d.message;
  if (typeof d === 'object' && d !== null) return JSON.stringify(d);
  return err?.message || 'Request failed';
}

export default function FacultyHomeworkAddTab({ onSuccess }) {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBoot(true);
      setFormError('');
      try {
        const [years, cls, subs] = await Promise.all([
          fetchAcademicYearsSchool(),
          fetchSchoolClasses(),
          fetchSchoolSubjects({ assignedOnly: true }),
        ]);
        if (cancelled) return;
        setAcademicYears(Array.isArray(years) ? years : []);
        setClasses(Array.isArray(cls) ? cls : []);
        setSubjects(Array.isArray(subs) ? subs : []);
      } catch (e) {
        if (!cancelled) setFormError(formatApiError(e));
      } finally {
        if (!cancelled) setLoadingBoot(false);
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
    () =>
      (subjects || []).map((s) => ({
        label: s.subject_name || 'Subject',
        value: String(s.id),
      })),
    [subjects]
  );

  const filtersComplete = Boolean(
    selectedYear && selectedClass && selectedSection && selectedSubject
  );

  const submit = async () => {
    setFormError('');
    if (!filtersComplete) {
      Alert.alert('Missing fields', 'Select academic year, class, section, and subject.');
      return;
    }
    if (!details.trim()) {
      Alert.alert('Homework', 'Enter homework details.');
      return;
    }
    setSubmitting(true);
    try {
      await createFacultyHomework({
        academic_year: selectedYear,
        class_id: selectedClass,
        section_id: selectedSection,
        subject: selectedSubject,
        homework_details: details.trim(),
        title: title.trim(),
      });
      setTitle('');
      setDetails('');
      Alert.alert('Saved', 'Homework created.');
      onSuccess?.();
    } catch (e) {
      const msg = formatApiError(e);
      setFormError(msg);
      Alert.alert('Could not save', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBoot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          Homework is saved for the selected class and section. Students in that group see the same assignment.
        </Text>
        {formError ? <Text style={styles.banner}>{formError}</Text> : null}

        <Text style={styles.lbl}>Academic year</Text>
        <Dropdown
          style={styles.dd}
          placeholderStyle={styles.ddPh}
          selectedTextStyle={styles.ddSel}
          data={yearItems}
          labelField="label"
          valueField="value"
          placeholder="Select academic year"
          value={selectedYear}
          onChange={(item) => setSelectedYear(item?.value || null)}
        />

        <Text style={styles.lbl}>Class</Text>
        <Dropdown
          style={styles.dd}
          placeholderStyle={styles.ddPh}
          selectedTextStyle={styles.ddSel}
          data={classItems}
          labelField="label"
          valueField="value"
          placeholder="Select class"
          value={selectedClass}
          onChange={(item) => {
            setSelectedClass(item?.value || null);
            setSelectedSection(null);
          }}
        />

        <Text style={styles.lbl}>Section</Text>
        <Dropdown
          style={[styles.dd, (!selectedClass || loadingSections) && styles.ddDisabled]}
          placeholderStyle={styles.ddPh}
          selectedTextStyle={styles.ddSel}
          data={sectionItems}
          labelField="label"
          valueField="value"
          placeholder={loadingSections ? 'Loading sections…' : 'Select section'}
          value={selectedSection}
          disable={!selectedClass || loadingSections}
          onChange={(item) => setSelectedSection(item?.value || null)}
        />

        <Text style={styles.lbl}>Subject</Text>
        <Dropdown
          style={styles.dd}
          placeholderStyle={styles.ddPh}
          selectedTextStyle={styles.ddSel}
          data={subjectItems}
          labelField="label"
          valueField="value"
          placeholder={subjectItems.length ? 'Select subject' : 'No subjects — update faculty profile'}
          value={selectedSubject}
          disable={subjectItems.length === 0}
          onChange={(item) => setSelectedSubject(item?.value || null)}
        />
        {subjectItems.length === 0 ? (
          <Text style={styles.muted}>Ask your admin to assign subjects on your faculty profile.</Text>
        ) : null}

        {filtersComplete ? (
          <>
            <Text style={styles.lbl}>Title (optional)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Short title"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.lbl}>Homework details</Text>
            <TextInput
              style={styles.textarea}
              multiline
              value={details}
              onChangeText={setDetails}
              placeholder="Instructions for students…"
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />

            <Button mode="contained" onPress={submit} loading={submitting} disabled={submitting} style={styles.btn}>
              Submit
            </Button>
          </>
        ) : (
          <Text style={styles.muted}>Select year, class, section, and subject to enter homework.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 8, color: '#6b7280', fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 18 },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  lbl: { fontSize: 13, fontWeight: '600', color: '#14532d', marginTop: 10, marginBottom: 4 },
  dd: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  ddDisabled: { opacity: 0.55 },
  ddPh: { fontSize: 14, color: '#9ca3af' },
  ddSel: { fontSize: 14, color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  btn: { marginTop: 16, borderRadius: 10 },
});
