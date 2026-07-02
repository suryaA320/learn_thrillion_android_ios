import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

/** Route names must match `FacultyStack` `Stack.Screen` `name` values. */
const ROUTES = {
  home: 'FacultyHome',
  homework: 'FacultyHomework',
  studyMaterial: 'FacultyStudyMaterial',
  attendance: 'FacultyAttendance',
  planning: 'FacultyPlanning',
  syllabus: 'FacultySyllabusPlanning',
  complaints: 'FacultyComplaints',
};

const NAV_ITEMS = [
  { key: 'home', icon: 'home', label: 'Home', route: ROUTES.home },
  { key: 'homework', icon: 'bookshelf', label: 'Homework', route: ROUTES.homework },
  { key: 'studyMaterial', icon: 'book-open-page-variant', label: 'Notes', route: ROUTES.studyMaterial },
  { key: 'attendance', icon: 'chart-box', label: 'Attendance', route: ROUTES.attendance },
  { key: 'planning', icon: 'notebook-edit-outline', label: 'Planning', route: ROUTES.planning },
  { key: 'syllabus', icon: 'book-education-outline', label: 'Syllabus', route: ROUTES.syllabus },
  { key: 'complaints', icon: 'balcony', label: 'Complaints', route: ROUTES.complaints },
];

function getFocusedRouteNameFromState(state) {
  if (!state || typeof state.index !== 'number') return undefined;
  const route = state.routes[state.index];
  if (route?.state) {
    return getFocusedRouteNameFromState(route.state);
  }
  return route?.name;
}

export default function FacultyBottomNav() {
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const currentRoute = useNavigationState((state) => getFocusedRouteNameFromState(state));

  const renderItem = ({ icon, label, route, isSignOut = false }) => {
    const active = !isSignOut && currentRoute === route;
    const onPress = isSignOut ? signOut : () => navigation.navigate(route);

    return (
      <TouchableOpacity
        key={isSignOut ? 'sign-out' : route}
        style={[styles.navItem, active && styles.navItemActive]}
        onPress={onPress}
        accessibilityState={{ selected: active }}
        activeOpacity={0.85}
      >
        <IconButton
          icon={icon}
          size={24}
          iconColor={active ? '#fef9c3' : '#ffffff'}
          style={styles.iconBtn}
        />
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {label}
        </Text>
        {active ? <View style={styles.activeDot} /> : <View style={styles.dotPlaceholder} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bottNav}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {NAV_ITEMS.map((item) => renderItem(item))}
          {renderItem({ icon: 'logout', label: 'Sign out', isSignOut: true })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
  },
  bottNav: {
    backgroundColor: '#3730a3',
    borderRadius: 25,
    minHeight: 72,
    overflow: 'hidden',
    shadowColor: '#312e81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    minHeight: 72,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    minWidth: 56,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(254, 249, 195, 0.55)',
  },
  iconBtn: {
    margin: 0,
    width: 36,
    height: 36,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: -4,
    textAlign: 'center',
  },
  labelActive: {
    color: '#fef9c3',
    fontWeight: '800',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fef08a',
    marginTop: 3,
  },
  dotPlaceholder: {
    height: 8,
    marginTop: 3,
  },
});
