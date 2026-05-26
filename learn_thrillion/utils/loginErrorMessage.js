/**
 * Same contract as web `src/Utils/loginErrorMessage.js` — server message first.
 */
export function formatLoginApiError(err) {
  const d = err?.response?.data;
  const status = err?.response?.status;

  if (d == null || d === '') {
    if (err?.code === 'ECONNABORTED') {
      return 'Request timed out. Check your connection and try again.';
    }
    if (err?.code === 'ERR_NETWORK') {
      return 'Network error. The server could not be reached.';
    }
    if (typeof err?.message === 'string' && err.message.trim()) {
      return err.message.trim();
    }
    return status ? `Request failed (HTTP ${status}).` : 'Login failed.';
  }

  if (typeof d === 'string' && d.trim()) {
    return d.trim();
  }

  if (typeof d.error === 'string' && d.error.trim()) {
    return d.error.trim();
  }
  if (typeof d.message === 'string' && d.message.trim()) {
    return d.message.trim();
  }
  if (typeof d.detail === 'string' && d.detail.trim()) {
    return d.detail.trim();
  }

  if (Array.isArray(d.detail)) {
    const parts = d.detail
      .map((x) => {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object') {
          if (typeof x.string === 'string') return x.string;
          if (typeof x.msg === 'string') return x.msg;
          if (typeof x.message === 'string') return x.message;
        }
        return null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }

  if (Array.isArray(d.non_field_errors) && d.non_field_errors.length) {
    return d.non_field_errors.map(String).join(' ');
  }

  const reserved = new Set(['detail', 'status', 'headers']);
  const fieldMsgs = [];
  for (const key of Object.keys(d)) {
    if (reserved.has(key)) continue;
    const v = d[key];
    if (typeof v === 'string' && v.trim()) {
      fieldMsgs.push(`${key}: ${v.trim()}`);
      continue;
    }
    if (Array.isArray(v) && v.length) {
      const flat = v
        .map((x) => (typeof x === 'string' ? x : x != null ? String(x) : ''))
        .filter(Boolean)
        .join('; ');
      if (flat) {
        fieldMsgs.push(`${key}: ${flat}`);
      }
    }
  }
  if (fieldMsgs.length) {
    return fieldMsgs.join(' ');
  }

  try {
    const s = JSON.stringify(d);
    if (s && s !== '{}') return s;
  } catch {
    /* ignore */
  }

  return status ? `Login failed (HTTP ${status}).` : 'Login failed.';
}
