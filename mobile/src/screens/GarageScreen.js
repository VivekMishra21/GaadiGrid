import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { requestDeleteAccount } from '../api/authApi';
import { listMyBookings } from '../api/bookingsApi';
import { getMyFleet } from '../api/fleetApi';
import { PassportView } from '../components/PassportView';
import { MonthlyBars, ReminderRow, TimelineList } from '../components/VehicleActivity';
import { Button } from '../components/Button';
import { FadeIn } from '../components/FadeIn';
import { Icon } from '../components/Icon';
import { IconBadge } from '../components/IconBadge';
import { VehicleSwitcher } from '../components/VehicleSwitcher';
import { BOOKING_STATUS_LABELS, categoryLabel } from '../constants/services';
import { useVehicleInsights } from '../hooks/useVehicleInsights';
import { useAuthStore } from '../store/authStore';
import { selectCurrentVehicle, useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { radius, shadow } from '../theme/tokens';
import { confirmAction } from '../utils/confirm';
import { formatINR, formatINR2, formatShortDate, fuelLabel, vehicleTitle } from '../utils/format';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'cost', label: 'Cost' },
  { key: 'passport', label: 'Passport' },
];

const MORE_LINKS = [
  { label: 'Notifications', screen: 'Notifications', icon: 'bell' },
  { label: 'Help & Contact', screen: 'Help', icon: 'help' },
  { label: 'About GaadiGrid', screen: 'About', icon: 'info' },
  { label: 'Partner With Us', screen: 'Partner', icon: 'handshake' },
];

const EXPENSE_LABELS = {
  FUEL: 'Fuel',
  SERVICE: 'Service',
  INSURANCE: 'Insurance',
  PUC: 'PUC',
  PARKING: 'Parking',
  FINE: 'Fines',
  ACCESSORIES: 'Accessories',
  OTHER: 'Other',
};

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// My Garage = the control centre for the selected vehicle: its details, reminders,
// bookings, history and cost, with account settings kept at the bottom.
export function GarageScreen({ navigation, route }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const vehicle = useVehicleStore(selectCurrentVehicle);
  const fetchVehicles = useVehicleStore((s) => s.fetchVehicles);
  const removeVehicle = useVehicleStore((s) => s.removeVehicle);
  const insights = useVehicleInsights(vehicle?.id, { timelineLimit: 50, months: 6 });

  const [tab, setTab] = useState(route.params?.tab || 'overview');
  const [bookings, setBookings] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const [fleet, setFleet] = useState({ available: false, account: null });

  // Coming back from a form (e.g. a new service record) should show it straight away.
  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => setFocusTick((t) => t + 1));
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (focusTick > 0) {
      insights.reload();
      loadBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick]);

  // Fleet Pro answers 404 while its server flag is off; only show the entry when it is on.
  useEffect(() => {
    getMyFleet()
      .then(setFleet)
      .catch(() => setFleet({ available: false, account: null }));
  }, [focusTick]);

  const requestedTab = route.params?.tab;
  useEffect(() => {
    if (requestedTab) setTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    fetchVehicles().catch(() => {});
  }, [fetchVehicles]);

  const loadBookings = useCallback(() => {
    if (!vehicle?.id) {
      setBookings(null);
      return Promise.resolve();
    }
    return listMyBookings(1, vehicle.id)
      .then((res) => setBookings(res.items))
      .catch(() => setBookings([]));
  }, [vehicle?.id]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchVehicles().catch(() => {}), insights.reload(), loadBookings()]);
    setRefreshing(false);
  }

  function handleLogout() {
    confirmAction({
      title: 'Sign out',
      message: 'Are you sure you want to sign out of GaadiGrid?',
      confirmLabel: 'Sign out',
      onConfirm: logout,
    });
  }

  function handleRemoveVehicle() {
    confirmAction({
      title: 'Remove vehicle',
      message: `Remove ${vehicleTitle(vehicle)} (${vehicle.registration_number})?`,
      confirmLabel: 'Remove',
      onConfirm: () => removeVehicle(vehicle.id).catch(() => {}),
    });
  }

  function handleDeleteAccount() {
    confirmAction({
      title: 'Delete account',
      message: "This submits a request to permanently delete your GaadiGrid account. We'll process it and you'll be signed out.",
      confirmLabel: 'Request deletion',
      onConfirm: async () => {
        await requestDeleteAccount('User requested from mobile app').catch(() => {});
        logout();
      },
    });
  }

  const addVehicle = () => navigation.navigate('VehicleForm', { mode: 'add' });
  const cost = insights.cost;
  const categoryRows = cost ? Object.entries(cost.by_category).filter(([, total]) => total > 0) : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
    >
      <View style={styles.headingRow}>
        <Text style={styles.heading}>My Garage</Text>
        <TouchableOpacity
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.signOutChip}
          testID="garage-sign-out"
        >
          <Icon name="logOut" size={16} color={colors.textSecondary} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <VehicleSwitcher onAdd={addVehicle} />

      {!vehicle ? (
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardTitle}>No vehicles yet</Text>
          <Text style={styles.muted}>Add your first vehicle to start building its history.</Text>
          <Button fullWidth onPress={addVehicle} style={{ marginTop: 14 }}>Add a vehicle</Button>
        </View>
      ) : (
        <>
          <View style={styles.segment}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.segmentBtn, tab === t.key && styles.segmentBtnActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t.key }}
              >
                <Text style={[styles.segmentText, tab === t.key && styles.segmentTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {insights.failed ? (
            <TouchableOpacity onPress={insights.reload} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>Some details couldn&apos;t load. Tap to retry.</Text>
            </TouchableOpacity>
          ) : null}

          {tab === 'overview' ? (
            <>
              <FadeIn delay={40}>
              <View style={styles.card}>
                <Text style={styles.vehicleName}>{vehicleTitle(vehicle)}</Text>
                {vehicle.variant ? <Text style={styles.muted}>{vehicle.variant}</Text> : null}
                <View style={{ marginTop: 12 }}>
                  <Detail label="Registration" value={vehicle.registration_number} />
                  <Detail label="Fuel" value={fuelLabel(vehicle.fuel_type)} />
                  <Detail label="Mileage" value={vehicle.average_mileage ? `${vehicle.average_mileage} km per unit` : null} />
                  <Detail label="Insurance expiry" value={formatShortDate(vehicle.insurance_expiry)} />
                  <Detail label="PUC expiry" value={formatShortDate(vehicle.puc_expiry)} />
                  <Detail label="Next service" value={formatShortDate(vehicle.service_due_date)} />
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => navigation.navigate('VehicleForm', { mode: 'edit', vehicle })} accessibilityRole="button">
                    <Text style={styles.link}>Edit details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('Expenses', { vehicle })} accessibilityRole="button">
                    <Text style={styles.link}>Expenses</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleRemoveVehicle} accessibilityRole="button">
                    <Text style={styles.remove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>

              </FadeIn>

              <FadeIn delay={130}>
              <Text style={styles.sectionHeading}>Reminders</Text>
              <View style={styles.card}>
                {insights.reminders.length > 0 ? (
                  insights.reminders.map((r) => <ReminderRow key={`${r.vehicle_id}-${r.type}`} reminder={r} />)
                ) : (
                  <Text style={styles.muted}>No dates set. Edit this vehicle to add insurance, PUC and service dates.</Text>
                )}
              </View>

              </FadeIn>

              <FadeIn delay={220}>
              <Text style={styles.sectionHeading}>Bookings</Text>
              <View style={styles.card}>
                {bookings === null ? (
                  <Text style={styles.muted}>Loading…</Text>
                ) : bookings.length === 0 ? (
                  <Text style={styles.muted}>No bookings for this vehicle yet.</Text>
                ) : (
                  <>
                    {bookings.slice(0, 3).map((b) => (
                      <View key={b.id} style={styles.bookingRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailValue}>{b.package_name}</Text>
                          <Text style={styles.muted}>
                            {b.provider_name} · {formatShortDate(b.scheduled_at)}
                          </Text>
                        </View>
                        <Text style={styles.status}>{BOOKING_STATUS_LABELS[b.status] || b.status}</Text>
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Bookings')} accessibilityRole="button">
                      <Text style={[styles.link, { marginTop: 8 }]}>All bookings ›</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              </FadeIn>
            </>
          ) : null}

          {tab === 'timeline' ? (
            <>
              <Text style={styles.sectionHeading}>{vehicleTitle(vehicle)} timeline</Text>
              <View style={styles.card}>
                {insights.timeline.length > 0 ? (
                  <TimelineList events={insights.timeline} />
                ) : (
                  <Text style={styles.muted}>
                    {insights.status === 'loading'
                      ? 'Loading…'
                      : 'Nothing recorded yet. Bookings and logged expenses for this vehicle will build its history here.'}
                  </Text>
                )}
              </View>
            </>
          ) : null}

          {tab === 'cost' ? (
            <>
              <Text style={styles.sectionHeading}>What this vehicle costs</Text>
              {cost && cost.all_time_total > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.bigNumber}>{formatINR(cost.period_total)}</Text>
                  <Text style={styles.muted}>
                    over the last {cost.period_months} months · about {formatINR(cost.average_per_month)} a month
                  </Text>
                  <MonthlyBars byMonth={cost.by_month} />
                  <View style={{ marginTop: 18 }}>
                    {categoryRows.map(([category, total]) => (
                      <Detail key={category} label={EXPENSE_LABELS[category] || categoryLabel(category)} value={formatINR(total)} />
                    ))}
                  </View>
                  <Text style={[styles.muted, { marginTop: 12 }]}>All-time logged: {formatINR(cost.all_time_total)}</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.muted}>
                    {insights.status === 'loading' ? 'Loading…' : 'No expenses logged for this vehicle yet, so there is no cost to show.'}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Expenses', { vehicle })} accessibilityRole="button">
                    <Text style={[styles.link, { marginTop: 10 }]}>Log an expense</Text>
                  </TouchableOpacity>
                </View>
              )}
              {cost && cost.completed_booking_count > 0 ? (
                <View style={[styles.card, { marginTop: 12 }]}>
                  <Text style={styles.detailValue}>
                    {cost.completed_booking_count} completed GaadiGrid booking{cost.completed_booking_count === 1 ? '' : 's'} ·{' '}
                    {formatINR(cost.completed_booking_spend)}
                  </Text>
                  <Text style={[styles.muted, { marginTop: 4 }]}>
                    Shown separately — log it under Expenses if you want it counted above.
                  </Text>
                </View>
              ) : null}
              {cost && cost.cost_per_km != null ? (
                <View style={[styles.card, { marginTop: 12 }]}>
                  <Text style={styles.detailValue}>About {formatINR2(cost.cost_per_km)} per km</Text>
                  <Text style={[styles.muted, { marginTop: 4 }]}>
                    {formatINR(cost.cost_per_km_basis.expense_total)} logged over {(cost.cost_per_km_basis.to_km - cost.cost_per_km_basis.from_km).toLocaleString('en-IN')} km,
                    from {formatShortDate(cost.cost_per_km_basis.from_date)} to {formatShortDate(cost.cost_per_km_basis.to_date)}.
                  </Text>
                </View>
              ) : (
                <Text style={[styles.muted, styles.footnote]}>
                  Cost per kilometre appears once two odometer readings at least 100 km apart are on record. Add the odometer to a service record.
                </Text>
              )}
            </>
          ) : null}

          {tab === 'passport' ? (
            <PassportView
              vehicle={vehicle}
              reloadKey={focusTick}
              onAddRecord={() => navigation.navigate('ServiceRecordForm', { vehicle })}
              onOpenRecord={(record) => navigation.navigate('ServiceRecordForm', { vehicle, record })}
            />
          ) : null}
        </>
      )}

      <Text style={styles.sectionHeading}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.detailValue}>{user?.full_name}</Text>
        {user?.phone ? <Text style={styles.muted}>{user.phone}</Text> : null}
        {user?.email ? <Text style={styles.muted}>{user.email}</Text> : null}
      </View>
      {[...(fleet.available ? [{ label: 'Fleet Pro', screen: 'Fleet', icon: 'truck' }] : []), ...MORE_LINKS].map((item) => (
        <TouchableOpacity key={item.label} style={styles.linkCard} onPress={() => navigation.navigate(item.screen)} accessibilityRole="button">
          <View style={styles.linkLeft}>
            <IconBadge name={item.icon} tone="neutral" size={36} />
            <Text style={styles.detailValue}>{item.label}</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ))}

      <View style={styles.actions}>
        <Button fullWidth onPress={handleLogout} variant="secondary" style={{ alignSelf: 'stretch', marginBottom: 16 }}>Sign out</Button>
        <TouchableOpacity onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccount}>Delete my account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 16 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  heading: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
  signOutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
  },
  segmentBtn: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: colors.textPrimary },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  vehicleName: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  sectionHeading: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  detailLabel: { color: colors.textSecondary, fontSize: 13 },
  detailValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  link: { color: colors.greenDark, fontSize: 13, fontWeight: '800' },
  remove: { color: '#C95F12', fontSize: 13, fontWeight: '800' },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  status: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  bigNumber: { color: colors.textPrimary, fontSize: 30, fontWeight: '800' },
  footnote: { paddingHorizontal: 20, marginTop: 12 },
  retry: { marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,138,52,0.12)' },
  retryText: { color: colors.orange, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    ...shadow.card,
  },
  actions: { marginTop: 24, paddingHorizontal: 20, alignItems: 'center' },
  deleteAccount: { color: colors.error, fontSize: 13, fontWeight: '600' },
});
