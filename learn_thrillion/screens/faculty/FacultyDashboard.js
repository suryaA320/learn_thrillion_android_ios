import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import { useAuth } from '../../context/AuthContext';
import { fetchFacultyLeaveSummary } from '../../utils/schoolApi';

export default function FacultyDashboard() {
  const navigation = useNavigation();
  const { user, ready } = useAuth();
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const loadLeaveSummary = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const data = await fetchFacultyLeaveSummary();
      setLeaveBalance(data?.leave_balance ?? 0);
      setPendingCount(data?.pending_request_count ?? data?.pending_count ?? 0);
    } catch {
      setLeaveBalance(null);
      setPendingCount(0);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready && user) {
        loadLeaveSummary();
      }
    }, [ready, user, loadLeaveSummary])
  );

  const openLeaves = () => navigation.navigate('FacultyLeaves');
  const openMarks = () => navigation.navigate('FacultyMarks');

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <TopNavigationStylish title="Faculty home" />
        <View style={styles.mainContent}>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Faculty workspace</Text>
            <Text style={styles.bannerSub}>
              {user?.school_name
                ? user.school_name
                : user?.email
                  ? user.email
                  : 'Signed in'}
            </Text>
          </View>
          <View style={styles.planningCard}>
            <TouchableOpacity
              style={styles.leftCard}
              onPress={openLeaves}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={
                leaveLoading
                  ? 'Leave requests, loading'
                  : `Leave requests, ${leaveBalance ?? 0} available`
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="beach" size={28} color="#3730a3" />
                </View>
                <Text style={styles.cardLabel}>Leave Requests</Text>
              </View>
              {leaveLoading ? (
                <ActivityIndicator color="#c7d2fe" style={{ marginTop: 16 }} />
              ) : (
                <View style={styles.metricBlock}>
                  <Text style={styles.availableLabel}>Available</Text>
                  <Text style={styles.cardMetric}>{leaveBalance ?? '—'}</Text>
                  <Text style={styles.cardMetricHint}>days remaining this year</Text>
                  {pendingCount > 0 ? (
                    <Text style={styles.cardSub}>{pendingCount} pending request(s)</Text>
                  ) : null}
                </View>
              )}
              <Text style={styles.cardCta}>Tap to manage →</Text>
            </TouchableOpacity>
            <View style={styles.rightCol}>
              <TouchableOpacity
                style={styles.rightCardTop}
                onPress={openMarks}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Enter marks"
              >
                <MaterialCommunityIcons name="file-document-edit-outline" size={26} color="#3730a3" />
                <Text style={styles.rightCardTitle}>Enter marks</Text>
                <Text style={styles.rightCardHint}>Exam scores</Text>
              </TouchableOpacity>
              <View style={styles.rightCardBottom} />
            </View>
          </View>
        </View>
        <FacultyBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    backgroundColor: '#f5f3ff',
    flex: 1,
    paddingBottom: 96,
  },
  banner: {
    minHeight: 100,
    backgroundColor: '#c7d2fe',
    margin: 10,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3730a3',
  },
  bannerSub: {
    marginTop: 6,
    fontSize: 14,
    color: '#4338ca',
  },
  planningCard: {
    minHeight: 280,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  leftCard: {
    flex: 1,
    margin: 6,
    borderRadius: 24,
    backgroundColor: '#3730a3',
    padding: 18,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#e0e7ff',
    letterSpacing: 0.3,
  },
  metricBlock: {
    marginTop: 8,
  },
  availableLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a5b4fc',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardMetric: {
    marginTop: 4,
    fontSize: 44,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 48,
  },
  cardMetricHint: {
    fontSize: 13,
    color: '#c7d2fe',
    marginTop: 2,
    fontWeight: '500',
  },
  cardSub: {
    marginTop: 10,
    fontSize: 13,
    color: '#fde68a',
    fontWeight: '600',
  },
  cardCta: {
    marginTop: 16,
    fontSize: 13,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  rightCol: {
    flex: 1,
    margin: 6,
  },
  rightCardTop: {
    flex: 1,
    marginBottom: 6,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    padding: 14,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rightCardTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#3730a3',
  },
  rightCardHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  rightCardBottom: {
    flex: 1,
    marginTop: 6,
    borderRadius: 24,
    backgroundColor: '#a5b4fc',
  },
});
