import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { getUnreadCount } from '../api/notificationsApi';
import { Card } from '../components/Card';
import { FadeIn } from '../components/FadeIn';
import { Icon } from '../components/Icon';
import { IconBadge } from '../components/IconBadge';
import { LogoWordmark } from '../components/LogoWordmark';
import { Button } from '../components/Button';
import { ReminderRow, TimelineList } from '../components/VehicleActivity';
import { VehicleSwitcher } from '../components/VehicleSwitcher';
import { useVehicleInsights } from '../hooks/useVehicleInsights';
import { useAuthStore } from '../store/authStore';
import { selectCurrentVehicle, useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { radius, shadow, type } from '../theme/tokens';
import { fuelLabel, formatINR, vehicleTitle } from '../utils/format';

// Home answers one question: what is happening with my vehicle? Everything below hangs off
// the currently selected vehicle — nothing here is a generic feature grid.
export function HomeScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const vehicle = useVehicleStore(selectCurrentVehicle);
  const status = useVehicleStore((s) => s.status);
  const vehicleCount = useVehicleStore((s) => s.vehicles.length);
  const fetchVehicles = useVehicleStore((s) => s.fetchVehicles);
  const insights = useVehicleInsights(vehicle?.id, { timelineLimit: 3, months: 6 });

  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(() => {
    getUnreadCount()
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchVehicles().catch(() => {});
    loadUnread();
  }, [fetchVehicles, loadUnread]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchVehicles().catch(() => {}), insights.reload(), loadUnread()]);
    setRefreshing(false);
  }

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const goToServices = (group) => navigation.navigate('Services', { screen: 'ServicesList', params: { group } });
  const goToGarage = (params) => navigation.navigate('Profile', { screen: 'ProfileHome', params });
  const addVehicle = () => navigation.navigate('Profile', { screen: 'VehicleForm', params: { mode: 'add' } });

  const actionable = insights.reminders.filter((r) => r.urgency !== 'OK');
  const thisMonth = insights.cost?.by_month?.[insights.cost.by_month.length - 1];
  const hasExpenses = (insights.cost?.all_time_total || 0) > 0;

  const quickActions = [
    { label: 'Fuel & CNG', icon: 'fuel', tone: 'green', onPress: () => navigation.navigate('Explore') },
    { label: 'Car wash', icon: 'sparkles', tone: 'orange', onPress: () => goToServices('CAR_WASH') },
    { label: 'Vehicle care', icon: 'wrench', tone: 'green', onPress: () => goToServices('VEHICLE_CARE') },
    { label: 'Pit stop', icon: 'route', tone: 'orange', onPress: () => navigation.navigate('Explore', { screen: 'PitStop' }) },
  ];

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 36 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
    >
      <View style={styles.header}>
        <LogoWordmark size={32} variant="dark" />
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { screen: 'Notifications' })}
          style={styles.bellButton}
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Icon name="bell" size={20} color={colors.textPrimary} />
          {unreadCount > 0 ? (
            <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <Text style={styles.greetingSmall}>{timeOfDay}</Text>
      <Text style={styles.greeting}>Hi {firstName}</Text>

      {!vehicle ? (
        <Card style={styles.block}>
          <IconBadge name="car" size={52} />
          <Text style={[type.h2, { marginTop: 14 }]}>{status === 'loading' ? 'Loading your vehicle…' : 'Start with your car'}</Text>
          <Text style={[type.body, { marginTop: 6 }]}>
            Add a vehicle and GaadiGrid connects fuel, services, bookings, expenses and reminders to it.
          </Text>
          {status !== 'loading' ? <Button fullWidth leftIcon={<Icon name="plus" />} onPress={addVehicle} style={{ marginTop: 16 }}>Add your vehicle</Button> : null}
        </Card>
      ) : (
        <>
          {vehicleCount > 1 ? <VehicleSwitcher onAdd={addVehicle} /> : null}

          <FadeIn delay={60} distance={16}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => goToGarage(undefined)}
            style={[styles.hero, vehicleCount > 1 && { marginTop: 14 }]}
            accessibilityRole="button"
            accessibilityLabel={`Open My Garage for ${vehicleTitle(vehicle)}`}
          >
            <View style={styles.heroGlowA} />
            <View style={styles.heroGlowB} />
            <Text style={styles.heroEyebrow}>YOUR VEHICLE</Text>
            <Text style={styles.heroName}>{vehicleTitle(vehicle)}</Text>
            {vehicle.variant ? <Text style={styles.heroVariant}>{vehicle.variant}</Text> : null}
            <View style={styles.heroMeta}>
              <View style={styles.plate}>
                <Text style={styles.plateText}>{vehicle.registration_number}</Text>
              </View>
              <View style={styles.fuelChip}>
                <Text style={styles.fuelChipText}>{fuelLabel(vehicle.fuel_type)}</Text>
              </View>
            </View>
            <View style={styles.heroLink}>
              <Text style={styles.heroLinkText}>Open My Garage</Text>
              <Icon name="arrowRight" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          </FadeIn>

          <FadeIn delay={150}>
          <View style={styles.actions}>
            {quickActions.map((a) => (
              <TouchableOpacity key={a.label} style={styles.action} onPress={a.onPress} accessibilityRole="button" activeOpacity={0.8}>
                <IconBadge name={a.icon} tone={a.tone} size={48} />
                <Text style={styles.actionText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          </FadeIn>

          <FadeIn delay={240}>
          <Text style={styles.sectionHeading}>Needs your attention</Text>
          <Card style={styles.block}>
            {insights.status === 'loading' && insights.reminders.length === 0 ? (
              <Text style={styles.muted}>Checking reminders…</Text>
            ) : actionable.length > 0 ? (
              actionable.map((r) => <ReminderRow key={`${r.vehicle_id}-${r.type}`} reminder={r} />)
            ) : insights.reminders.length > 0 ? (
              <View style={styles.allClear}>
                <IconBadge name="shieldCheck" size={40} round />
                <Text style={[styles.muted, { flex: 1 }]}>All clear — nothing due in the next 15 days.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.muted}>
                  Add the insurance, PUC and service dates for this vehicle and GaadiGrid will remind you before they run out.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Profile', { screen: 'VehicleForm', params: { mode: 'edit', vehicle } })}
                  accessibilityRole="button"
                >
                  <Text style={[styles.link, { marginTop: 10 }]}>Add dates</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
          </FadeIn>

          <FadeIn delay={330}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeadingInline}>Recent activity</Text>
            {insights.timeline.length > 0 ? (
              <TouchableOpacity onPress={() => goToGarage({ tab: 'timeline' })} accessibilityRole="button">
                <Text style={styles.link}>Full timeline</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Card style={styles.block}>
            {insights.timeline.length > 0 ? (
              <TimelineList events={insights.timeline} />
            ) : (
              <Text style={styles.muted}>
                {insights.status === 'loading'
                  ? 'Loading…'
                  : 'No activity yet. Bookings and expenses for this vehicle will appear here.'}
              </Text>
            )}
          </Card>
          </FadeIn>

          <FadeIn delay={420}>
          <Text style={styles.sectionHeading}>Spending</Text>
          <Card style={styles.block}>
            {hasExpenses && thisMonth ? (
              <>
                <Text style={styles.bigNumber}>{formatINR(thisMonth.total)}</Text>
                <Text style={styles.muted}>logged this month · {formatINR(insights.cost.all_time_total)} in total</Text>
                <TouchableOpacity onPress={() => goToGarage({ tab: 'cost' })} accessibilityRole="button">
                  <Text style={[styles.link, { marginTop: 10 }]}>See what this vehicle costs ›</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.muted}>No expenses logged for this vehicle yet.</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Profile', { screen: 'Expenses', params: { vehicle } })}
                  accessibilityRole="button"
                >
                  <Text style={[styles.link, { marginTop: 10 }]}>Log an expense</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
          </FadeIn>

          {insights.failed ? (
            <TouchableOpacity onPress={insights.reload} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>Some details couldn&apos;t load. Tap to retry.</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.orange,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  greetingSmall: { ...type.caption, fontSize: 13, paddingHorizontal: 20, marginTop: 8 },
  greeting: { ...type.h1, paddingHorizontal: 20, marginBottom: 18 },
  block: { marginHorizontal: 20 },
  hero: {
    marginHorizontal: 20,
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: 22,
    overflow: 'hidden',
    ...shadow.raised,
  },
  heroGlowA: { position: 'absolute', right: -40, top: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(24,168,117,0.28)' },
  heroGlowB: { position: 'absolute', right: 30, bottom: -70, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,138,52,0.16)' },
  heroEyebrow: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroName: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 8 },
  heroVariant: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginTop: 2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  plate: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  plateText: { color: colors.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  fuelChip: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  fuelChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22 },
  heroLinkText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 20 },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  actionText: { color: colors.textPrimary, fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  sectionHeading: { ...type.h2, fontSize: 18, paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  sectionHeadingInline: { ...type.h2, fontSize: 18 },
  allClear: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  link: { color: colors.greenDark, fontSize: 13, fontWeight: '800' },
  bigNumber: { color: colors.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginBottom: 2 },
  retry: { marginHorizontal: 20, marginTop: 20, padding: 12, borderRadius: 10, backgroundColor: colors.orangeSoft },
  retryText: { color: '#C95F12', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
