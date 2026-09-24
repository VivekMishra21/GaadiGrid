import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getUnreadCount } from '../api/notificationsApi';
import { listReminders } from '../api/vehiclesApi';
import { LogoWordmark } from '../components/LogoWordmark';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';

const REMINDER_LABEL = {
  insurance: 'Insurance',
  puc: 'PUC',
  service: 'Service due',
};

function ReminderRow({ reminder }) {
  const isUrgent = reminder.urgency !== 'OK';
  const days = reminder.days_remaining;
  return (
    <View style={styles.reminderRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.reminderLabel}>{REMINDER_LABEL[reminder.type] || reminder.type}</Text>
        <Text style={styles.reminderVehicle}>{reminder.registration_number}</Text>
      </View>
      <Text style={[styles.reminderValue, isUrgent && styles.reminderUrgent]}>
        {days < 0 ? 'Overdue' : `${days} day${days === 1 ? '' : 's'} left`}
      </Text>
    </View>
  );
}

export function HomeScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { vehicles, status, fetchVehicles } = useVehicleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    fetchVehicles().catch(() => {});
    listReminders()
      .then(setReminders)
      .catch(() => setReminders([]));
    getUnreadCount()
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => {});
  }, [fetchVehicles]);

  useEffect(load, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchVehicles().catch(() => {}), listReminders().then(setReminders).catch(() => {})]);
    setRefreshing(false);
  }

  const defaultVehicle = vehicles.find((v) => v.is_default) || vehicles[0];
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
    >
      <View style={styles.header}>
        <LogoWordmark size={34} variant="dark" />
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { screen: 'Notifications' })}
          style={styles.bellButton}
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Text style={styles.bell} accessibilityElementsHidden importantForAccessibility="no">
            🔔
          </Text>
          {unreadCount > 0 ? (
            <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <Text style={styles.greeting}>Hi {firstName}</Text>

      {status === 'loading' && vehicles.length === 0 ? (
        <Text style={styles.muted}>Loading your vehicle...</Text>
      ) : defaultVehicle ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {defaultVehicle.brand} {defaultVehicle.model}
          </Text>
          <Text style={styles.cardSubtitle}>{defaultVehicle.registration_number}</Text>

          {reminders.length > 0 ? (
            <View style={styles.reminders}>
              {reminders.map((r) => (
                <ReminderRow key={`${r.vehicle_id}-${r.type}`} reminder={r} />
              ))}
            </View>
          ) : (
            <Text style={[styles.cardSubtitle, { marginTop: 16 }]}>No upcoming reminders across your vehicles.</Text>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No vehicle added yet</Text>
          <Text style={styles.cardSubtitle}>Add one from the Profile tab to see reminders here.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bellButton: {
    padding: 4,
  },
  bell: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.orange,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: 20,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 18,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  reminders: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  reminderVehicle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  reminderValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  reminderUrgent: {
    color: colors.orange,
  },
});
