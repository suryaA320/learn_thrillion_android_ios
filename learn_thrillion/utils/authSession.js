import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { AUTH_KEYS } from './tokenStorage';

/** Access token lifetime on API is 30 minutes — refresh before it expires. */
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000;
const PROACTIVE_INTERVAL_MS = 25 * 60 * 1000;

const REQUEST_MS = 60000;

let refreshInFlight = null;
let refreshQueue = [];
let lastRefreshAt = 0;
let sessionHandlers = new Set();
let proactiveTimer = null;

function resolveRefreshQueue(err) {
  refreshQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve()));
  refreshQueue = [];
}

/** Strip whitespace / accidental JSON quotes from stored tokens. */
export function sanitizeToken(raw) {
  if (raw == null) return '';
  let s = String(raw).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function decodeJwtPayload(token) {
  try {
    const parts = sanitizeToken(token).split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(padded)
        : null;
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getAccessTokenExpiryMs(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function isAccessTokenExpired(accessToken, skewMs = REFRESH_BEFORE_EXPIRY_MS) {
  const exp = getAccessTokenExpiryMs(accessToken);
  if (!exp) return false;
  return Date.now() >= exp - skewMs;
}

export async function getStoredAccessToken() {
  const raw = await AsyncStorage.getItem(AUTH_KEYS.access);
  return sanitizeToken(raw);
}

export async function getStoredRefreshToken() {
  const raw = await AsyncStorage.getItem(AUTH_KEYS.refresh);
  return sanitizeToken(raw);
}

export async function setStoredTokens({ access, refresh } = {}) {
  const pairs = [];
  if (access != null) pairs.push([AUTH_KEYS.access, sanitizeToken(access)]);
  if (refresh != null) pairs.push([AUTH_KEYS.refresh, sanitizeToken(refresh)]);
  if (pairs.length) await AsyncStorage.multiSet(pairs);
}

export async function clearStoredSession() {
  await AsyncStorage.multiRemove([AUTH_KEYS.access, AUTH_KEYS.refresh, AUTH_KEYS.user]).catch(
    () => {}
  );
}

export function registerSessionExpiredHandler(handler) {
  sessionHandlers.add(handler);
  return () => sessionHandlers.delete(handler);
}

async function notifySessionExpired(reason) {
  const err = reason || new Error('Session expired');
  err._sessionExpired = true;
  await clearStoredSession();
  for (const fn of sessionHandlers) {
    try {
      await fn(err);
    } catch {
      /* ignore */
    }
  }
  return err;
}

export function markSessionExpired(error) {
  const err = error || new Error('Session expired');
  err._sessionExpired = true;
  return err;
}

export function isAuthSessionError(err) {
  if (!err) return false;
  if (err._sessionExpired) return true;
  const status = err?.response?.status;
  if (status !== 401 && status !== 403) return false;
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') {
    const d = detail.toLowerCase();
    return (
      d.includes('token') ||
      d.includes('credentials') ||
      d.includes('not valid') ||
      d.includes('authentication')
    );
  }
  if (Array.isArray(detail)) {
    return detail.some(
      (x) =>
        typeof x === 'string' &&
        /token|credentials|not valid/i.test(x)
    );
  }
  return status === 401;
}

/**
 * Refresh access token using the stored refresh token (no Bearer on this call).
 */
export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refresh = await getStoredRefreshToken();
      if (!refresh) {
        throw await notifySessionExpired(new Error('no refresh token'));
      }
      const { data } = await axios.post(
        `${API_BASE_URL}token/refresh/`,
        { refresh },
        {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: REQUEST_MS,
        }
      );
      const access = sanitizeToken(data?.access);
      if (!access) {
        throw await notifySessionExpired(new Error('refresh missing access'));
      }
      const pairs = [[AUTH_KEYS.access, access]];
      const newRefresh = sanitizeToken(data?.refresh);
      if (newRefresh) pairs.push([AUTH_KEYS.refresh, newRefresh]);
      await AsyncStorage.multiSet(pairs);
      lastRefreshAt = Date.now();
      resolveRefreshQueue(null);
      return access;
    } catch (e) {
      const err = e?._sessionExpired ? e : await notifySessionExpired(e);
      resolveRefreshQueue(err);
      throw markSessionExpired(err);
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Await in-flight refresh (used by API interceptor queue). */
export function getRefreshInFlight() {
  return refreshInFlight;
}

/**
 * Returns a valid access token, refreshing proactively when near expiry.
 */
export async function getValidAccessToken() {
  let access = await getStoredAccessToken();
  if (!access) return null;
  if (!isAccessTokenExpired(access)) return access;
  try {
    return await refreshAccessToken();
  } catch {
    return null;
  }
}

/** Call on app start and when returning to foreground. */
export async function ensureFreshAccessToken() {
  const access = await getStoredAccessToken();
  if (!access) return false;
  if (Date.now() - lastRefreshAt < PROACTIVE_INTERVAL_MS && !isAccessTokenExpired(access, 60 * 1000)) {
    return true;
  }
  if (!isAccessTokenExpired(access)) {
    return true;
  }
  try {
    await refreshAccessToken();
    return true;
  } catch {
    return false;
  }
}

export function startProactiveTokenRefresh() {
  if (proactiveTimer) return;
  const tick = () => {
    if (AppState.currentState === 'active') {
      ensureFreshAccessToken().catch(() => {});
    }
  };
  proactiveTimer = setInterval(tick, PROACTIVE_INTERVAL_MS);
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') tick();
  });
  return () => {
    if (proactiveTimer) {
      clearInterval(proactiveTimer);
      proactiveTimer = null;
    }
    sub.remove();
  };
}

export function waitForRefreshQueue() {
  if (refreshInFlight) return refreshInFlight;
  return Promise.resolve();
}
