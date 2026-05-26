import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

/** Route names must match `FacultyStack` `Stack.Screen` `name` values. */
const ROUTES = {
  home: 'FacultyHome',
  homework: 'FacultyHomework',
  attendance: 'FacultyAttendance',
  planning: 'FacultyPlanning',
  complaints: 'FacultyComplaints',
};

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
  const currentRoute = useNavigationState((state) => getFocusedRouteNameFromState(state));

  const item = (icon, label, routeName) => {
    const active = currentRoute === routeName;
    return (
      <TouchableOpacity
        style={[styles.navItem, active && styles.navItemActive]}
        onPress={() => navigation.navigate(routeName)}
        accessibilityState={{ selected: active }}
        activeOpacity={0.85}
      >
        <IconButton
          icon={icon}
          size={26}
          iconColor={active ? '#fef9c3' : '#ffffff'}
          style={styles.iconBtn}
        />
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
        {active ? <View style={styles.activeDot} /> : <View style={styles.dotPlaceholder} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.bottNav}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {item('home', 'Home', ROUTES.home)}
        {item('bookshelf', 'Homework', ROUTES.homework)}
        {item('chart-box', 'Attendance', ROUTES.attendance)}
        {item('notebook-edit-outline', 'Planning', ROUTES.planning)}
        {item('balcony', 'Complaints', ROUTES.complaints)}

        <TouchableOpacity style={styles.navItem} onPress={signOut} activeOpacity={0.85}>
          <IconButton icon="logout" size={26} iconColor="#ffffff" style={styles.iconBtn} />
          <Text style={styles.label}>Sign out</Text>
          <View style={styles.dotPlaceholder} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bottNav: {
    backgroundColor: '#14532d',
    height: 80,
    margin: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
    marginBottom: 12,
    borderRadius: 18,
    minWidth: 72,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(254, 249, 195, 0.55)',
  },
  iconBtn: {
    margin: 0,
  },
  scrollView: {
    paddingHorizontal: 0,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: -8,
    fontWeight: '500',
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
    marginTop: 2,
  },
  dotPlaceholder: {
    height: 7,
    marginTop: 2,
  },
});
