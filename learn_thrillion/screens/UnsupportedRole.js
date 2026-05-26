import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function UnsupportedRole() {
  const { role, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.box}>
        <Text style={styles.title}>This app build is for parents and faculty</Text>
        <Text style={styles.sub}>Your account role ({String(role)}) is not supported on mobile yet.</Text>
        <TouchableOpacity style={styles.btn} onPress={signOut}>
          <Text style={styles.btnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  box: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1e293b' },
  sub: { fontSize: 15, color: '#64748b', marginBottom: 24 },
  btn: { backgroundColor: '#1c1c1c', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
