import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useRoute } from '@react-navigation/native';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import ParentBottomNav from '../../components/ParentBottomNav';
import ParentChildPicker from '../../components/ParentChildPicker';
import {
  fetchParentFeeReminders,
  markParentFeeReminderRead,
} from '../../utils/schoolApi';
import { useParentPortal } from '../../context/ParentPortalContext';

const ACCENT = '#4f46e5';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load fee reminders.';
}

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

export default function ParentFeeRemindersScreen() {
  const route = useRoute();
  const { selectedStudentId, loading: portalLoading, error: portalError } = useParentPortal();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [markingId, setMarkingId] = useState('');

  const load = useCallback(async () => {
    if (!selectedStudentId) {
      setReminders([]);
      setUnreadCount(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError('');
    try {
      const data = await fetchParentFeeReminders(selectedStudentId);
      const rows = Array.isArray(data?.results) ? data.results : [];
      setReminders(rows);
      setUnreadCount(Number(data?.unread_count ?? 0));
    } catch (e) {
      setReminders([]);
      setUnreadCount(0);
      setError(formatApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStudentId]);

  useFocusEffect(
    useCallback(() => {
      if (portalLoading) return;
      setLoading(true);
      load();
    }, [load, portalLoading])
  );

  const openReminder = useCallback(
    async (item) => {
      if (!item?.id) return;
      setExpandedId(item.id);
      if (item.read_status === 'read') return;
      setMarkingId(item.id);
      try {
        const updated = await markParentFeeReminderRead(item.id);
        setReminders((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? { ...row, ...(updated || {}), read_status: 'read' }
              : row
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        setError(formatApiError(e));
      } finally {
        setMarkingId('');
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      const reminderId = route.params?.reminderId;
      if (!reminderId || !reminders.length) return;
      const match = reminders.find((row) => String(row.id) === String(reminderId));
      if (match) {
        openReminder(match);
      }
    }, [route.params?.reminderId, reminders, openReminder])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const banner = portalError || error;
  const waiting = (portalLoading || loading) && !banner && !reminders.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Fee reminders" />
        <ParentChildPicker />

        {waiting ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.muted}>Loading fee reminders…</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
            }
          >
            {banner ? <Text style={styles.banner}>{banner}</Text> : null}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>School fee reminders</Text>
              <Text style={styles.summarySub}>
                {unreadCount > 0
                  ? `${unreadCount} unread reminder${unreadCount === 1 ? '' : 's'}`
                  : 'All caught up — no unread reminders.'}
              </Text>
            </View>

            {reminders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No reminders yet</Text>
                <Text style={styles.emptySub}>
                  When the school sends a fee reminder for your child, it will appear here.
                </Text>
              </View>
            ) : (
              reminders.map((item) => {
                const isUnread = item.read_status !== 'read';
                const isExpanded = expandedId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.reminderCard, isUnread && styles.reminderCardUnread]}
                    activeOpacity={0.85}
                    onPress={() => openReminder(item)}
                  >
                    <View style={styles.reminderTop}>
                      <View style={styles.reminderTitleWrap}>
                        <Text style={styles.reminderTitle}>
                          {item.month || 'Fee month'} · {formatMoney(item.month_due)}
                        </Text>
                        <Text style={styles.reminderMeta}>
                          {item.academic_year_label || 'Academic year'} · Sent{' '}
                          {formatDateTime(item.created_at)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isUnread ? styles.statusUnread : styles.statusRead,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isUnread ? styles.statusTextUnread : styles.statusTextRead,
                          ]}
                        >
                          {isUnread ? 'Unread' : 'Read'}
                        </Text>
                      </View>
                    </View>

                    {isExpanded ? (
                      <View style={styles.reminderBody}>
                        {markingId === item.id ? (
                          <ActivityIndicator size="small" color={ACCENT} />
                        ) : null}
                        <Text style={styles.reminderDetail}>
                          Balance at reminder: {formatMoney(item.balance)}
                        </Text>
                        {item.sent_by_name ? (
                          <Text style={styles.reminderDetail}>Sent by: {item.sent_by_name}</Text>
                        ) : null}
                        {item.read_at ? (
                          <Text style={styles.reminderDetail}>
                            Read on: {formatDateTime(item.read_at)}
                          </Text>
                        ) : null}
                        <Text style={styles.reminderHint}>
                          Tap again to collapse. Contact your school office to pay pending fees.
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}

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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 10, color: '#64748b', fontSize: 14 },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  summarySub: { marginTop: 4, color: '#64748b', fontSize: 13 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  emptySub: { marginTop: 6, color: '#64748b', fontSize: 13, lineHeight: 19 },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reminderCardUnread: {
    borderColor: '#c7d2fe',
    backgroundColor: '#fafaff',
  },
  reminderTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reminderTitleWrap: { flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  reminderMeta: { marginTop: 4, fontSize: 12, color: '#64748b', lineHeight: 17 },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusUnread: { backgroundColor: '#fee2e2' },
  statusRead: { backgroundColor: '#dcfce7' },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statusTextUnread: { color: '#b91c1c' },
  statusTextRead: { color: '#15803d' },
  reminderBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  reminderDetail: { fontSize: 13, color: '#334155' },
  reminderHint: { marginTop: 4, fontSize: 12, color: '#64748b', lineHeight: 17 },
});
