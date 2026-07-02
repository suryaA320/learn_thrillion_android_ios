import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import FacultySyllabusPlanningAddTab from './FacultySyllabusPlanningAddTab';
import FacultySyllabusPlanningViewTab from './FacultySyllabusPlanningViewTab';

const TAB_ADD = 'add';
const TAB_VIEW = 'view';

export default function FacultySyllabusPlanning() {
  const [tab, setTab] = useState(TAB_ADD);
  const [viewReloadTick, setViewReloadTick] = useState(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Syllabus planning" />

        <Text style={styles.description}>
          Create chapters and subtopics with status tracking. Only you and your school admin can
          view these plans.
        </Text>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_ADD && styles.tabActive]}
            onPress={() => setTab(TAB_ADD)}
          >
            <Text style={[styles.tabText, tab === TAB_ADD && styles.tabTextActive]}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_VIEW && styles.tabActive]}
            onPress={() => setTab(TAB_VIEW)}
          >
            <Text style={[styles.tabText, tab === TAB_VIEW && styles.tabTextActive]}>View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={[styles.tabPane, tab !== TAB_ADD && styles.tabPaneHidden]}>
            <FacultySyllabusPlanningAddTab onSaved={() => setViewReloadTick((n) => n + 1)} />
          </View>
          <View style={[styles.tabPane, tab !== TAB_VIEW && styles.tabPaneHidden]}>
            <FacultySyllabusPlanningViewTab active={tab === TAB_VIEW} reloadTick={viewReloadTick} />
          </View>
        </View>

        <FacultyBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8ff' },
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
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  tabTextActive: { color: '#fff' },
  body: { flex: 1 },
  tabPane: { flex: 1 },
  tabPaneHidden: { display: 'none' },
});
