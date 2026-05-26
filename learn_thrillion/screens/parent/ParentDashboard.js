import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import ParentBottomNav from '../../components/ParentBottomNav';
import { useAuth } from '../../context/AuthContext';

export default function ParentDashboard() {
  const { user } = useAuth();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Parent';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <TopNavigationStylish />
        <View style={styles.main}>
          <Text style={styles.title}>Parent home</Text>
          <Text style={styles.sub}>Signed in as {name}</Text>
          <Text style={styles.hint}>Use the bottom bar to open Messages or sign out.</Text>
        </View>
        <ParentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#f0fdfa',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#134e4a',
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: '#115e59',
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
  },
});
