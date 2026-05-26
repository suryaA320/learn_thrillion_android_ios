import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { notificationsEnabledForRole } from '../constants/notifications';
import {
  fetchNotificationUnreadCount,
  fetchNotifications,
  markNotificationRead,
} from '../utils/notificationApi';
import {
  clearPushTokenFromServer,
  syncPushTokenWithServer,
} from '../utils/pushNotifications';
import { navigateFromNotification } from '../navigation/navigationRef';

const NotificationContext = createContext(null);

function dedupeUnreadNotifications(items) {
  const seen = new Set();
  return (items || []).filter((n) => {
    if (n?.is_read) return false;
    if (n?.kind !== 'ticket_message') return true;
    const key = `${n.ticket_id || ''}|${(n.title || '').trim()}|${(n.body || '').trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function NotificationProvider({ children }) {
  const { user, ready } = useAuth();
  const enabled = ready && user && notificationsEnabledForRole(user.role);

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const refreshUnread = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await fetchNotificationUnreadCount();
      const n = Number(data?.unread_count ?? 0);
      setUnreadCount(Number.isFinite(n) ? n : 0);
      await Notifications.setBadgeCountAsync(Math.min(n, 99));
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const loadUnreadList = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }
    setLoadingList(true);
    try {
      const raw = await fetchNotifications({ unread: true });
      const list = Array.isArray(raw) ? raw : [];
      setItems(dedupeUnreadNotifications(list));
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, [enabled]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    loadUnreadList();
    refreshUnread();
  }, [loadUnreadList, refreshUnread]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleOpenNotification = useCallback(
    async (notif) => {
      if (!notif?.id || notif.is_read) return;
      setItems((prev) => prev.filter((x) => x.id !== notif.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      closePanel();
      try {
        await markNotificationRead(notif.id);
        await refreshUnread();
      } catch {
        loadUnreadList();
        refreshUnread();
      }
      if (notif.ticket_id || notif.kind === 'ticket_message') {
        navigateFromNotification({ kind: 'ticket_message', ticket_id: notif.ticket_id });
      } else if (notif.kind === 'assigned_task') {
        navigateFromNotification({ kind: 'assigned_task' });
      }
    },
    [closePanel, loadUnreadList, refreshUnread]
  );

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      setItems([]);
      Notifications.setBadgeCountAsync(0).catch(() => {});
      return undefined;
    }
    refreshUnread();
    const id = setInterval(refreshUnread, 25000);
    return () => clearInterval(id);
  }, [enabled, refreshUnread]);

  useEffect(() => {
    if (!enabled) return undefined;
    syncPushTokenWithServer();
    return () => {
      clearPushTokenFromServer();
    };
  }, [enabled, user?.id]);

  const responseListener = useRef(null);
  const receivedListener = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    receivedListener.current = Notifications.addNotificationReceivedListener(() => {
      refreshUnread();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      refreshUnread();
      navigateFromNotification(data);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const data = response?.notification?.request?.content?.data || {};
        navigateFromNotification(data);
      })
      .catch(() => {});

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [enabled, refreshUnread]);

  const value = useMemo(
    () => ({
      enabled,
      unreadCount,
      items,
      loadingList,
      panelOpen,
      openPanel,
      closePanel,
      refreshUnread,
      loadUnreadList,
      handleOpenNotification,
    }),
    [
      enabled,
      unreadCount,
      items,
      loadingList,
      panelOpen,
      openPanel,
      closePanel,
      refreshUnread,
      loadUnreadList,
      handleOpenNotification,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
