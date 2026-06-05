import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import { fetchStudentStudyMaterial } from '../../utils/schoolApi';
import { useStudentPortal } from '../../context/StudentPortalContext';

function formatApiError(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return err?.message || 'Could not load study material.';
}

export default function StudentStudyMaterialScreen() {
  const { profile, loading: profileLoading, error: portalError } = useStudentPortal();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ silent } = {}) => {
      if (!profile?.class_id) {
        if (!profileLoading) {
          setPayload(null);
          setError('');
          if (!silent) setLoading(false);
        }
        setRefreshing(false);
        return;
      }
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await fetchStudentStudyMaterial({ class_id: profile.class_id });
        setPayload(data);
      } catch (e) {
        setError(formatApiError(e));
        setPayload(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile, profileLoading]
  );

  useEffect(() => {
    load();
  }, [load]);

  const subjects = payload?.subjects || [];
  const banner = portalError || error;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Study notes" />
        {payload?.class_name ? (
          <Text style={styles.classBanner}>Class: {payload.class_name}</Text>
        ) : null}
        {loading && !banner ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load({ silent: true });
                }}
                tintColor="#4f46e5"
              />
            }
          >
            {banner ? <Text style={styles.error}>{banner}</Text> : null}
            {!banner && subjects.length === 0 ? (
              <Text style={styles.muted}>No study material for your class yet.</Text>
            ) : null}
            {subjects.map((group) => (
              <View key={group.subject_id} style={styles.subjectBlock}>
                <Text style={styles.subjectTitle}>{group.subject_name}</Text>
                {(group.items || []).map((item) => (
                  <View key={item.id} style={styles.card}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemMeta}>
                      Ch {item.chapter_number} · L {item.lesson_number}
                    </Text>
                    {item.content_type === 'written' ? (
                      <Text style={styles.notes}>{item.notes}</Text>
                    ) : item.file_url ? (
                      <TouchableOpacity onPress={() => Linking.openURL(item.file_url)}>
                        <Text style={styles.link}>Open file</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
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
  classBanner: {
    textAlign: 'center',
    color: '#4338ca',
    fontWeight: '600',
    marginBottom: 4,
  },
  scroll: { padding: 16, paddingBottom: 110 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#b91c1c', marginBottom: 12, textAlign: 'center' },
  muted: { color: '#64748b', textAlign: 'center', marginTop: 32 },
  subjectBlock: { marginBottom: 20 },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3730a3',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#c7d2fe',
    paddingBottom: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  itemTitle: { fontWeight: '700', color: '#334155' },
  itemMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  notes: { marginTop: 8, color: '#475569' },
  link: { marginTop: 8, color: '#4f46e5', fontWeight: '600' },
});
