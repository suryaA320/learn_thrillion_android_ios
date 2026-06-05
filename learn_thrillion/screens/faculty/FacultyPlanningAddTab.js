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
import DatePickerField from '../../components/DatePickerField';
import {
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchAcademicYearsSchool,
  createFacultyActionPlan,
} from '../../utils/schoolApi';

const STATUS_ITEMS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  if (typeof d?.message === 'string') return d.message;
  if (typeof d === 'object' && d !== null) return JSON.stringify(d);
  return err?.message || 'Request failed';
}

export default function FacultyPlanningAddTab({ onSuccess }) {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const [actionPlan, setActionPlan] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [planStatus, setPlanStatus] = useState('draft');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBoot(true);
      setFormError('');
      try {
        const [years, cls] = await Promise.all([fetchAcademicYearsSchool(), fetchSchoolClasses()]);
        if (cancelled) return;
        setAcademicYears(Array.isArray(years) ? years : []);
        setClasses(Array.isArray(cls) ? cls : []);
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

  useEffect(() => {
    if (!selectedYear || !selectedClass || !selectedSection) {
      setActionPlan('');
      setFromDate('');
      setPlanStatus('draft');
    }
  }, [selectedYear, selectedClass, selectedSection]);

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

  const filtersComplete = Boolean(selectedYear && selectedClass && selectedSection);

  const submit = async () => {
    setFormError('');
    if (!selectedYear || !selectedClass || !selectedSection) {
      Alert.alert('Missing fields', 'Select academic year, class, and section.');
      return;
    }
    if (!actionPlan.trim()) {
      Alert.alert('Missing fields', 'Enter your action plan text.');
      return;
    }
    if (!fromDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate.trim())) {
      Alert.alert('Date', 'Choose a plan date.');
      return;
    }

    setSubmitting(true);
    try {
      await createFacultyActionPlan({
        academic_year: selectedYear,
        class_id: selectedClass,
        section_id: selectedSection,
        action_plan: actionPlan.trim(),
        from_date: fromDate.trim(),
        status: planStatus,
      });
      setActionPlan('');
      setFromDate('');
      setPlanStatus('draft');
      Alert.alert('Saved', 'Action plan submitted successfully.');
      onSuccess?.();
    } catch (e) {
      setFormError(formatApiError(e));
      Alert.alert('Could not save', formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBoot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.muted}>Loading school context…</Text>
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
          Select academic year, class, and section for your school. Lists match the web Add action plan flow.
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

        {filtersComplete ? (
          <>
            <Text style={styles.lbl}>Status</Text>
            <Dropdown
              style={styles.dd}
              placeholderStyle={styles.ddPh}
              selectedTextStyle={styles.ddSel}
              data={STATUS_ITEMS}
              labelField="label"
              valueField="value"
              value={planStatus}
              onChange={(item) => setPlanStatus(item?.value || 'draft')}
            />

            <Text style={styles.lbl}>Action plan</Text>
            <TextInput
              style={styles.textarea}
              multiline
              value={actionPlan}
              onChangeText={setActionPlan}
              placeholder="Describe the action plan…"
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />

            <DatePickerField label="Plan date" value={fromDate} onChangeValue={setFromDate} placeholder="Select date" />

            <Button
              mode="contained"
              onPress={submit}
              loading={submitting}
              disabled={submitting}
              buttonColor="#4f46e5"
              style={styles.btn}
            >
              Submit
            </Button>
          </>
        ) : (
          <Text style={styles.muted}>Select year, class, and section above to enter the plan and date.</Text>
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
  lbl: { fontSize: 13, fontWeight: '600', color: '#3730a3', marginTop: 10, marginBottom: 4 },
  dd: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  ddDisabled: { opacity: 0.55 },
  ddPh: { fontSize: 14, color: '#9ca3af' },
  ddSel: { fontSize: 14, color: '#111827' },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  btn: { marginTop: 16, borderRadius: 10 },
});
