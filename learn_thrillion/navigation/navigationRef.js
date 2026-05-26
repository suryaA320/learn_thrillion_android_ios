import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateFromNotification(data) {
  if (!navigationRef.isReady() || !data) return;

  const kind = data.kind;
  const ticketId = data.ticket_id;

  if (ticketId || kind === 'ticket_message') {
    navigationRef.navigate('FacultyComplaints', { initialTab: 'view' });
    return;
  }
  if (kind === 'assigned_task') {
    navigationRef.navigate('FacultyHome');
    return;
  }
}
