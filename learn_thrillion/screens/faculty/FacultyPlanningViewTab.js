import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { MonthPickerField } from '../../components/DatePickerField';
import {
  fetchSchoolClasses,
  fetchSectionsByClass,
  fetchFacultyActionPlans,
  updateFacultyActionPlan,
} from '../../utils/schoolApi';

const PAGE_SIZE = 10;

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load action plans.';
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

function statusLabel(s) {
  const x = String(s || '').toLowerCase();
  if (x === 'completed') return 'COMPLETED';
  if (x === 'active') return 'ACTIVE';
  if (x === 'cancelled') return 'CANCELLED';
  return 'DRAFT';
}

export default function FacultyPlanningViewTab({ active, reloadTick }) {
  const [classes, setClasses] = useState([]);
  const [viewClass, setViewClass] = useState(null);
  const [viewSection, setViewSection] = useState(null);
  const [viewSections, setViewSections] = useState([]);
  const [loadingViewSections, setLoadingViewSections] = useState(false);

  const [viewFilter, setViewFilter] = useState('today');
  const [viewMonth, setViewMonth] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cls = await fetchSchoolClasses();
        if (!cancelled) setClasses(Array.isArray(cls) ? cls : []);
      } catch {
        if (!cancelled) setClasses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewClass) {
      setViewSections([]);
      setViewSection(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingViewSections(true);
      try {
        const data = await fetchSectionsByClass(viewClass);
        if (!cancelled) {
          setViewSections(Array.isArray(data) ? data : []);
          setViewSection(null);
        }
      } catch {
        if (!cancelled) setViewSections([]);
      } finally {
        if (!cancelled) setLoadingViewSections(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewClass]);

  const classItems = useMemo(
    () => [{ label: 'All classes', value: '' }, ...(classes || []).map((c) => ({ label: c.class_name || 'Class', value: String(c.id) }))],
    [classes]
  );

  const sectionItems = useMemo(
    () => [
      { label: loadingViewSections ? 'Loading…' : 'All sections', value: '' },
      ...(viewSections || []).map((s) => ({ label: s.section_name || 'Section', value: String(s.id) })),
    ],
    [viewSections, loadingViewSections]
  );

  const load = useCallback(async () => {
    setError('');
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
      };
      if (viewFilter !== 'all') params.filter = viewFilter;
      const m = viewMonth.trim();
      if (m && /^\d{4}-\d{2}$/.test(m)) params.month = m;
      if (viewClass) params.class_id = viewClass;
      if (viewSection) params.section_id = viewSection;

      const raw = await fetchFacultyActionPlans(params);
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
  }, [page, viewFilter, viewMonth, viewClass, viewSection]);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    load();
  }, [active, reloadTick, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const setFilterAndReset = (f) => {
    setViewFilter(f);
    setViewMonth('');
    setPage(1);
  };

  const markCompleted = async (p) => {
    if (!p?.id || String(p.status || '').toLowerCase() === 'completed' || !p.can_edit) return;
    setCompletingId(p.id);
    try {
      const updated = await updateFacultyActionPlan(p.id, {
        academic_year: p.academic_year_id,
        class_id: p.class_id,
        section_id: p.section_id,
        action_plan: p.action_plan,
        from_date: p.from_date,
        to_date: p.to_date ?? p.from_date,
        status: 'completed',
      });
      setRows((prev) =>
        prev.map((row) =>
          row.id === p.id
            ? {
                ...row,
                status: updated?.status || 'completed',
                updated_date: updated?.updated_date || row.updated_date,
                to_date: updated?.to_date ?? row.to_date,
              }
            : row
        )
      );
    } catch (err) {
      const d = err?.response?.data;
      const msg = typeof d?.detail === 'string' ? d.detail : 'Could not update status.';
      Alert.alert('Update failed', msg);
    } finally {
      setCompletingId('');
    }
  };

  const canNext = page * PAGE_SIZE < total;

  if (loading && rows.length === 0 && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.muted}>Loading action plans…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803d" />}
    >
      <Text style={styles.hint}>Filter and paginate your action plans like the web View Action Plans tab.</Text>

      {error ? <Text style={styles.banner}>{error}</Text> : null}

      <View style={styles.filterRow}>
        {[
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'Week' },
          { key: 'month', label: 'Month' },
          { key: 'all', label: 'All' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, viewFilter === key && styles.filterChipOn]}
            onPress={() => setFilterAndReset(key)}
          >
            <Text style={[styles.filterChipTxt, viewFilter === key && styles.filterChipTxtOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.lbl}>Class</Text>
      <Dropdown
        style={styles.dd}
        placeholderStyle={styles.ddPh}
        selectedTextStyle={styles.ddSel}
        data={classItems}
        labelField="label"
        valueField="value"
        placeholder="All classes"
        value={viewClass ?? ''}
        onChange={(item) => {
          setViewClass(item?.value || null);
          setPage(1);
        }}
      />

      <Text style={styles.lbl}>Section</Text>
      <Dropdown
        style={[styles.dd, !viewClass && styles.ddDisabled]}
        placeholderStyle={styles.ddPh}
        selectedTextStyle={styles.ddSel}
        data={sectionItems}
        labelField="label"
        valueField="value"
        placeholder={!viewClass ? 'Choose a class first' : loadingViewSections ? 'Loading…' : 'All sections'}
        value={viewSection ?? ''}
        disable={!viewClass || loadingViewSections}
        onChange={(item) => {
          setViewSection(item?.value || null);
          setPage(1);
        }}
      />

      <MonthPickerField
        label="Month (optional)"
        value={viewMonth}
        onChangeValue={(v) => {
          setViewMonth(v);
          setPage(1);
        }}
        allowClear
      />

      {rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No action plans</Text>
          <Text style={styles.emptySub}>Nothing matches these filters yet.</Text>
        </View>
      ) : (
        rows.map((row) => {
          const done = String(row.status || '').toLowerCase() === 'completed';
          const busy = completingId === row.id;
          return (
            <View key={String(row.id)} style={styles.card}>
              <View style={[styles.strip, done ? styles.stripDone : styles.stripOpen]} />
              <Text style={styles.planPreview} numberOfLines={6}>
                {row.action_plan || '—'}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.k}>Class: </Text>
                {row.class_name || '—'}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.k}>Section: </Text>
                {row.section_name || '—'}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.k}>Status: </Text>
                {statusLabel(row.status)}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.k}>Added: </Text>
                {formatWhen(row.added_date)}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.k}>Updated: </Text>
                {formatWhen(row.updated_date)}
              </Text>
              <View style={styles.switchRow}>
                <Text style={styles.k}>Mark completed</Text>
                <Switch
                  value={done}
                  disabled={done || !row.can_edit || busy}
                  onValueChange={(v) => {
                    if (v) markCompleted(row);
                  }}
                  trackColor={{ false: '#d1d5db', true: '#86efac' }}
                  thumbColor={done ? '#15803d' : '#f4f4f5'}
                />
              </View>
            </View>
          );
        })
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
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  filterChipOn: { backgroundColor: '#15803d', borderColor: '#15803d' },
  filterChipTxt: { fontSize: 13, color: '#166534', fontWeight: '600' },
  filterChipTxtOn: { color: '#fff' },
  lbl: { fontSize: 13, fontWeight: '600', color: '#14532d', marginTop: 8, marginBottom: 4 },
  dd: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  ddDisabled: { opacity: 0.55 },
  ddPh: { fontSize: 14, color: '#9ca3af' },
  ddSel: { fontSize: 14, color: '#111827' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
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
    overflow: 'hidden',
  },
  strip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  stripDone: { backgroundColor: '#22c55e' },
  stripOpen: { backgroundColor: '#eab308' },
  planPreview: { fontSize: 14, color: '#111827', lineHeight: 20, marginBottom: 8, marginLeft: 6 },
  line: { fontSize: 13, color: '#374151', marginBottom: 4, marginLeft: 6 },
  k: { fontWeight: '600', color: '#14532d' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginLeft: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  pager: { marginTop: 16, marginBottom: 8 },
  pagerInfo: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  pagerBtns: { flexDirection: 'row', gap: 10 },
  pgBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#15803d',
    alignItems: 'center',
  },
  pgBtnOff: { backgroundColor: '#d1d5db' },
  pgBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
