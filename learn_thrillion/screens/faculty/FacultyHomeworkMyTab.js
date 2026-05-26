import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { fetchFacultyHomework, deleteFacultyHomework } from '../../utils/schoolApi';

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

export default function FacultyHomeworkMyTab({ active, reloadTick }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const raw = await fetchFacultyHomework();
      setRows(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError(formatApiError(e));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    load();
  }, [active, reloadTick, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const confirmDelete = (row) => {
    Alert.alert('Delete homework', 'Remove this homework entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(row.id);
          try {
            await deleteFacultyHomework(row.id);
            setRows((prev) => prev.filter((r) => r.id !== row.id));
          } catch (e) {
            Alert.alert('Error', formatApiError(e));
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  if (loading && rows.length === 0 && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.muted}>Loading your homework…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803d" />}
    >
      <Text style={styles.hint}>Only homework you created for your school is listed here.</Text>
      {error ? <Text style={styles.banner}>{error}</Text> : null}

      {rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No homework yet</Text>
          <Text style={styles.emptySub}>Create homework from the other tab.</Text>
        </View>
      ) : (
        rows.map((row) => (
          <View key={String(row.id)} style={styles.card}>
            <Text style={styles.subject}>{row.subject_name || 'Subject'}</Text>
            {row.title ? <Text style={styles.title}>{row.title}</Text> : null}
            <Text style={styles.meta}>
              {row.class_name || '—'} · {row.section_name || '—'} · {row.academic_year_label || '—'}
            </Text>
            <Text style={styles.meta}>Added {formatWhen(row.created_at)}</Text>
            <Text style={styles.body}>{row.homework_details || '—'}</Text>
            <TouchableOpacity
              style={[styles.delBtn, deletingId === row.id && styles.delBtnOff]}
              disabled={deletingId === row.id}
              onPress={() => confirmDelete(row)}
            >
              <Text style={styles.delBtnTxt}>{deletingId === row.id ? 'Deleting…' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subject: { fontSize: 17, fontWeight: '800', color: '#14532d' },
  title: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 4 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  body: {
    marginTop: 10,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  delBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  delBtnOff: { opacity: 0.6 },
  delBtnTxt: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
});
