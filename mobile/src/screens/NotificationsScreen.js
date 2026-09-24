import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notificationsApi';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function NotificationRow({ notification, onPress }) {
  const unread = notification.read_at === null;
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(notification)} disabled={!unread}>
      {unread ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotSpacer} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.body}>{notification.body}</Text>
        <Text style={styles.time}>{formatDateTime(notification.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    listNotifications()
      .then((res) => setNotifications(res.items))
      .catch(() => setNotifications([]));
  }, []);

  useFocusEffect(load);

  async function handleRefresh() {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }

  async function handlePress(notification) {
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)));
    markNotificationRead(notification.id).catch(() => {});
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    markAllNotificationsRead().catch(() => {});
  }

  const hasUnread = (notifications || []).some((n) => n.read_at === null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Notifications</Text>
        {hasUnread ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllLink}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={notifications || []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
        renderItem={({ item }) => <NotificationRow notification={item} onPress={handlePress} />}
        ListEmptyComponent={
          notifications === null ? (
            <Text style={styles.muted}>Loading...</Text>
          ) : (
            <EmptyState title="No notifications yet" subtitle="Reminders and booking updates will show up here." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  markAllLink: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
    marginTop: 5,
    marginRight: 10,
  },
  unreadDotSpacer: {
    width: 8,
    marginRight: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
