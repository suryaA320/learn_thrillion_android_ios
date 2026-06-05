import { isAuthSessionError } from './authSession';

/**
 * User-facing message for API failures (non-login screens).
 */
export function formatApiError(err, fallback = 'Request failed.') {
  if (!err) return fallback;
  if (isAuthSessionError(err) || err?._sessionExpired) {
    return 'Your session has expired. Please sign in again.';
  }
  const d = err?.response?.data;
  if (typeof d?.detail === 'string' && d.detail.trim()) return d.detail.trim();
  if (typeof d?.error === 'string' && d.error.trim()) return d.error.trim();
  if (typeof d?.message === 'string' && d.message.trim()) return d.message.trim();
  if (typeof err?.message === 'string' && err.message.trim()) return err.message.trim();
  return fallback;
}
