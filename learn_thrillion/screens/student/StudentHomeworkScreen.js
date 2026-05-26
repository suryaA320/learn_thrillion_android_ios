import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import DatePickerField, { formatLocalYMD } from '../../components/DatePickerField';
import { fetchStudentHomework } from '../../utils/schoolApi';
import { useStudentPortal } from '../../context/StudentPortalContext';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load homework.';
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function StudentHomeworkScreen() {
  const { profile, loading: profileLoading, error: portalError } = useStudentPortal();
  const profileReady = !!(profile?.class_id && profile?.section_id);
  const [selectedDate, setSelectedDate] = useState(() => formatLocalYMD(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ silent } = {}) => {
      if (!profileReady) {
        setRefreshing(false);
        if (profileLoading) {
          if (!silent) setLoading(true);
        } else {
          setRows([]);
          setError('');
          if (!silent) setLoading(false);
        }
        return;
      }
      if (!silent) setLoading(true);
      setError('');
      try {
        const raw = await fetchStudentHomework({
          date: selectedDate,
          class_id: profile.class_id,
          section_id: profile.section_id,
        });
        setRows(Array.isArray(raw) ? raw : []);
      } catch (e) {
        setError(formatApiError(e));
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, profileReady, profileLoading, profile]
  );

  useEffect(() => {
    if (!selectedDate) return;
    load();
  }, [selectedDate, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
  };

  const banner = portalError || error;
  const waitingProfile = profileLoading && !portalError && !profileReady;

  if ((waitingProfile || (loading && rows.length === 0)) && !banner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.flex}>
          <TopNavigationStylish title="Homework" />
          <View style={styles.pickerWrap}>
            <DatePickerField label="Posted on" value={selectedDate} onChangeValue={setSelectedDate} placeholder="Select date" />
          </View>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#15803d" />
            <Text style={styles.muted}>
              {waitingProfile ? 'Loading your class and section…' : 'Loading homework for your class…'}
            </Text>
          </View>
          <StudentBottomNav />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Homework" />
        <View style={styles.pickerWrap}>
          <DatePickerField label="Posted on" value={selectedDate} onChangeValue={setSelectedDate} placeholder="Select date" />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803d" />}
        >
          <Text style={styles.hint}>
            Homework assigned to your class and section that was posted on the selected calendar day.
          </Text>
          {profileReady ? (
            <Text style={styles.classLine}>
              {profile.class_name || 'Class'} · {profile.section_name || 'Section'}
            </Text>
          ) : null}
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          {rows.length === 0 && !banner && !loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No homework for this date</Text>
              <Text style={styles.emptySub}>Try another day or pull down to refresh.</Text>
            </View>
          ) : null}

          {rows.map((row) => (
            <View key={String(row.id)} style={styles.card}>
              <Text style={styles.subject}>{row.subject_name || 'Subject'}</Text>
              {row.title ? <Text style={styles.title}>{row.title}</Text> : null}
              <Text style={styles.meta}>
                {row.class_name || '—'} · {row.section_name || '—'} · {row.academic_year_label || '—'}
              </Text>
              {row.added_by_name ? <Text style={styles.meta}>By {row.added_by_name}</Text> : null}
              <Text style={styles.meta}>Posted {formatWhen(row.created_at)}</Text>
              <Text style={styles.body}>{row.homework_details || '—'}</Text>
            </View>
          ))}
        </ScrollView>
        <StudentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ecfdf5' },
  flex: { flex: 1 },
  pickerWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 10, color: '#6b7280', fontSize: 14 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 6, lineHeight: 18 },
  classLine: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 10 },
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
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#14532d' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subject: { fontSize: 16, fontWeight: '800', color: '#14532d' },
  title: { marginTop: 4, fontSize: 15, fontWeight: '700', color: '#166534' },
  meta: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  body: { marginTop: 10, fontSize: 14, color: '#374151', lineHeight: 20 },
});
