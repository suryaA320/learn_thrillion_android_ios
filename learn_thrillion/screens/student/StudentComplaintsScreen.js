import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import { fetchStudentComplaints } from '../../utils/schoolApi';
import { useStudentPortal } from '../../context/StudentPortalContext';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load complaints.';
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

export default function StudentComplaintsScreen() {
  const { profile, loading: profileLoading, error: portalError } = useStudentPortal();
  const profileReady = !!(profile?.student_id);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profileReady) {
      setRefreshing(false);
      if (profileLoading) {
        setLoading(true);
      } else {
        setRows([]);
        setError('');
        setLoading(false);
      }
      return;
    }
    setError('');
    try {
      const raw = await fetchStudentComplaints({ student_id: profile.student_id });
      setRows(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError(formatApiError(e));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileReady, profileLoading, profile]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const banner = portalError || error;
  const waitingProfile = profileLoading && !portalError && !profileReady;

  if ((waitingProfile || (loading && rows.length === 0)) && !banner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.flex}>
          <TopNavigationStylish title="Complaints" />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#15803d" />
            <Text style={styles.muted}>
              {waitingProfile ? 'Loading your student profile…' : 'Loading your complaints…'}
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
        <TopNavigationStylish title="Complaints" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803d" />}
        >
          <Text style={styles.hint}>Complaints linked to your student record at this school.</Text>
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          {rows.length === 0 && !banner ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No complaints</Text>
              <Text style={styles.emptySub}>You do not have any complaints on file.</Text>
            </View>
          ) : null}

          {rows.map((row) => (
            <View key={String(row.id)} style={styles.card}>
              <Text style={styles.subject}>{row.subject || 'Complaint'}</Text>
              <Text style={styles.meta}>Logged {formatWhen(row.created_at)}</Text>
              <Text style={styles.body}>{row.complaint_details || '—'}</Text>
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
  meta: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  body: { marginTop: 10, fontSize: 14, color: '#374151', lineHeight: 20 },
});
