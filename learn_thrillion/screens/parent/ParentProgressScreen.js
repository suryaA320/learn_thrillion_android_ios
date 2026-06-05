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
import ParentBottomNav from '../../components/ParentBottomNav';
import ParentChildPicker from '../../components/ParentChildPicker';
import { fetchParentExams, fetchParentProgress } from '../../utils/schoolApi';
import { useParentPortal } from '../../context/ParentPortalContext';

const ACCENT = '#4f46e5';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load progress report.';
}

export default function ParentProgressScreen() {
  const { selectedStudentId, loading: portalLoading, error: portalError } = useParentPortal();
  const [examsLoading, setExamsLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [examsError, setExamsError] = useState('');
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressError, setProgressError] = useState('');

  const loadExams = useCallback(async () => {
    if (!selectedStudentId) {
      setExams([]);
      setExamsLoading(false);
      return;
    }
    setExamsError('');
    try {
      const raw = await fetchParentExams(selectedStudentId);
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
  }, [selectedStudentId]);

  const loadProgress = useCallback(
    async (examId) => {
      if (!examId || !selectedStudentId) {
        setProgress(null);
        setProgressError('');
        return;
      }
      setProgressLoading(true);
      setProgressError('');
      try {
        const data = await fetchParentProgress(selectedStudentId, examId);
        setProgress(data);
      } catch (e) {
        setProgress(null);
        setProgressError(formatApiError(e));
      } finally {
        setProgressLoading(false);
      }
    },
    [selectedStudentId]
  );

  useFocusEffect(
    useCallback(() => {
      if (portalLoading) return;
      setExamsLoading(true);
      loadExams();
    }, [loadExams, portalLoading])
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
        <TopNavigationStylish title="Progress report" />
        <ParentChildPicker />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
        >
          <Text style={styles.hint}>Choose an exam to view your child&apos;s marks.</Text>
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          {examsLoading ? (
            <View style={styles.inlineLoad}>
              <ActivityIndicator color={ACCENT} />
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
                const ay = ex.academic_year_name || ex.academic_year || '';
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.examChip, active && styles.examChipActive]}
                    onPress={() => setSelectedExamId(id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.examChipTxt, active && styles.examChipTxtActive]}>
                      {label}
                    </Text>
                    {ay ? (
                      <Text style={[styles.examChipSub, active && styles.examChipSubActive]}>
                        {ay}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {progressLoading ? (
            <View style={styles.inlineLoad}>
              <ActivityIndicator color={ACCENT} />
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
              <Text style={[styles.result, s.result === 'FAIL' && styles.resultFail]}>
                {s.result || '—'}
              </Text>
            </View>
          ))}
        </ScrollView>
        <ParentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f3ff' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 18 },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  muted: { marginTop: 8, color: '#64748b', fontSize: 13 },
  inlineLoad: { alignItems: 'center', paddingVertical: 16 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#3730a3' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#64748b', lineHeight: 18 },
  examList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  examChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  examChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  examChipTxt: { fontSize: 13, fontWeight: '700', color: '#3730a3' },
  examChipTxtActive: { color: '#fff' },
  examChipSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  examChipSubActive: { color: '#e0e7ff' },
  summaryCard: {
    backgroundColor: '#e0e7ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  summaryLine: { fontSize: 14, color: '#3730a3', marginBottom: 4 },
  summaryBold: { fontSize: 16, fontWeight: '800', color: '#4f46e5', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  subject: { fontSize: 15, fontWeight: '800', color: '#3730a3' },
  meta: { marginTop: 6, fontSize: 13, color: '#64748b' },
  result: { marginTop: 6, fontSize: 14, fontWeight: '700', color: ACCENT },
  resultFail: { color: '#dc2626' },
});
