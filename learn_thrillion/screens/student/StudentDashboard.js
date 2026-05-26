import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import { useAuth } from '../../context/AuthContext';
import { useStudentPortal } from '../../context/StudentPortalContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { profile, loading, error } = useStudentPortal();

  const sub =
    profile?.class_name && profile?.section_name
      ? `${profile.class_name} · ${profile.section_name}`
      : loading
        ? 'Loading your class…'
        : error || 'School workspace';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <TopNavigationStylish title="Student home" />
        <View style={styles.mainContent}>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Student workspace</Text>
            <Text style={styles.bannerSub}>{user?.email ? user.email : 'Signed in'}</Text>
            <Text style={styles.bannerMeta}>{sub}</Text>
            {error ? <Text style={styles.bannerErr}>{error}</Text> : null}
          </View>
          <View style={styles.planningCard}>
            <View style={styles.leftCard} />
            <View style={styles.rightCol}>
              <View style={styles.rightCardTop} />
              <View style={styles.rightCardBottom} />
            </View>
          </View>
        </View>
        <StudentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    backgroundColor: '#f0fdf4',
    flex: 1,
  },
  banner: {
    minHeight: 100,
    backgroundColor: '#bbf7d0',
    margin: 10,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14532d',
  },
  bannerSub: {
    marginTop: 6,
    fontSize: 14,
    color: '#166534',
  },
  bannerMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#15803d',
    fontWeight: '600',
  },
  bannerErr: {
    marginTop: 8,
    fontSize: 12,
    color: '#b45309',
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
    backgroundColor: '#14532d',
  },
  rightCol: {
    flex: 1,
    margin: 6,
  },
  rightCardTop: {
    flex: 1,
    marginBottom: 6,
    borderRadius: 24,
    backgroundColor: '#166534',
  },
  rightCardBottom: {
    flex: 1,
    marginTop: 6,
    borderRadius: 24,
    backgroundColor: '#86efac',
  },
});
