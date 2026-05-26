import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import FacultyHomeworkAddTab from './FacultyHomeworkAddTab';
import FacultyHomeworkMyTab from './FacultyHomeworkMyTab';

const TAB_CREATE = 'create';
const TAB_MINE = 'mine';

export default function FacultyAddHomework() {
  const [tab, setTab] = useState(TAB_CREATE);
  const [myReloadTick, setMyReloadTick] = useState(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Homework" />

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_CREATE && styles.tabActive]}
            onPress={() => setTab(TAB_CREATE)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === TAB_CREATE }}
          >
            <Text style={[styles.tabText, tab === TAB_CREATE && styles.tabTextActive]}>Create</Text>
            <Text style={[styles.tabSub, tab === TAB_CREATE && styles.tabSubActive]}>Add homework</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_MINE && styles.tabActive]}
            onPress={() => setTab(TAB_MINE)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === TAB_MINE }}
          >
            <Text style={[styles.tabText, tab === TAB_MINE && styles.tabTextActive]}>My homework</Text>
            <Text style={[styles.tabSub, tab === TAB_MINE && styles.tabSubActive]}>Added by you</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {tab === TAB_CREATE ? (
            <FacultyHomeworkAddTab
              onSuccess={() => {
                setMyReloadTick((n) => n + 1);
                setTab(TAB_MINE);
              }}
            />
          ) : (
            <FacultyHomeworkMyTab active={tab === TAB_MINE} reloadTick={myReloadTick} />
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
    backgroundColor: '#ecfdf5',
  },
  flex: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
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
    color: '#166534',
  },
  tabTextActive: {
    color: '#14532d',
  },
  tabSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  tabSubActive: {
    color: '#15803d',
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
});
