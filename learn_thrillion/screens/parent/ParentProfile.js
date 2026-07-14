import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigationStylish from '../../components/TopNavigationStylish';
import ParentBottomNav from '../../components/ParentBottomNav';
import ProfilePhotoButton from '../../components/ProfilePhotoButton';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../constants/roles';

export default function ParentProfile() {
  const { user, patchUser } = useAuth();
  const [banner, setBanner] = useState('');

  const onPhotoUploaded = useCallback(
    async ({ profile_image_url, user: apiUser }) => {
      await patchUser({
        ...(apiUser || {}),
        profile_image_url: profile_image_url ?? apiUser?.profile_image_url ?? null,
      });
      setBanner('Profile photo updated.');
    },
    [patchUser]
  );

  const displayName =
    [user?.first_name, user?.last_name].filter((s) => s && String(s).trim()).join(' ') ||
    user?.email ||
    'Parent';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <TopNavigationStylish title="Profile" />
        <ScrollView contentContainerStyle={styles.main}>
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}
          <View style={styles.hero}>
            <ProfilePhotoButton
              uri={user?.profile_image_url}
              size={96}
              onUploaded={onPhotoUploaded}
            />
            <Text style={styles.hint}>Tap photo to change</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{getRoleLabel(user?.role)}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
        </ScrollView>
        <ParentBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flexGrow: 1,
    backgroundColor: '#f5f3ff',
    padding: 20,
    paddingBottom: 120,
  },
  banner: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 16,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  name: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#3730a3',
  },
  label: {
    fontSize: 12,
    color: '#3730a3',
    marginTop: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#4f46e5',
  },
});
