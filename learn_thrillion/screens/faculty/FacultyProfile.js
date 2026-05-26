import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../constants/roles';

function Row({ label, value }) {
  const v = value != null && String(value).trim() !== '' ? String(value) : '—';
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {v}
      </Text>
    </View>
  );
}

export default function FacultyProfile() {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState('');

  const load = useCallback(async () => {
    setBanner('');
    try {
      await refreshUser();
    } catch (e) {
      if (e?.response?.status !== 401) {
        setBanner('Could not refresh from server. Showing saved details.');
      }
    }
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const displayName =
    [user?.first_name, user?.last_name].filter((s) => s && String(s).trim()).join(' ') ||
    user?.email ||
    'Faculty';

  const statusLabel = user?.user_status ? String(user.user_status) : '—';
  const statusTone =
    String(user?.user_status || '')
      .toLowerCase()
      .includes('active')
      ? styles.badgeActive
      : styles.badgeMuted;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="My profile" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803d" />
          }
        >
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          <View style={styles.hero}>
            <Image source={require('../../assets/FacultyAvatar.png')} style={styles.avatar} />
            <Text style={styles.name}>{displayName}</Text>
            <View style={[styles.statusBadge, statusTone]}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <Row label="Role" value={getRoleLabel(user.role)} />
            <Row label="Email" value={user.email} />
            <Row label="Mobile" value={user.mobile_number} />
            <Row label="Account status" value={user.user_status} />
          </View>

          <Text style={styles.sectionTitle}>School</Text>
          <View style={styles.card}>
            <Row label="School" value={user.school_name} />
          </View>
        </ScrollView>
        <FacultyBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ecfdf5',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#bbf7d0',
  },
  name: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#14532d',
    textAlign: 'center',
  },
  statusBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: '#bbf7d0',
  },
  badgeMuted: {
    backgroundColor: '#e5e7eb',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14532d',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 16,
    color: '#111827',
  },
});
