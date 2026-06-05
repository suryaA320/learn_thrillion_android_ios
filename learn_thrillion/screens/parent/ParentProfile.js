import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import ParentBottomNav from '../../components/ParentBottomNav';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../constants/roles';

export default function ParentProfile() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <TopNavigationStylish title="Profile" />
        <View style={styles.main}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{getRoleLabel(user?.role)}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
        </View>
        <ParentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#f5f3ff',
    padding: 20,
  },
  label: {
    fontSize: 12,
    color: '#3730a3',
    marginTop: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#4f46e5',
  },
});
