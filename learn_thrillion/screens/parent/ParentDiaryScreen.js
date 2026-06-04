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
import ParentBottomNav from '../../components/ParentBottomNav';
import ParentChildPicker from '../../components/ParentChildPicker';
import { fetchParentHomework } from '../../utils/schoolApi';
import { useParentPortal } from '../../context/ParentPortalContext';

const ACCENT = '#0f766e';

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

export default function ParentDiaryScreen() {
  const { profile, selectedStudentId, loading: portalLoading, error: portalError } = useParentPortal();
  const profileReady = !!(profile?.class_id && profile?.section_id && selectedStudentId);
  const [date, setDate] = useState(() => formatLocalYMD(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homework, setHomework] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ silent } = {}) => {
      if (!date || !selectedStudentId) return;
      if (!profileReady) {
        setRefreshing(false);
        if (!portalLoading) {
          setHomework([]);
          if (!silent) setLoading(false);
        }
        return;
      }
      if (!silent) setLoading(true);
      setError('');
      try {
        const hwRaw = await fetchParentHomework(selectedStudentId, { date });
        setHomework(asArray(hwRaw));
      } catch (e) {
        setError(formatApiError(e));
        setHomework([]);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [date, profileReady, portalLoading, selectedStudentId]
  );

  useEffect(() => {
    if (date) load();
  }, [date, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
  };

  const rows = useMemo(() => {
    const bySubjectId = new Map();
    for (const h of homework) {
      const sid = h.subject_id != null ? String(h.subject_id) : '';
      if (!sid) continue;
      if (!bySubjectId.has(sid)) bySubjectId.set(sid, []);
      bySubjectId.get(sid).push(h);
    }
    const seen = new Set();
    const list = [];
    for (const h of homework) {
      const sid = h.subject_id != null ? String(h.subject_id) : '';
      if (!sid || seen.has(sid)) continue;
      seen.add(sid);
      list.push({
        key: sid,
        subjectName: h.subject_name || 'Subject',
        homeworkText: formatHomeworkBlocks(bySubjectId.get(sid) || []),
      });
    }
    list.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    return list;
  }, [homework]);

  const banner = portalError || error;
  const waitingProfile = portalLoading && !portalError && !profileReady;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Diary" />
        <ParentChildPicker />
        <View style={styles.topCard}>
          <Text style={styles.topCardTitle}>Select date</Text>
          <DatePickerField value={date} onChangeValue={setDate} placeholder="YYYY-MM-DD" />
        </View>

        {(waitingProfile || (loading && !banner)) ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.muted}>Loading diary…</Text>
          </View>
        ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
            }
          >
            <Text style={styles.hint}>
              Homework for{' '}
              {profileReady
                ? `${profile.class_name || 'class'} · ${profile.section_name || 'section'}`
                : 'your child'}{' '}
              on the selected date.
            </Text>
            {banner ? <Text style={styles.banner}>{banner}</Text> : null}

            {!banner && rows.length === 0 && !loading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No homework</Text>
                <Text style={styles.emptySub}>Nothing was posted for this date.</Text>
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
        <ParentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdfa' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 10, color: '#64748b', fontSize: 14 },
  topCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  topCardTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 8 },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 18 },
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
    borderColor: '#ccfbf1',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#134e4a' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#64748b', lineHeight: 18 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    overflow: 'hidden',
  },
  colLeft: {
    width: '38%',
    backgroundColor: '#ccfbf1',
    padding: 12,
    justifyContent: 'center',
  },
  colRight: { flex: 1, padding: 12, justifyContent: 'center' },
  subjectName: { fontSize: 14, fontWeight: '800', color: '#134e4a' },
  homeworkText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  noHomework: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
});
