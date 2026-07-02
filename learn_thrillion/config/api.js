import { Platform } from 'react-native';
import Constants from 'expo-constants';

function normalizeOrigin(value) {
  if (value == null || value === '') return null;
  let s = String(value).trim().replace(/\/$/, '');
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  return s.replace(/\/$/, '');
}

/**
 * Expo Go / dev client often exposes the machine running Metro — same machine as Django in dev.
 * Example: `192.168.1.12:8081` → `http://192.168.1.12:8000`
 */
function originFromExpoBundlerHost() {
  try {
    const c = Constants;
    const raw =
      c.expoGoConfig?.debuggerHost ||
      c.expoConfig?.hostUri ||
      c.manifest2?.extra?.expoGo?.debuggerHost ||
      c.manifest?.debuggerHost;
    if (!raw || typeof raw !== 'string') return null;

    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        const host = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname;
        if (!host) return null;
        return `http://${host}:8000`;
      } catch {
        return null;
      }
    }

    const host = raw.split(':')[0];
    if (!host) return null;
    if (host === 'localhost') return 'http://127.0.0.1:8000';
    return `http://${host}:8000`;
  } catch {
    return null;
  }
}

const fromEnv = normalizeOrigin(
  typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_ORIGIN : null
);
const fromBundler = normalizeOrigin(originFromExpoBundlerHost());

const emulatorFallback = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://127.0.0.1:8000',
  default: 'http://127.0.0.1:8000',
});

/**
 * 1) `.env` → `EXPO_PUBLIC_API_ORIGIN=...` (restart Expo)
 * 2) Else Expo bundler host (Expo Go on a phone, same Wi‑Fi)
 * 3) Else emulator loopback defaults
 *
 * EAS preview/production builds use eas.json env (same as learn_thrillion_ui
 * REACT_APP_API_BASE_URL → https://staging.learnthrillion.com).
 */
export const API_ORIGIN = fromEnv || fromBundler || emulatorFallback;

export const API_BASE_URL = `${String(API_ORIGIN).replace(/\/$/, '')}/api/`;
