import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import { fetchStudentExams, fetchStudentProgress } from '../../utils/schoolApi';
import { useStudentPortal } from '../../context/StudentPortalContext';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load progress.';
}

export default function StudentProgressScreen() {
  const { error: portalError } = useStudentPortal();
  const [examsLoading, setExamsLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [examsError, setExamsError] = useState('');
  const [selectedExamId, setSelectedExamId] = useState(null);

  const [progressLoading, setProgressLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressError, setProgressError] = useState('');

  const loadExams = useCallback(async () => {
    setExamsError('');
    try {
      const raw = await fetchStudentExams();
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setExams(list);
      setSelectedExamId((prev) => {
        if (prev && list.some((e) => String(e.id) === String(prev))) return prev;
        return list.length ? String(list[0].id) : null;
      });
    } catch (e) {
      setExamsError(formatApiError(e));
      setExams([]);
      setSelectedExamId(null);
    } finally {
      setExamsLoading(false);
    }
  }, []);

  const loadProgress = useCallback(async (examId) => {
    if (!examId) {
      setProgress(null);
      setProgressError('');
      return;
    }
    setProgressLoading(true);
    setProgressError('');
    try {
      const data = await fetchStudentProgress(examId);
      setProgress(data);
    } catch (e) {
      setProgress(null);
      setProgressError(formatApiError(e));
    } finally {
      setProgressLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setExamsLoading(true);
      loadExams();
    }, [loadExams])
  );

  useEffect(() => {
    if (selectedExamId) loadProgress(selectedExamId);
    else {
      setProgress(null);
      setProgressError('');
    }
  }, [selectedExamId, loadProgress]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadExams();
    if (selectedExamId) await loadProgress(selectedExamId);
    setRefreshing(false);
  };

  const banner = portalError || examsError;
  const subjects = Array.isArray(progress?.subjects) ? progress.subjects : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Progress" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
        >
          <Text style={styles.hint}>Choose a school exam, then view your marks for that exam.</Text>
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          {examsLoading ? (
            <View style={styles.inlineLoad}>
              <ActivityIndicator color="#4f46e5" />
              <Text style={styles.muted}>Loading exams…</Text>
            </View>
          ) : exams.length === 0 && !banner ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No exams</Text>
              <Text style={styles.emptySub}>Your school has not published examinations yet.</Text>
            </View>
          ) : (
            <View style={styles.examList}>
              {exams.map((ex) => {
                const id = String(ex.id);
                const active = selectedExamId === id;
                const label = ex.examination_name || 'Exam';
                const ay = ex.academic_year_name || '';
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.examChip, active && styles.examChipActive]}
                    onPress={() => setSelectedExamId(id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.examChipTxt, active && styles.examChipTxtActive]}>{label}</Text>
                    {ay ? <Text style={[styles.examChipSub, active && styles.examChipSubActive]}>{ay}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {progressLoading ? (
            <View style={styles.inlineLoad}>
              <ActivityIndicator color="#4f46e5" />
              <Text style={styles.muted}>Loading marks…</Text>
            </View>
          ) : null}

          {progressError ? <Text style={styles.banner}>{progressError}</Text> : null}

          {progress && !progressLoading ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLine}>
                Total: {progress.total_obtained ?? '—'} / {progress.total_max ?? '—'}
              </Text>
              <Text style={styles.summaryLine}>Percentage: {progress.percentage ?? '—'}%</Text>
              <Text style={styles.summaryBold}>Overall: {progress.overall_result ?? '—'}</Text>
            </View>
          ) : null}

          {subjects.map((s, idx) => (
            <View key={`${s.subject_name}-${idx}`} style={styles.card}>
              <Text style={styles.subject}>{s.subject_name || 'Subject'}</Text>
              <Text style={styles.meta}>
                Marks: {s.marks_obtained ?? '—'} / {s.max_marks ?? '—'}
              </Text>
              <Text style={[styles.result, s.result === 'FAIL' && styles.resultFail]}>{s.result || '—'}</Text>
            </View>
          ))}

          {progress && !progressLoading && subjects.length === 0 && !progressError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No marks yet</Text>
              <Text style={styles.emptySub}>Marks for this exam have not been entered for your profile.</Text>
            </View>
          ) : null}
        </ScrollView>
        <StudentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eef2ff' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 18 },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  inlineLoad: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  muted: { color: '#6b7280', fontSize: 13 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#3730a3' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  examList: { marginBottom: 12 },
  examChip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  examChipActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#e0e7ff',
  },
  examChipTxt: { fontSize: 15, fontWeight: '700', color: '#4338ca' },
  examChipTxtActive: { color: '#3730a3' },
  examChipSub: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  examChipSubActive: { color: '#4f46e5' },
  summaryCard: {
    backgroundColor: '#3730a3',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  summaryLine: { fontSize: 14, color: '#eef2ff', marginBottom: 4 },
  summaryBold: { fontSize: 16, fontWeight: '800', color: '#fef9c3', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subject: { fontSize: 16, fontWeight: '800', color: '#3730a3' },
  meta: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  result: { marginTop: 8, fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  resultFail: { color: '#b45309' },
});
