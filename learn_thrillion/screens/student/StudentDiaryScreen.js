import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePickerField, { formatLocalYMD } from '../../components/DatePickerField';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import { fetchSchoolSubjects, fetchStudentHomework } from '../../utils/schoolApi';
import { useStudentPortal } from '../../context/StudentPortalContext';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load diary.';
}

function asArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

/** Build display lines for all homework items for one subject on the chosen day. */
function formatHomeworkBlocks(items) {
  if (!items || items.length === 0) return '';
  return items
    .map((h) => {
      const title = (h.title || '').trim();
      const detail = (h.homework_details || '').trim();
      if (title && detail) return `${title}\n${detail}`;
      return title || detail || '—';
    })
    .join('\n\n—\n\n');
}

export default function StudentDiaryScreen() {
  const { profile, loading: profileLoading, error: portalError } = useStudentPortal();
  const profileReady = !!(profile?.class_id && profile?.section_id);
  const [date, setDate] = useState(() => formatLocalYMD(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [homework, setHomework] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ silent } = {}) => {
      if (!date) return;
      if (!profileReady) {
        setRefreshing(false);
        if (profileLoading) {
          if (!silent) setLoading(true);
        } else {
          setSubjects([]);
          setHomework([]);
          if (!silent) setLoading(false);
        }
        return;
      }
      if (!silent) setLoading(true);
      setError('');
      try {
        const [subjectsRaw, hwRaw] = await Promise.all([
          fetchSchoolSubjects(),
          fetchStudentHomework({
            date,
            class_id: profile.class_id,
            section_id: profile.section_id,
          }),
        ]);
        setSubjects(asArray(subjectsRaw));
        setHomework(asArray(hwRaw));
      } catch (e) {
        setError(formatApiError(e));
        setSubjects([]);
        setHomework([]);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [date, profileReady, profileLoading, profile]
  );

  useEffect(() => {
    if (!date) return;
    load();
  }, [date, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
  };

  const rows = useMemo(() => {
    const hwList = homework;
    const bySubjectId = new Map();
    for (const h of hwList) {
      const sid = h.subject_id != null ? String(h.subject_id) : '';
      if (!sid) continue;
      if (!bySubjectId.has(sid)) bySubjectId.set(sid, []);
      bySubjectId.get(sid).push(h);
    }

    let list = [...subjects].filter((s) => s && (s.id != null || s.subject_name));
    list.sort((a, b) =>
      String(a.subject_name || '').localeCompare(String(b.subject_name || ''), undefined, {
        sensitivity: 'base',
      })
    );

    if (list.length === 0) {
      const seen = new Set();
      for (const h of hwList) {
        const sid = h.subject_id != null ? String(h.subject_id) : '';
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        list.push({
          id: h.subject_id,
          subject_name: h.subject_name || 'Subject',
        });
      }
      list.sort((a, b) =>
        String(a.subject_name || '').localeCompare(String(b.subject_name || ''), undefined, {
          sensitivity: 'base',
        })
      );
    }

    return list.map((sub) => {
      const sid = sub.id != null ? String(sub.id) : '';
      const items = sid ? bySubjectId.get(sid) || [] : [];
      const text = formatHomeworkBlocks(items);
      return { key: sid || sub.subject_name, subjectName: sub.subject_name || 'Subject', homeworkText: text };
    });
  }, [subjects, homework]);

  const banner = portalError || error;
  const waitingProfile = profileLoading && !portalError && !profileReady;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Diary" />

        <View style={styles.topCard}>
          <Text style={styles.topCardTitle}>Select date</Text>
          <DatePickerField value={date} onChangeValue={setDate} placeholder="YYYY-MM-DD" />
        </View>

        {(waitingProfile || (loading && !banner)) ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.muted}>
              {waitingProfile ? 'Loading your class and section…' : 'Loading subjects and homework…'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
          >
            <Text style={styles.hint}>
              All subjects for your school are listed for the day you pick. Homework posted for{' '}
              {profileReady
                ? `${profile.class_name || 'your class'} · ${profile.section_name || 'section'}`
                : 'your class'}{' '}
              on that date appears on the right.
            </Text>
            {banner ? <Text style={styles.banner}>{banner}</Text> : null}

            {!banner && rows.length === 0 && !loading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No subjects</Text>
                <Text style={styles.emptySub}>Your school has not added subjects yet, or nothing could be loaded.</Text>
              </View>
            ) : null}

            {!banner &&
              rows.map((row) => (
                <View key={row.key} style={styles.row}>
                  <View style={styles.colLeft}>
                    <Text style={styles.subjectName} numberOfLines={4}>
                      {row.subjectName}
                    </Text>
                  </View>
                  <View style={styles.colRight}>
                    {row.homeworkText ? (
                      <Text style={styles.homeworkText}>{row.homeworkText}</Text>
                    ) : (
                      <Text style={styles.noHomework}>No Homework</Text>
                    )}
                  </View>
                </View>
              ))}
          </ScrollView>
        )}
        <StudentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eef2ff' },
  flex: { flex: 1 },
  topCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 10, color: '#6b7280', fontSize: 14 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 18 },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#3730a3' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  colLeft: {
    width: '34%',
    maxWidth: 140,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#f5f3ff',
    borderRightWidth: 1,
    borderRightColor: '#c7d2fe',
    justifyContent: 'center',
  },
  colRight: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3730a3',
    lineHeight: 20,
  },
  homeworkText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 21,
  },
  noHomework: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
