import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { fetchMyComplaints } from '../../utils/schoolApi';

const PAGE_SIZE = 10;

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load complaints.';
}

function normalizePage(res) {
  if (Array.isArray(res)) {
    return { results: res, count: res.length };
  }
  const results = Array.isArray(res?.results) ? res.results : [];
  const count = Number(res?.count);
  return { results, count: Number.isFinite(count) ? count : results.length };
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

export default function FacultyComplaintsMyTab({ active, reloadTick }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (filter !== 'all') params.filter = filter;
      if (search.trim()) params.q = search.trim();
      const raw = await fetchMyComplaints(params);
      const { results, count } = normalizePage(raw);
      setRows(results);
      setTotal(count);
    } catch (e) {
      setError(formatApiError(e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    load();
  }, [active, reloadTick, page, filter, search, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const setFilterAndReset = (f) => {
    setFilter(f);
    setPage(1);
  };

  const canNext = page * PAGE_SIZE < total;
  const staffNote =
    'School heads and admins see complaints for the whole school. Faculty see only complaints they raised.';

  if (loading && rows.length === 0 && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.muted}>Loading complaints…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
    >
      <Text style={styles.hint}>{staffNote}</Text>

      {error ? <Text style={styles.banner}>{error}</Text> : null}

      <View style={styles.filterRow}>
        {['today', 'week', 'month', 'all'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipOn]}
            onPress={() => setFilterAndReset(f)}
          >
            <Text style={[styles.filterChipTxt, filter === f && styles.filterChipTxtOn]}>
              {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'Week' : 'Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search subject, student, class…"
        value={search}
        onChangeText={(t) => {
          setSearch(t);
          setPage(1);
        }}
        placeholderTextColor="#9ca3af"
      />

      {rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No complaints</Text>
          <Text style={styles.emptySub}>Nothing matches these filters yet.</Text>
        </View>
      ) : (
        rows.map((row) => (
          <View key={String(row.id)} style={styles.card}>
            <Text style={styles.when}>{formatWhen(row.created_at)}</Text>
            <Text style={styles.line}>
              <Text style={styles.lbl}>Student: </Text>
              {[row.student_first_name, row.student_last_name].filter(Boolean).join(' ') || '—'}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.lbl}>Class / section: </Text>
              {row.class_name || '—'} / {row.section_name || '—'}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.lbl}>Year: </Text>
              {row.academic_year_label || '—'}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.lbl}>Subject: </Text>
              {row.subject || '—'}
            </Text>
            <Text style={styles.detail}>{row.complaint_details || ''}</Text>
          </View>
        ))
      )}

      {total > 0 ? (
        <View style={styles.pager}>
          <Text style={styles.pagerInfo}>
            Page {page} · {total} total
          </Text>
          <View style={styles.pagerBtns}>
            <TouchableOpacity
              style={[styles.pgBtn, page <= 1 && styles.pgBtnOff]}
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Text style={styles.pgBtnTxt}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pgBtn, !canNext && styles.pgBtnOff]}
              disabled={!canNext}
              onPress={() => setPage((p) => p + 1)}
            >
              <Text style={styles.pgBtnTxt}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  filterChipOn: { backgroundColor: '#3730a3' },
  filterChipTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterChipTxtOn: { color: '#fff' },
  search: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#3730a3' },
  emptySub: { marginTop: 6, fontSize: 14, color: '#6b7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  when: { fontSize: 13, fontWeight: '700', color: '#4f46e5', marginBottom: 8 },
  line: { fontSize: 14, color: '#111827', marginBottom: 4 },
  lbl: { color: '#6b7280', fontWeight: '600' },
  detail: { marginTop: 8, fontSize: 15, color: '#1f2937', lineHeight: 22 },
  pager: { marginTop: 8, marginBottom: 16 },
  pagerInfo: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  pagerBtns: { flexDirection: 'row', gap: 10 },
  pgBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3730a3',
    alignItems: 'center',
  },
  pgBtnOff: { backgroundColor: '#d1d5db' },
  pgBtnTxt: { color: '#fff', fontWeight: '700' },
});
