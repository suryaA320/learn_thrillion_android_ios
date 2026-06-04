import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import ParentBottomNav from '../../components/ParentBottomNav';
import ParentChildPicker from '../../components/ParentChildPicker';
import { useAuth } from '../../context/AuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';

export default function ParentHome() {
  const { user } = useAuth();
  const { childrenList, loading: childrenLoading, selectedStudentId } = useParentPortal();

  const childrenCount = childrenList.length;
  const selectedChild = childrenList.find((c) => String(c.id) === String(selectedStudentId));
  const primaryChildName = selectedChild
    ? [selectedChild.first_name, selectedChild.last_name].filter(Boolean).join(' ').trim()
    : '';

  const parentName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'Parent';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <TopNavigationStylish title="Parent home" />
        <View style={styles.mainContent}>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Parent workspace</Text>
            <Text style={styles.bannerSub}>
              {user?.school_name ? user.school_name : parentName}
            </Text>
          </View>

          {childrenCount > 1 ? <ParentChildPicker /> : null}

          <View style={styles.cardsRow}>
            <View style={styles.leftCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="account-group" size={28} color="#0f766e" />
                </View>
                <Text style={styles.cardLabel}>My children</Text>
              </View>
              {childrenLoading ? (
                <ActivityIndicator color="#99f6e4" style={{ marginTop: 16 }} />
              ) : (
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Linked</Text>
                  <Text style={styles.cardMetric}>{childrenCount}</Text>
                  <Text style={styles.cardMetricHint}>
                    {childrenCount === 1 ? 'student' : 'students'} on your account
                  </Text>
                  {primaryChildName ? (
                    <Text style={styles.cardSub}>Active: {primaryChildName}</Text>
                  ) : null}
                </View>
              )}
              <Text style={styles.cardFoot}>School-linked profiles</Text>
            </View>

            <View style={styles.rightCol}>
              <View style={styles.rightCardTop}>
                <MaterialCommunityIcons name="school" size={32} color="#ccfbf1" />
                <Text style={styles.rightCardTitle}>School</Text>
                <Text style={styles.rightCardSub} numberOfLines={2}>
                  {user?.school_name || 'Your school'}
                </Text>
              </View>
              <View style={styles.rightCardBottom}>
                <MaterialCommunityIcons name="heart-pulse" size={32} color="#134e4a" />
                <Text style={styles.rightCardTitleDark}>Stay connected</Text>
                <Text style={styles.rightCardSubDark} numberOfLines={2}>
                  Fees, homework & updates in one place
                </Text>
              </View>
            </View>
          </View>
        </View>
        <ParentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    backgroundColor: '#f0fdfa',
    flex: 1,
    paddingBottom: 100,
  },
  banner: {
    minHeight: 100,
    backgroundColor: '#99f6e4',
    margin: 10,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#134e4a',
  },
  bannerSub: {
    marginTop: 6,
    fontSize: 14,
    color: '#115e59',
  },
  cardsRow: {
    minHeight: 280,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  leftCard: {
    flex: 1,
    margin: 6,
    borderRadius: 24,
    backgroundColor: '#0f766e',
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
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#f0fdfa',
    letterSpacing: 0.3,
  },
  metricBlock: {
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5eead4',
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
    color: '#99f6e4',
    marginTop: 2,
    fontWeight: '500',
  },
  cardSub: {
    marginTop: 10,
    fontSize: 13,
    color: '#fde68a',
    fontWeight: '600',
  },
  cardFoot: {
    marginTop: 16,
    fontSize: 13,
    color: '#5eead4',
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
    backgroundColor: '#115e59',
    padding: 16,
    justifyContent: 'flex-end',
  },
  rightCardBottom: {
    flex: 1,
    marginTop: 6,
    borderRadius: 24,
    backgroundColor: '#5eead4',
    padding: 16,
    justifyContent: 'flex-end',
  },
  rightCardTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#ecfdf5',
  },
  rightCardSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#ccfbf1',
    lineHeight: 16,
  },
  rightCardTitleDark: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#134e4a',
  },
  rightCardSubDark: {
    marginTop: 4,
    fontSize: 12,
    color: '#0f766e',
    lineHeight: 16,
  },
});
