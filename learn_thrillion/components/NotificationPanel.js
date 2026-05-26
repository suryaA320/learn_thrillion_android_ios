import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNotifications } from '../context/NotificationContext';

function formatWhen(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
}

export default function NotificationPanel() {
  const {
    enabled,
    unreadCount,
    items,
    loadingList,
    panelOpen,
    closePanel,
    handleOpenNotification,
  } = useNotifications();

  return (
    <Modal visible={panelOpen} animationType="slide" transparent onRequestClose={closePanel}>
      <Pressable style={styles.overlay} onPress={closePanel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            {enabled && unreadCount > 0 ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{unreadCount > 99 ? '99+' : unreadCount} new</Text>
              </View>
            ) : null}
            <TouchableOpacity onPress={closePanel} style={styles.closeBtn} accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!enabled ? (
            <Text style={styles.empty}>Notifications are not available for your role.</Text>
          ) : (
            <>
              <Text style={styles.subtitle}>Unread only — tap to open and mark as read</Text>
              {loadingList ? (
                <ActivityIndicator style={styles.loader} color="#4f46e5" />
              ) : items.length === 0 ? (
                <Text style={styles.empty}>No unread notifications.</Text>
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.list}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.item}
                      onPress={() => handleOpenNotification(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.body ? (
                        <Text style={styles.itemBody} numberOfLines={3}>
                          {item.body}
                        </Text>
                      ) : null}
                      <Text style={styles.itemTime}>{formatWhen(item.created_at)}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    paddingBottom: 24,
    minHeight: 280,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  pill: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 18, color: '#6b7280' },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 14 },
  loader: { marginVertical: 24 },
  list: { paddingHorizontal: 12 },
  item: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  itemBody: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
  itemTime: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
});
