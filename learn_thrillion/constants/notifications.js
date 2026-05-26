/** Roles that receive in-app + push notifications (matches web Header.js). */
export const NOTIFICATION_ROLES = new Set([1, 2, 3, 4, 7, 13, 14]);

export function notificationsEnabledForRole(role) {
  return NOTIFICATION_ROLES.has(Number(role));
}
