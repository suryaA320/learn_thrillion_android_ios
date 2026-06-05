import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import FacultyStudyMaterialWriteTab from './FacultyStudyMaterialWriteTab';
import FacultyStudyMaterialUploadTab from './FacultyStudyMaterialUploadTab';
import FacultyStudyMaterialViewTab from './FacultyStudyMaterialViewTab';

const TAB_WRITE = 'write';
const TAB_UPLOAD = 'upload';
const TAB_VIEW = 'view';

export default function FacultyStudyMaterial() {
  const [tab, setTab] = useState(TAB_WRITE);
  const [viewReloadTick, setViewReloadTick] = useState(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish title="Study material" />

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_WRITE && styles.tabActive]}
            onPress={() => setTab(TAB_WRITE)}
          >
            <Text style={[styles.tabText, tab === TAB_WRITE && styles.tabTextActive]}>Write</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_UPLOAD && styles.tabActive]}
            onPress={() => setTab(TAB_UPLOAD)}
          >
            <Text style={[styles.tabText, tab === TAB_UPLOAD && styles.tabTextActive]}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_VIEW && styles.tabActive]}
            onPress={() => setTab(TAB_VIEW)}
          >
            <Text style={[styles.tabText, tab === TAB_VIEW && styles.tabTextActive]}>View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {tab === TAB_WRITE ? (
            <FacultyStudyMaterialWriteTab
              onSuccess={() => {
                setViewReloadTick((n) => n + 1);
                setTab(TAB_VIEW);
              }}
            />
          ) : null}
          {tab === TAB_UPLOAD ? (
            <FacultyStudyMaterialUploadTab
              onSuccess={() => {
                setViewReloadTick((n) => n + 1);
                setTab(TAB_VIEW);
              }}
            />
          ) : null}
          {tab === TAB_VIEW ? (
            <FacultyStudyMaterialViewTab active={tab === TAB_VIEW} reloadTick={viewReloadTick} />
          ) : null}
        </View>

        <FacultyBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eef2ff' },
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
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { color: '#4338ca', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  body: { flex: 1 },
});
