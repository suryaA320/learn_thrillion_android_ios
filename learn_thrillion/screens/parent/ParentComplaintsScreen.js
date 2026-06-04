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
import ParentBottomNav from '../../components/ParentBottomNav';
import ParentChildPicker from '../../components/ParentChildPicker';
import { fetchParentComplaints } from '../../utils/schoolApi';
import { useParentPortal } from '../../context/ParentPortalContext';

const ACCENT = '#0f766e';

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

export default function ParentComplaintsScreen() {
  const {
    profile,
    selectedStudentId,
    loading: portalLoading,
    error: portalError,
  } = useParentPortal();
  const profileReady = !!(profile?.student_id && selectedStudentId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!selectedStudentId) {
      setRefreshing(false);
      setRows([]);
      setLoading(false);
      return;
    }
    if (!profileReady) {
      setRefreshing(false);
      if (portalLoading) setLoading(true);
      else {
        setRows([]);
        setError('');
        setLoading(false);
      }
      return;
    }
    setError('');
    try {
      const raw = await fetchParentComplaints(selectedStudentId);
      setRows(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError(formatApiError(e));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileReady, portalLoading, selectedStudentId]);

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
  const waitingProfile = portalLoading && !portalError && !profileReady;

  if ((waitingProfile || (loading && rows.length === 0)) && !banner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.flex}>
          <TopNavigationStylish title="Complaints" />
          <ParentChildPicker />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.muted}>Loading complaints…</Text>
          </View>
          <ParentBottomNav />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Complaints" />
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
          <Text style={styles.hint}>Complaints on file for your linked student.</Text>
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          {rows.length === 0 && !banner ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No complaints</Text>
              <Text style={styles.emptySub}>There are no complaints for this student.</Text>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  subject: { fontSize: 16, fontWeight: '800', color: '#134e4a' },
  meta: { marginTop: 6, fontSize: 12, color: '#64748b' },
  body: { marginTop: 10, fontSize: 14, color: '#374151', lineHeight: 20 },
});
