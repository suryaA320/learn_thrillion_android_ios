import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api, { API_ORIGIN } from '../utils/api_endpoints/api';
import { AUTH_KEYS } from '../utils/tokenStorage';

const AuthContext = createContext(null);

function buildUserFromStatus(data, prev = {}) {
  if (!data?.authenticated || data.role == null || data.role === 'N/A') return null;
  return {
    ...prev,
    id: data.user_id,
    email: data.user_email ?? prev.email,
    first_name: data.first_name ?? data.username ?? prev.first_name,
    last_name: data.last_name ?? prev.last_name ?? '',
    mobile_number: data.mobile_number ?? prev.mobile_number ?? '',
    user_status: data.user_status ?? prev.user_status ?? '',
    role: data.role,
    school_id: data.school_id ?? prev.school_id ?? null,
    school_name: data.school_name ?? prev.school_name ?? null,
    school: data.school_id ?? prev.school ?? null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('status/');
      let prev = {};
      try {
        const raw = await AsyncStorage.getItem(AUTH_KEYS.user);
        prev = raw ? JSON.parse(raw) : {};
      } catch {
        prev = {};
      }
      const merged = buildUserFromStatus(data, prev);
      if (merged) {
        setUser(merged);
        await AsyncStorage.setItem(AUTH_KEYS.user, JSON.stringify(merged));
      } else {
        setUser(null);
        await AsyncStorage.multiRemove([AUTH_KEYS.user, AUTH_KEYS.access, AUTH_KEYS.refresh]).catch(() => {});
      }
      return merged;
    } catch (e) {
      if (e?.response?.status === 401) {
        await AsyncStorage.multiRemove([AUTH_KEYS.user, AUTH_KEYS.access, AUTH_KEYS.refresh]).catch(() => {});
        setUser(null);
      }
      throw e;
    }
  }, []);

  const performSignOut = useCallback(async () => {
    try {
      const access = await AsyncStorage.getItem(AUTH_KEYS.access);
      await axios.post(`${API_ORIGIN}/logout/`, {}, { timeout: 15000, headers: access ? { Authorization: `Bearer ${access}` } : {} });
    } catch {
      /* ignore */
    }
    await AsyncStorage.multiRemove([AUTH_KEYS.user, AUTH_KEYS.access, AUTH_KEYS.refresh]).catch(() => {});
    setUser(null);
  }, []);

  /** User-initiated sign out — shows confirmation first (bottom nav, profile menu, etc.). */
  const signOut = useCallback(() => {
    setLogoutModalVisible(true);
  }, []);

  const cancelLogout = useCallback(() => {
    if (logoutBusy) return;
    setLogoutModalVisible(false);
  }, [logoutBusy]);

  const confirmLogout = useCallback(async () => {
    setLogoutBusy(true);
    try {
      await performSignOut();
      setLogoutModalVisible(false);
    } finally {
      setLogoutBusy(false);
    }
  }, [performSignOut]);

  const signIn = useCallback(async (userPayload, tokens = null) => {
    if (!userPayload) return;
    const pairs = [[AUTH_KEYS.user, JSON.stringify(userPayload)]];
    if (tokens?.access) pairs.push([AUTH_KEYS.access, String(tokens.access)]);
    if (tokens?.refresh) pairs.push([AUTH_KEYS.refresh, String(tokens.refresh)]);
    await AsyncStorage.multiSet(pairs);
    setUser(userPayload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = await AsyncStorage.getItem(AUTH_KEYS.access);
        if (!access) {
          await AsyncStorage.multiRemove([AUTH_KEYS.user, AUTH_KEYS.access, AUTH_KEYS.refresh]).catch(() => {});
          if (!cancelled) setUser(null);
          return;
        }
        const { data } = await api.get('status/');
        if (cancelled) return;
        let prev = {};
        try {
          const raw = await AsyncStorage.getItem(AUTH_KEYS.user);
          prev = raw ? JSON.parse(raw) : {};
        } catch {
          prev = {};
        }
        const u = buildUserFromStatus(data, prev);
        if (u) {
          setUser(u);
          await AsyncStorage.setItem(AUTH_KEYS.user, JSON.stringify(u));
        } else setUser(null);
      } catch (e) {
        if (cancelled) return;
        if (e?.response?.status === 401) {
          await AsyncStorage.multiRemove([AUTH_KEYS.user, AUTH_KEYS.access, AUTH_KEYS.refresh]).catch(() => {});
          setUser(null);
        } else {
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ user, role: user?.role, ready, signIn, signOut, refreshUser }),
    [user, ready, signIn, signOut, refreshUser]
  );
  return (
    <AuthContext.Provider value={value}>
      {children}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={logoutStyles.root}>
          <Pressable style={logoutStyles.backdrop} onPress={cancelLogout} accessibilityLabel="Dismiss" />
          <View style={logoutStyles.card} accessibilityViewIsModal>
            <Text style={logoutStyles.title}>Sign out?</Text>
            <Text style={logoutStyles.body}>You will need to sign in again to use the app.</Text>
            <View style={logoutStyles.actions}>
              <TouchableOpacity
                style={[logoutStyles.btn, logoutStyles.btnSecondary]}
                onPress={cancelLogout}
                disabled={logoutBusy}
                activeOpacity={0.85}
              >
                <Text style={logoutStyles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[logoutStyles.btn, logoutStyles.btnDanger]}
                onPress={confirmLogout}
                disabled={logoutBusy}
                activeOpacity={0.85}
              >
                {logoutBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={logoutStyles.btnDangerText}>Sign out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AuthContext.Provider>
  );
}

const logoutStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    zIndex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14532d',
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  btnDanger: {
    backgroundColor: '#dc2626',
  },
  btnDangerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
