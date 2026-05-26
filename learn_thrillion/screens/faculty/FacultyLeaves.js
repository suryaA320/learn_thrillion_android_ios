import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import FacultyBottomNav from '../../components/faculty/FacultyBottomNav';
import { useAuth } from '../../context/AuthContext';
import FacultyLeavesRequestTab from './FacultyLeavesRequestTab';
import FacultyLeavesListTab from './FacultyLeavesListTab';

const TAB_REQUEST = 'request';
const TAB_LIST = 'list';

export default function FacultyLeaves() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [tab, setTab] = useState(TAB_REQUEST);
  const [listReloadTick, setListReloadTick] = useState(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <TopNavigationStylish
          title="Leave requests"
          showBack
          onBack={() => navigation.goBack()}
        />

        {user?.school_name ? (
          <Text style={styles.schoolScope}>
            School: <Text style={styles.schoolName}>{user.school_name}</Text>
          </Text>
        ) : null}

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_REQUEST && styles.tabActive]}
            onPress={() => setTab(TAB_REQUEST)}
          >
            <Text style={[styles.tabText, tab === TAB_REQUEST && styles.tabTextActive]}>
              New request
            </Text>
            <Text style={[styles.tabSub, tab === TAB_REQUEST && styles.tabSubActive]}>
              Balance and apply
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_LIST && styles.tabActive]}
            onPress={() => setTab(TAB_LIST)}
          >
            <Text style={[styles.tabText, tab === TAB_LIST && styles.tabTextActive]}>
              My requests
            </Text>
            <Text style={[styles.tabSub, tab === TAB_LIST && styles.tabSubActive]}>
              Track status
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {tab === TAB_REQUEST ? (
            <FacultyLeavesRequestTab
              onSuccess={() => {
                setListReloadTick((n) => n + 1);
                setTab(TAB_LIST);
              }}
            />
          ) : (
            <FacultyLeavesListTab active={tab === TAB_LIST} reloadTick={listReloadTick} />
          )}
        </View>

        <FacultyBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ecfdf5' },
  flex: { flex: 1 },
  schoolScope: {
    marginHorizontal: 16,
    marginTop: 4,
    fontSize: 13,
    color: '#166534',
  },
  schoolName: { fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
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
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#15803d' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#14532d' },
  tabTextActive: { color: '#fff' },
  tabSub: { fontSize: 11, color: '#166534', marginTop: 2, textAlign: 'center' },
  tabSubActive: { color: '#dcfce7' },
  body: { flex: 1 },
});
