import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from 'react-native-paper';
import {
  fetchSchoolClasses,
  fetchSchoolSubjects,
  createStudyMaterialWritten,
} from '../../utils/schoolApi';

/** Space for absolute faculty bottom nav (height + margins). */
const BOTTOM_NAV_CLEARANCE = 120;

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Request failed';
}

export default function FacultyStudyMaterialWriteTab({ onSuccess }) {
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [chapter, setChapter] = useState('');
  const [lesson, setLesson] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBoot(true);
      try {
        const [cls, subs] = await Promise.all([
          fetchSchoolClasses(),
          fetchSchoolSubjects({ assignedOnly: true }),
        ]);
        if (!cancelled) {
          setClasses(Array.isArray(cls) ? cls : []);
          setSubjects(Array.isArray(subs) ? subs : []);
        }
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
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollNotesIntoView = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 280 : 120);
  };

  const classData = classes.map((c) => ({
    value: c.id,
    label: c.class_name || String(c.id),
  }));
  const subjectData = subjects.map((s) => ({
    value: s.id,
    label: s.subject_name || String(s.id),
  }));

  const onSubmit = async () => {
    setFormError('');
    if (!selectedClass || !selectedSubject || !chapter.trim() || !lesson.trim() || !title.trim() || !notes.trim()) {
      setFormError('Fill class, subject, chapter, lesson, title, and notes.');
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await createStudyMaterialWritten({
        class_id: selectedClass,
        subject: selectedSubject,
        chapter_number: chapter.trim(),
        lesson_number: lesson.trim(),
        title: title.trim(),
        notes: notes.trim(),
      });
      Alert.alert('Saved', 'Written study material saved for the selected class.');
      setChapter('');
      setLesson('');
      setTitle('');
      setNotes('');
      onSuccess?.();
    } catch (e) {
      setFormError(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBoot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 112 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BOTTOM_NAV_CLEARANCE + keyboardHeight + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Text style={styles.label}>Class</Text>
        <Dropdown
          data={classData}
          labelField="label"
          valueField="value"
          placeholder="Select class"
          value={selectedClass}
          onChange={(item) => setSelectedClass(item.value)}
          style={styles.dropdown}
        />
        <Text style={styles.label}>Subject</Text>
        <Dropdown
          data={subjectData}
          labelField="label"
          valueField="value"
          placeholder="Select subject"
          value={selectedSubject}
          onChange={(item) => setSelectedSubject(item.value)}
          style={styles.dropdown}
        />
        <Text style={styles.label}>Chapter number</Text>
        <TextInput style={styles.input} value={chapter} onChangeText={setChapter} keyboardType="default" />
        <Text style={styles.label}>Lesson number</Text>
        <TextInput style={styles.input} value={lesson} onChangeText={setLesson} />
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} returnKeyType="next" />
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          onFocus={scrollNotesIntoView}
          multiline
          numberOfLines={6}
          placeholder="Enter study notes for students…"
          placeholderTextColor="#94a3b8"
          textAlignVertical="top"
        />
        <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting} buttonColor="#4f46e5">
          Save written content
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: '600', color: '#3730a3', marginBottom: 6, marginTop: 10 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  notes: { minHeight: 140 },
  error: { color: '#b91c1c', marginBottom: 8 },
});
