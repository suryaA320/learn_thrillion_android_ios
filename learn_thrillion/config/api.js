import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Used by EAS preview/production builds (see eas.json). */
export const DEFAULT_API_ORIGIN = 'https://staging.learnthrillion.com';

function normalizeOrigin(value) {
  if (value == null || value === '') return null;
  let s = String(value).trim().replace(/\/$/, '');
  // Strip accidental inline comments from env ("http://x:8000  #Local")
  const hash = s.search(/\s+#/);
  if (hash !== -1) s = s.slice(0, hash).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  return s.replace(/\/$/, '');
}

function readExtraApiOrigin() {
  try {
    const extra =
      Constants.expoConfig?.extra ??
      Constants.manifest2?.extra ??
      Constants.manifest?.extra;
    return normalizeOrigin(extra?.apiOrigin);
  } catch {
    return null;
  }
}

/**
 * Expo Go / dev client: Metro host → local Django on :8000
 * Always matches the machine the phone is already talking to for the bundle.
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
    // Expo tunnel / non-LAN hosts cannot reach your machine:8000
    if (host.includes('exp.direct') || host.endsWith('.expo.dev')) return null;
    return `http://${host}:8000`;
  } catch {
    return null;
  }
}

const fromEnv = normalizeOrigin(
  typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_ORIGIN : null
);
const fromExtra = readExtraApiOrigin();
const fromBundler = normalizeOrigin(originFromExpoBundlerHost());

const emulatorFallback = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://127.0.0.1:8000',
  default: 'http://127.0.0.1:8000',
});

/**
 * Automated resolution — never toggle .env for local vs staging:
 *
 * • __DEV__ (expo start / Expo Go): LAN from Metro → emulator loopback
 * • Release / EAS APK: EXPO_PUBLIC_API_ORIGIN (eas.json) → extra → staging
 *
 * Optional override: set EXPO_PUBLIC_API_ORIGIN anytime (dev or build).
 */
let resolvedOrigin;
let resolvedSource;

if (fromEnv) {
  resolvedOrigin = fromEnv;
  resolvedSource = 'env';
} else if (__DEV__) {
  if (fromBundler) {
    resolvedOrigin = fromBundler;
    resolvedSource = 'expo-bundler';
  } else if (emulatorFallback) {
    resolvedOrigin = emulatorFallback;
    resolvedSource = 'emulator';
  } else {
    resolvedOrigin = DEFAULT_API_ORIGIN;
    resolvedSource = 'default';
  }
} else if (fromExtra) {
  resolvedOrigin = fromExtra;
  resolvedSource = 'app.config';
} else {
  resolvedOrigin = DEFAULT_API_ORIGIN;
  resolvedSource = 'default';
}

export const API_ORIGIN = resolvedOrigin;
export const API_BASE_URL = `${String(API_ORIGIN).replace(/\/$/, '')}/api/`;
export const API_ORIGIN_SOURCE = resolvedSource;
