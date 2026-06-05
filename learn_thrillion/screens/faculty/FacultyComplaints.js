import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import FacultyComplaintsAddTab from './FacultyComplaintsAddTab';
import FacultyComplaintsMyTab from './FacultyComplaintsMyTab';

const TAB_ADD = 'add';
const TAB_VIEW = 'view';

export default function FacultyComplaints() {
  const route = useRoute();
  const [tab, setTab] = useState(TAB_ADD);
  const [myReloadTick, setMyReloadTick] = useState(0);

  useEffect(() => {
    if (route.params?.initialTab === 'view') {
      setTab(TAB_VIEW);
    }
  }, [route.params?.initialTab]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Complaints" />

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_ADD && styles.tabActive]}
            onPress={() => setTab(TAB_ADD)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === TAB_ADD }}
          >
            <Text style={[styles.tabText, tab === TAB_ADD && styles.tabTextActive]}>Add</Text>
            <Text style={[styles.tabSub, tab === TAB_ADD && styles.tabSubActive]}>Log a complaint</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_VIEW && styles.tabActive]}
            onPress={() => setTab(TAB_VIEW)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === TAB_VIEW }}
          >
            <Text style={[styles.tabText, tab === TAB_VIEW && styles.tabTextActive]}>My complaints</Text>
            <Text style={[styles.tabSub, tab === TAB_VIEW && styles.tabSubActive]}>View what you filed</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {tab === TAB_ADD ? (
            <FacultyComplaintsAddTab
              onSuccess={() => {
                setMyReloadTick((n) => n + 1);
                setTab(TAB_VIEW);
              }}
            />
          ) : (
            <FacultyComplaintsMyTab active={tab === TAB_VIEW} reloadTick={myReloadTick} />
          )}
        </View>

        <FacultyBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  flex: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#e0e7ff',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(254, 249, 195, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4338ca',
  },
  tabTextActive: {
    color: '#3730a3',
  },
  tabSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  tabSubActive: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
});
