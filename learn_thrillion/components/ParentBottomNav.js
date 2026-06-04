import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const ROUTES = {
  home: 'ParentHome',
  fees: 'ParentFees',
  diary: 'ParentDiary',
  complaints: 'ParentComplaints',
  progress: 'ParentProgress',
};

const NAV_ITEMS = [
  { key: 'home', icon: 'home', label: 'Home', route: ROUTES.home },
  { key: 'fees', icon: 'currency-inr', label: 'Fees', route: ROUTES.fees },
  { key: 'diary', icon: 'notebook', label: 'Diary', route: ROUTES.diary },
  { key: 'complaints', icon: 'balcony', label: 'Complaints', route: ROUTES.complaints },
  { key: 'progress', icon: 'chart-line', label: 'Progress', route: ROUTES.progress },
];

function getFocusedRouteNameFromState(state) {
  if (!state || typeof state.index !== 'number') return undefined;
  const route = state.routes[state.index];
  if (route?.state) {
    return getFocusedRouteNameFromState(route.state);
  }
  return route?.name;
}

export default function ParentBottomNav() {
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
          iconColor={active ? '#ccfbf1' : '#ffffff'}
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
    backgroundColor: '#0f766e',
    borderRadius: 25,
    minHeight: 72,
    overflow: 'hidden',
    shadowColor: '#134e4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    borderColor: 'rgba(204, 251, 241, 0.55)',
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
    color: '#ccfbf1',
    fontWeight: '800',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#99f6e4',
    marginTop: 3,
  },
  dotPlaceholder: {
    height: 8,
    marginTop: 3,
  },
});
