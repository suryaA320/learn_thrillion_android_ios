import api from './api_endpoints/api';
import { apiOriginPath } from './schoolApi';

export function fetchNotificationUnreadCount() {
  return api.get(apiOriginPath('/faculty/notifications/unread-count/')).then((r) => r.data);
}

export function fetchNotifications({ unread = true } = {}) {
  const params = {};
  if (unread) params.unread = 'true';
  return api.get(apiOriginPath('/faculty/notifications/'), { params }).then((r) => r.data);
}

export function markNotificationRead(notificationId) {
  const id = encodeURIComponent(String(notificationId || '').trim());
  return api.post(apiOriginPath(`/faculty/notifications/${id}/read/`), {}).then((r) => r.data);
}

export function registerPushToken({ token, platform }) {
  return api
    .post(apiOriginPath('/faculty/push-token/'), { token, platform })
    .then((r) => r.data);
}

export function unregisterPushToken({ token } = {}) {
  return api
    .delete(apiOriginPath('/faculty/push-token/'), { data: token ? { token } : {} })
    .then((r) => r.data);
}
