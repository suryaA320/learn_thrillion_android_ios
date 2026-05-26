import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken, unregisterPushToken } from './notificationApi';

const PUSH_TOKEN_KEY = '@learn_thrillion_expo_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function getEasProjectId() {
  const fromEnv =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_EAS_PROJECT_ID : null;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4f46e5',
  });
}

export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    return { granted: false, reason: 'simulator' };
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return { granted: finalStatus === 'granted', reason: finalStatus };
}

export async function getExpoPushTokenString() {
  const projectId = getEasProjectId();
  if (!projectId) {
    throw new Error(
      'Set EXPO_PUBLIC_EAS_PROJECT_ID in .env (run `eas init` in the app folder to get a project ID).'
    );
  }
  await ensureAndroidChannel();
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

/** Register device with backend; returns token or null if unavailable. */
export async function syncPushTokenWithServer() {
  const perm = await requestNotificationPermissions();
  if (!perm.granted) return null;

  try {
    const token = await getExpoPushTokenString();
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await registerPushToken({ token, platform });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (e) {
    console.warn('[push] registration failed:', e?.message || e);
    return null;
  }
}

export async function clearPushTokenFromServer() {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await unregisterPushToken({ token });
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    } else {
      await unregisterPushToken();
    }
  } catch {
    /* ignore */
  }
}
