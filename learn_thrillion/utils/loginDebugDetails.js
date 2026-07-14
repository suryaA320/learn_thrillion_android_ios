import { API_BASE_URL, API_ORIGIN, API_ORIGIN_SOURCE } from '../config/api';

function stringifyBody(data) {
  if (data == null || data === '') return '';
  if (typeof data === 'string') return data.slice(0, 800);
  try {
    return JSON.stringify(data).slice(0, 800);
  } catch {
    return String(data).slice(0, 800);
  }
}

/**
 * Full login failure context for on-device debugging (APK / staging).
 */
export function buildLoginDebugDetails(err, loginPath = 'token/login/') {
  const loginUrl = `${API_BASE_URL}${loginPath}`;
  const lines = [
    `API origin: ${API_ORIGIN}`,
    `API source: ${API_ORIGIN_SOURCE}`,
    `API base: ${API_BASE_URL}`,
    `Login URL: ${loginUrl}`,
  ];

  if (err?.code) lines.push(`Axios code: ${err.code}`);
  if (err?.message) lines.push(`Axios message: ${err.message}`);

  const status = err?.response?.status;
  if (status != null) lines.push(`HTTP status: ${status}`);

  const body = stringifyBody(err?.response?.data);
  if (body) lines.push(`Response body: ${body}`);

  if (!err?.response && err?.request) {
    lines.push('Note: request was sent but no response (DNS, SSL, timeout, or blocked).');
  }

  return lines.join('\n');
}
