import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';
import { IconButton, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { isFacultyLikeRole, isParentRole } from '../constants/roles';

/**
 * @param {{ title?: string }} props
 * When `title` is set (e.g. per-screen header), it shows in the center; otherwise a short greeting from the signed-in user.
 */
export default function TopNavigationStylish({ title, showBack, onBack } = {}) {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { enabled: notifyEnabled, unreadCount, openPanel } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
  };

  const centerLabel =
    title && String(title).trim()
      ? String(title).trim()
      : user?.first_name
        ? `Hello, ${user.first_name}`
        : 'Hello';

  return (
    <View>
      <View style={styles.navStyles}>
        {showBack ? (
          <TouchableOpacity style={styles.childContent} onPress={handleBack} accessibilityLabel="Go back">
            <IconButton icon="arrow-left" size={24} iconColor="#4f46e5" style={styles.backBtn} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.childContent} onPress={() => setMenuOpen(!menuOpen)}>
            <Image
              source={
                user?.profile_image_url
                  ? { uri: user.profile_image_url }
                  : require('../assets/FacultyAvatar.png')
              }
              style={styles.avatarImg}
            />
          </TouchableOpacity>
        )}

        <View style={styles.centerContent}>
          <Text style={styles.titleText} numberOfLines={1}>
            {centerLabel}
          </Text>
        </View>

        <View style={styles.bellWrap}>
          <IconButton
            icon="bell-ring-outline"
            size={26}
            onPress={() => {
              setMenuOpen(false);
              openPanel();
            }}
            accessibilityLabel="Notifications"
          />
          {notifyEnabled && unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {menuOpen && (
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Card style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                if (isFacultyLikeRole(user?.role)) {
                  navigation.navigate('FacultyProfile');
                } else if (isParentRole(user?.role)) {
                  navigation.navigate('ParentProfile');
                }
              }}
            >
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                signOut();
              }}
            >
              <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </Card>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navStyles: {
    height: 60,
    backgroundColor: 'transparent',
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childContent: {
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  avatarImg: {
    height: 50,
    width: 50,
    borderRadius: 25,
  },
  backBtn: {
    margin: 0,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#959596',
  },
  overlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  menuCard: {
    position: 'absolute',
    left: 20,
    top: 0,
    width: 180,
    borderRadius: 12,
    elevation: 6,
  },
  menuItem: {
    padding: 14,
  },
  menuText: {
    fontSize: 15,
    color: '#111',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  bellWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
