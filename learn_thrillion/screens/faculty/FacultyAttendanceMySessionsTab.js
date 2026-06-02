import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { fetchAttendanceSessions } from '../../utils/schoolApi';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load attendance.';
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/** Lists attendance sessions submitted by the logged-in faculty (`only_mine=true`). */
export default function FacultyAttendanceMySessionsTab({ active }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchAttendanceSessions({ only_mine: 'true' });
      setSessions(normalizeList(data));
    } catch (e) {
      setError(formatApiError(e));
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      setLoading(true);
      load();
    }
  }, [active, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const toggleExpand = (id) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.muted}>Loading your sessions…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803d" />}
    >
      {error ? <Text style={styles.banner}>{error}</Text> : null}

      {sessions.length === 0 && !loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptySub}>
            When you submit attendance from the &quot;Mark&quot; tab, those sessions will appear here.
          </Text>
        </View>
      ) : null}

      {sessions.map((s) => {
        const id = String(s.id);
        const open = expandedId === id;
        const records = Array.isArray(s.attendance_records) ? s.attendance_records : [];
        const present = records.filter((r) => r.status === 'PRESENT').length;
        return (
          <View key={id} style={styles.sessionCard}>
            <TouchableOpacity onPress={() => toggleExpand(id)} activeOpacity={0.85}>
              <Text style={styles.sessionTitle}>
                {s.session_date || '—'} · {s.session_type || '—'}
              </Text>
              <Text style={styles.sessionMeta}>
                {(s.class_name_details || 'Class')} · {s.section_name_details || 'Section'}
              </Text>
              <Text style={styles.sessionCount}>
                {records.length} student{records.length === 1 ? '' : 's'} · {present} present
              </Text>
              <Text style={styles.tapHint}>{open ? 'Hide students ▲' : 'Show students ▼'}</Text>
            </TouchableOpacity>

            {open ? (
              <View style={styles.records}>
                {records.map((r) => (
                  <View key={String(r.id)} style={styles.recRow}>
                    <Text style={styles.recName} numberOfLines={2}>
                      {r.student_name || 'Student'}
                    </Text>
                    <View style={[styles.badge, r.status === 'PRESENT' ? styles.badgeOn : styles.badgeOff]}>
                      <Text style={styles.badgeTxt}>{r.status || '—'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  muted: { marginTop: 10, color: '#6b7280', fontSize: 14 },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#14532d', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  sessionTitle: { fontSize: 16, fontWeight: '800', color: '#14532d' },
  sessionMeta: { fontSize: 14, color: '#374151', marginTop: 4 },
  sessionCount: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  tapHint: { fontSize: 12, color: '#15803d', fontWeight: '700', marginTop: 8 },
  records: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  recName: { flex: 1, fontSize: 15, color: '#111827', paddingRight: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOn: { backgroundColor: '#bbf7d0' },
  badgeOff: { backgroundColor: '#fecaca' },
  badgeTxt: { fontSize: 12, fontWeight: '800', color: '#14532d' },
});
