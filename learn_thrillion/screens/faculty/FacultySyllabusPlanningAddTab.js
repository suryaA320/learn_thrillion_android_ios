import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Dropdown } from 'react-native-element-dropdown';
import KeyboardDismissBar from '../../components/KeyboardDismissBar';
import { FACULTY_BOTTOM_NAV_CLEARANCE, useKeyboardInset } from '../../components/useKeyboardInset';
import {
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchAcademicYearsSchool,
  fetchSchoolSubjects,
  fetchFacultySyllabusPlans,
  fetchFacultySyllabusPlanDetail,
  createFacultySyllabusPlan,
  updateFacultySyllabusPlan,
} from '../../utils/schoolApi';
import {
  emptyChapter,
  emptySubtopic,
  formStateToPayload,
  hasDuplicateChapterNumbers,
  nextChapterNumber,
  planToFormState,
} from '../../utils/syllabusPlanningUtils';

const STATUS_ITEMS = [
  { label: 'Pending', value: 'pending' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'On hold', value: 'on_hold' },
];

function statusUi(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'completed') {
    return {
      label: 'Completed',
      card: styles.subtopicCardCompleted,
      badge: styles.statusBadgeCompleted,
      dropdown: styles.dropdownStatusCompleted,
    };
  }
  if (s === 'in_progress') {
    return {
      label: 'In progress',
      card: styles.subtopicCardInProgress,
      badge: styles.statusBadgeInProgress,
      dropdown: styles.dropdownStatusInProgress,
    };
  }
  if (s === 'on_hold') {
    return {
      label: 'On hold',
      card: styles.subtopicCardOnHold,
      badge: styles.statusBadgeOnHold,
      dropdown: styles.dropdownStatusOnHold,
    };
  }
  return {
    label: 'Pending',
    card: styles.subtopicCardPending,
    badge: styles.statusBadgePending,
    dropdown: styles.dropdownStatusPending,
  };
}

export default function FacultySyllabusPlanningAddTab({ onSaved }) {
  const scrollRef = useRef(null);
  const { keyboardHeight, keyboardVisible, dismissKeyboard } = useKeyboardInset();
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [yearId, setYearId] = useState(null);
  const [classId, setClassId] = useState(null);
  const [sectionId, setSectionId] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [existingPlanId, setExistingPlanId] = useState(null);
  const [title, setTitle] = useState('');
  const [chapters, setChapters] = useState([emptyChapter(1)]);

  const scopeReady = Boolean(yearId && classId && sectionId && subjectId);
  const scopeKey = scopeReady ? `${yearId}|${classId}|${sectionId}|${subjectId}` : null;
  const isDirtyRef = useRef(false);
  const loadedScopeRef = useRef(null);
  const loadRequestRef = useRef(0);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);

  const applyPlanForm = useCallback((form) => {
    setExistingPlanId(form.planId);
    setTitle(form.title);
    setChapters(form.chapters);
  }, []);

  const reloadPlanFromServer = useCallback(async ({ force = false } = {}) => {
    if (!scopeKey) return;

    if (!force && isDirtyRef.current) return;

    const requestId = ++loadRequestRef.current;
    setLoadingExisting(true);
    try {
      const rows = await fetchFacultySyllabusPlans({
        academic_year_id: yearId,
        class_id: classId,
        section_id: sectionId,
        subject_id: subjectId,
      });
      if (requestId !== loadRequestRef.current) return;
      if (!force && isDirtyRef.current) return;

      const list = Array.isArray(rows) ? rows : [];
      if (list.length === 0) {
        applyPlanForm({ planId: null, title: '', chapters: [emptyChapter(1)] });
        loadedScopeRef.current = scopeKey;
        isDirtyRef.current = false;
        return;
      }

      const detail = await fetchFacultySyllabusPlanDetail(list[0].id);
      if (requestId !== loadRequestRef.current) return;
      if (!force && isDirtyRef.current) return;

      applyPlanForm(planToFormState(detail));
      loadedScopeRef.current = scopeKey;
      isDirtyRef.current = false;
    } catch {
      // Keep in-progress edits; do not wipe the form on a failed refresh.
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoadingExisting(false);
      }
    }
  }, [scopeKey, yearId, classId, sectionId, subjectId, applyPlanForm]);

  useEffect(() => {
    Promise.all([
      fetchSchoolClasses(),
      fetchAcademicYearsSchool(),
      fetchSchoolSubjects({ assignedOnly: true }),
    ])
      .then(([cls, ay, subs]) => {
        setClasses(Array.isArray(cls) ? cls : []);
        setYears(Array.isArray(ay) ? ay : []);
        setSubjects(Array.isArray(subs) ? subs : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId(null);
      return;
    }
    setLoadingSections(true);
    fetchSectionsByClass(classId)
      .then((rows) => setSections(Array.isArray(rows) ? rows : []))
      .finally(() => setLoadingSections(false));
  }, [classId]);

  useEffect(() => {
    if (!scopeKey) {
      loadedScopeRef.current = null;
      return;
    }

    if (loadedScopeRef.current === scopeKey) {
      return;
    }

    isDirtyRef.current = false;
    reloadPlanFromServer();
  }, [scopeKey, reloadPlanFromServer]);

  const usedChapterNumbers = new Set(
    chapters.map((ch) => Number(ch.chapter_number)).filter(Boolean)
  );

  const addChapter = () => {
    const num = nextChapterNumber(chapters);
    if (usedChapterNumbers.has(num)) {
      Alert.alert('Chapter exists', `Chapter ${num} is already in this plan.`);
      return;
    }
    setChapters((prev) => [...prev, emptyChapter(num)]);
    markDirty();
  };

  const addSubtopic = (chKey) => {
    markDirty();
    setChapters((prev) =>
      prev.map((ch) =>
        ch.key === chKey
          ? {
              ...ch,
              subtopics: [...ch.subtopics, emptySubtopic(String(ch.subtopics.length))],
            }
          : ch
      )
    );
  };

  const updateChapter = (chKey, patch) => {
    markDirty();
    setChapters((prev) => prev.map((ch) => (ch.key === chKey ? { ...ch, ...patch } : ch)));
  };

  const updateSubtopic = (chKey, stKey, patch) => {
    markDirty();
    setChapters((prev) =>
      prev.map((ch) =>
        ch.key === chKey
          ? {
              ...ch,
              subtopics: ch.subtopics.map((st) =>
                st.key === stKey ? { ...st, ...patch } : st
              ),
            }
          : ch
      )
    );
  };

  const handleSave = async () => {
    if (!scopeReady) {
      Alert.alert('Missing fields', 'Select academic year, class, section, and subject.');
      return;
    }
    if (hasDuplicateChapterNumbers(chapters)) {
      Alert.alert('Duplicate chapters', 'Each chapter number can appear only once.');
      return;
    }

    const payload = formStateToPayload({
      title,
      chapters,
      yearId,
      classId,
      sectionId,
      subjectId,
    });

    if (!payload.chapters.some((c) => c.subtopics.length > 0)) {
      Alert.alert('Subtopics required', 'Add at least one subtopic with a name.');
      return;
    }

    setSaving(true);
    try {
      if (existingPlanId) {
        await updateFacultySyllabusPlan(existingPlanId, payload);
        Alert.alert('Saved', 'Syllabus plan updated.');
      } else {
        const created = await createFacultySyllabusPlan(payload);
        if (created?.id) setExistingPlanId(created.id);
        Alert.alert('Saved', 'Syllabus plan saved.');
      }
      isDirtyRef.current = false;
      await reloadPlanFromServer({ force: true });
      onSaved?.();
    } catch (err) {
      const msg =
        err?.response?.data?.chapters?.[0] ||
        err?.response?.data?.detail ||
        'Could not save plan.';
      Alert.alert('Error', typeof msg === 'string' ? msg : 'Could not save plan.');
    } finally {
      setSaving(false);
    }
  };

  const yearItems = years.map((y) => ({ label: y.academic_year, value: y.id }));
  const classItems = classes.map((c) => ({ label: c.class_name, value: c.id }));
  const sectionItems = sections.map((s) => ({ label: s.section_name, value: s.id }));
  const subjectItems = subjects.map((s) => ({ label: s.subject_name, value: s.id }));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 112 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: FACULTY_BOTTOM_NAV_CLEARANCE + keyboardHeight + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Academic year</Text>
        <Dropdown
          style={styles.dropdown}
          data={yearItems}
          labelField="label"
          valueField="value"
          value={yearId}
          onChange={(i) => {
            isDirtyRef.current = false;
            loadedScopeRef.current = null;
            setYearId(i.value);
          }}
          placeholder="Select year"
        />

        <Text style={styles.label}>Class</Text>
        <Dropdown
          style={styles.dropdown}
          data={classItems}
          labelField="label"
          valueField="value"
          value={classId}
          onChange={(i) => {
            isDirtyRef.current = false;
            loadedScopeRef.current = null;
            setClassId(i.value);
            setSectionId(null);
          }}
          placeholder="Select class"
        />

        <Text style={styles.label}>Section</Text>
        {loadingSections ? (
          <ActivityIndicator color="#4f46e5" />
        ) : (
          <Dropdown
            style={styles.dropdown}
            data={sectionItems}
            labelField="label"
            valueField="value"
          value={sectionId}
          onChange={(i) => {
            isDirtyRef.current = false;
            loadedScopeRef.current = null;
            setSectionId(i.value);
          }}
          placeholder="Select section"
            disable={!classId}
          />
        )}

        <Text style={styles.label}>Subject</Text>
        <Dropdown
          style={styles.dropdown}
          data={subjectItems}
          labelField="label"
          valueField="value"
          value={subjectId}
          onChange={(i) => {
            isDirtyRef.current = false;
            loadedScopeRef.current = null;
            setSubjectId(i.value);
          }}
          placeholder="Select subject"
        />

        {loadingExisting ? (
          <View style={styles.loadingExisting}>
            <ActivityIndicator color="#4f46e5" size="small" />
            <Text style={styles.loadingExistingText}>Loading existing syllabus…</Text>
          </View>
        ) : null}

        {scopeReady && existingPlanId && !loadingExisting ? (
          <View style={styles.existingBanner}>
            <Text style={styles.existingBannerText}>
              Existing syllabus loaded for this class, section, and subject. Add subtopics to a
              chapter or create the next chapter number only.
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>Title (optional)</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(v) => {
            markDirty();
            setTitle(v);
          }}
          placeholder="Plan title"
        />

        {chapters.map((ch) => (
          <View
            key={ch.key}
            style={[styles.chapterBox, ch.isExisting && styles.chapterBoxExisting]}
          >
            <View style={styles.chapterHead}>
              <Text style={styles.chapterTitle}>Chapter {ch.chapter_number}</Text>
              {ch.isExisting ? <Text style={styles.existingTag}>Saved</Text> : null}
            </View>
            <TextInput
              style={styles.input}
              value={ch.name}
              onChangeText={(v) => updateChapter(ch.key, { name: v })}
              placeholder="Chapter name"
            />
            {ch.subtopics.map((st, stIndex) => {
              const statusStyle = statusUi(st.status);
              return (
                <View
                  key={st.key}
                  style={[
                    styles.subtopicCard,
                    statusStyle.card,
                    st.isExisting ? styles.subtopicCardExisting : styles.subtopicCardNew,
                  ]}
                >
                  <View style={styles.subtopicCardHead}>
                    <Text style={styles.subtopicCardTitle}>
                      Subtopic {stIndex + 1}
                      {st.isExisting ? ' · Saved' : ' · New'}
                    </Text>
                    <Text style={[styles.statusBadge, statusStyle.badge]}>
                      {statusStyle.label}
                    </Text>
                  </View>

                  <Text style={styles.fieldLabel}>Subtopic name</Text>
                  <TextInput
                    style={[styles.subtopicInput, st.isExisting && styles.subtopicInputExisting]}
                    value={st.name}
                    onChangeText={(v) => updateSubtopic(ch.key, st.key, { name: v })}
                    placeholder={st.isExisting ? 'Subtopic name' : 'Enter new subtopic name'}
                  />

                  <Text style={styles.fieldLabel}>Status</Text>
                  <Dropdown
                    style={[styles.subtopicDropdown, statusStyle.dropdown]}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelected}
                    data={STATUS_ITEMS}
                    labelField="label"
                    valueField="value"
                    value={st.status}
                    onChange={(i) => updateSubtopic(ch.key, st.key, { status: i.value })}
                  />
                </View>
              );
            })}
            <TouchableOpacity onPress={() => addSubtopic(ch.key)}>
              <Text style={styles.link}>+ Add subtopic</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity onPress={addChapter} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>
            + Add chapter {nextChapterNumber(chapters)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving || loadingExisting}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {existingPlanId ? 'Update syllabus plan' : 'Save syllabus plan'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <KeyboardDismissBar visible={keyboardVisible} onDismiss={dismissKeyboard} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  loadingExisting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  loadingExistingText: { fontSize: 13, color: '#64748b' },
  existingBanner: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  existingBannerText: { fontSize: 12, color: '#047857', lineHeight: 18 },
  chapterBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  chapterBoxExisting: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  chapterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chapterTitle: { fontWeight: '700', color: '#3730a3' },
  existingTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  subtopicCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  subtopicCardExisting: {
    borderStyle: 'solid',
  },
  subtopicCardNew: {
    borderStyle: 'dashed',
  },
  subtopicCardPending: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  subtopicCardInProgress: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  subtopicCardCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  subtopicCardOnHold: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  subtopicCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  subtopicCardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  statusBadgePending: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  statusBadgeInProgress: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusBadgeCompleted: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusBadgeOnHold: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  subtopicInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  subtopicInputExisting: {
    backgroundColor: '#fafafa',
  },
  subtopicDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 2,
  },
  dropdownStatusPending: {
    borderColor: '#a5b4fc',
    backgroundColor: '#eef2ff',
  },
  dropdownStatusInProgress: {
    borderColor: '#fbbf24',
    backgroundColor: '#fff7ed',
  },
  dropdownStatusCompleted: {
    borderColor: '#4ade80',
    backgroundColor: '#ecfdf5',
  },
  dropdownStatusOnHold: {
    borderColor: '#f87171',
    backgroundColor: '#fff1f2',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#94a3b8',
  },
  dropdownSelected: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  link: { color: '#4f46e5', fontWeight: '600', marginTop: 8 },
  secondaryBtn: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4f46e5',
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#4f46e5', fontWeight: '700' },
  saveBtn: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
