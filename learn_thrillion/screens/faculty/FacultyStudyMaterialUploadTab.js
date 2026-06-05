import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import {
  fetchSchoolClasses,
  fetchSchoolSubjects,
  createStudyMaterialUpload,
} from '../../utils/schoolApi';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Request failed';
}

export default function FacultyStudyMaterialUploadTab({ onSuccess }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [chapter, setChapter] = useState('');
  const [lesson, setLesson] = useState('');
  const [title, setTitle] = useState('');
  const [pickedFile, setPickedFile] = useState(null);
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

  const classData = classes.map((c) => ({
    value: c.id,
    label: c.class_name || String(c.id),
  }));
  const subjectData = subjects.map((s) => ({
    value: s.id,
    label: s.subject_name || String(s.id),
  }));

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset) setPickedFile(asset);
    } catch (e) {
      Alert.alert('File picker', e?.message || 'Could not pick a file.');
    }
  };

  const onSubmit = async () => {
    setFormError('');
    if (!selectedClass || !selectedSubject || !chapter.trim() || !lesson.trim() || !pickedFile) {
      setFormError('Select class, subject, chapter, lesson, and a file.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('content_type', 'upload');
      fd.append('class_id', selectedClass);
      fd.append('subject', selectedSubject);
      fd.append('chapter_number', chapter.trim());
      fd.append('lesson_number', lesson.trim());
      if (title.trim()) fd.append('title', title.trim());
      fd.append('file', {
        uri: pickedFile.uri,
        name: pickedFile.name || 'upload',
        type: pickedFile.mimeType || 'application/octet-stream',
      });
      await createStudyMaterialUpload(fd);
      Alert.alert('Uploaded', 'File saved for the selected class.');
      setChapter('');
      setLesson('');
      setTitle('');
      setPickedFile(null);
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
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
      <TextInput style={styles.input} value={chapter} onChangeText={setChapter} />
      <Text style={styles.label}>Lesson number</Text>
      <TextInput style={styles.input} value={lesson} onChangeText={setLesson} />
      <Text style={styles.label}>Title (optional)</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
        <Text style={styles.fileBtnText}>{pickedFile?.name || 'Choose file to upload'}</Text>
      </TouchableOpacity>
      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting} buttonColor="#4f46e5">
        Upload content
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24 },
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
  fileBtn: {
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 10,
    padding: 14,
    marginVertical: 12,
    backgroundColor: '#f5f3ff',
  },
  fileBtnText: { color: '#3730a3', fontWeight: '600', textAlign: 'center' },
  error: { color: '#b91c1c', marginBottom: 8 },
});
