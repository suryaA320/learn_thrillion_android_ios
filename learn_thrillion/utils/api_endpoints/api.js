import axios from 'axios';
import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import {
  clearStoredSession,
  getRefreshInFlight,
  getValidAccessToken,
  isAuthSessionError,
  markSessionExpired,
  refreshAccessToken,
  waitForRefreshQueue,
} from '../authSession';

export { API_ORIGIN };

/** Longer timeout: first request / slow Wi‑Fi / Windows firewall delay */
const REQUEST_MS = 60000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const isAuthUrl = (config) => {
  const u = String(config?.url || '');
  return u.includes('token/login') || u.includes('token/refresh');
};

function stripAuthorization(config) {
  if (!config?.headers) return;
  delete config.headers.Authorization;
  delete config.headers.authorization;
}

api.interceptors.request.use(async (config) => {
  if (isAuthUrl(config)) {
    stripAuthorization(config);
    return config;
  }
  const inFlight = getRefreshInFlight();
  if (inFlight) {
    try {
      await inFlight;
    } catch {
      /* session handler will clear user */
    }
  }
  try {
    const access = await getValidAccessToken();
    if (access) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${access}`;
    } else {
      stripAuthorization(config);
    }
  } catch {
    stripAuthorization(config);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (!original || isAuthUrl(original)) {
      throw err;
    }

    const shouldRetry =
      !original._retry &&
      (err.response?.status === 401 || isAuthSessionError(err));

    if (!shouldRetry) {
      throw err;
    }

    original._retry = true;

    try {
      if (getRefreshInFlight()) {
        await waitForRefreshQueue();
      } else {
        await refreshAccessToken();
      }
      stripAuthorization(original);
      return api(original);
    } catch (refreshErr) {
      await clearStoredSession();
      throw markSessionExpired(refreshErr);
    }
  }
);

export default api;
