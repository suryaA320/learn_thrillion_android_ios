import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import FacultyActionPlanCalendar from '../../components/faculty/FacultyActionPlanCalendar';
import FacultyPlanningViewTab from './FacultyPlanningViewTab';

const TAB_ADD = 'add';
const TAB_VIEW = 'view';

export default function FacultyPlanning() {
  const [tab, setTab] = useState(TAB_ADD);
  const [viewReloadTick, setViewReloadTick] = useState(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Action plans" />

        <Text style={styles.description}>
          Tap a date on the calendar to add an action plan. Use View Action Plans to see plans you have
          added.
        </Text>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_ADD && styles.tabActive]}
            onPress={() => setTab(TAB_ADD)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === TAB_ADD }}
          >
            <Text style={[styles.tabText, tab === TAB_ADD && styles.tabTextActive]}>Add action plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_VIEW && styles.tabActive]}
            onPress={() => setTab(TAB_VIEW)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === TAB_VIEW }}
          >
            <Text style={[styles.tabText, tab === TAB_VIEW && styles.tabTextActive]}>View Action Plans</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {tab === TAB_ADD ? (
            <FacultyActionPlanCalendar onPlanSaved={() => setViewReloadTick((n) => n + 1)} />
          ) : (
            <FacultyPlanningViewTab active={tab === TAB_VIEW} reloadTick={viewReloadTick} />
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
    backgroundColor: '#f6f8ff',
  },
  flex: { flex: 1 },
  description: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#fff',
  },
  body: {
    flex: 1,
  },
});
