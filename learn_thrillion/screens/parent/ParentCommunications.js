import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import ParentBottomNav from '../../components/ParentBottomNav';

export default function ParentCommunications() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <TopNavigationStylish />
        <View style={styles.main}>
          <Text style={styles.title}>Messages & notices</Text>
          <Text style={styles.sub}>School announcements and teacher messages will appear here.</Text>
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
    color: '#64748b',
    lineHeight: 22,
  },
});
