import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { AUTH_KEYS } from '../tokenStorage';

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

api.interceptors.request.use(async (config) => {
  try {
    const access = await AsyncStorage.getItem(AUTH_KEYS.access);
    if (access) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${access}`;
    }
  } catch {
    /* ignore */
  }
  return config;
});

const isAuthUrl = (config) => {
  const u = String(config?.url || '');
  return u.includes('token/login') || u.includes('token/refresh');
};

let refreshing = false;
let queue = [];
const resolveQueue = (err) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve()));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (!original || isAuthUrl(original)) throw err;

    if (err.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(() => api(original));
      }
      original._retry = true;
      refreshing = true;
      try {
        const refresh = await AsyncStorage.getItem(AUTH_KEYS.refresh);
        if (!refresh) throw new Error('no refresh');
        const { data } = await axios.post(
          `${API_BASE_URL}token/refresh/`,
          { refresh },
          { headers: { 'Content-Type': 'application/json' }, timeout: REQUEST_MS }
        );
        if (data?.access) await AsyncStorage.setItem(AUTH_KEYS.access, data.access);
        resolveQueue(null);
        return api(original);
      } catch (e) {
        resolveQueue(e);
        await AsyncStorage.multiRemove([AUTH_KEYS.access, AUTH_KEYS.refresh, AUTH_KEYS.user]);
        throw e;
      } finally {
        refreshing = false;
      }
    }
    throw err;
  }
);

export default api;
