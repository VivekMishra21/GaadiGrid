import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import {
  addFleetMember,
  attachFleetVehicle,
  createFleet,
  detachFleetVehicle,
  getFleetOverview,
  getMyFleet,
  removeFleetMember,
} from '../api/fleetApi';
import { Text } from '../components/AppText';
import { ChipGroup } from '../components/Chip';
import { Button } from '../components/Button';
import { ReminderRow } from '../components/VehicleActivity';
import { TextField } from '../components/TextField';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { formatINR, vehicleTitle } from '../utils/format';
import { BackButton } from '../components/BackButton';

const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DRIVER', label: 'Driver' },
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fleet Pro is a separate business layer from the personal garage: its own account,
// members and overview. It only appears when the backend has the feature switched on.
export function FleetScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const fetchVehicles = useVehicleStore((s) => s.fetchVehicles);

  const [state, setState] = useState({ status: 'loading', account: null, overview: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [company, setCompany] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('DRIVER');
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { available, account } = await getMyFleet();
      if (!available) {
        setState({ status: 'unavailable', account: null, overview: null, error: null });
        return;
      }
      if (!account) {
        setState({ status: 'none', account: null, overview: null, error: null });
        return;
      }
      const mine = account.members.find((m) => m.user_id === user?.id);
      if (mine && mine.role === 'DRIVER') {
        setState({ status: 'driver', account, overview: null, error: null });
        return;
      }
      const overview = await getFleetOverview(account.id);
      setState({ status: 'loaded', account, overview, error: null });
    } catch (err) {
      setState({ status: 'error', account: null, overview: null, error: err.message || 'Could not load Fleet Pro.' });
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action) {
    setFormError(null);
    setBusy(true);
    try {
      await action();
      await Promise.all([load(), fetchVehicles().catch(() => {})]);
    } catch (err) {
      setFormError(err.message || 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDetach(vehicle) {
    Alert.alert('Remove from fleet', `${vehicleTitle(vehicle)} stays in your garage but leaves the fleet.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => detachFleetVehicle(state.account.id, vehicle.id)) },
    ]);
  }

  function confirmRemoveMember(member) {
    Alert.alert('Remove member', `Remove ${member.full_name || 'this person'} from the fleet?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => removeFleetMember(state.account.id, member.user_id)) },
    ]);
  }

  function handleCreate() {
    if (!company.trim()) {
      setFormError('Enter your company or fleet name.');
      return;
    }
    run(() => createFleet(company.trim()));
  }

  function handleAddMember() {
    if (!EMAIL_PATTERN.test(memberEmail.trim())) {
      setFormError('Enter the email they signed up with.');
      return;
    }
    run(async () => {
      await addFleetMember(state.account.id, memberEmail.trim(), memberRole);
      setMemberEmail('');
    });
  }

  const { account, overview } = state;
  const isOwner = overview?.your_role === 'OWNER';
  const availableToAttach = vehicles.filter((v) => !v.fleet_account_id);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
    >
      <BackButton onPress={() => navigation.goBack()} style={{ marginLeft: 20 }} />
      <Text style={styles.heading}>Fleet Pro</Text>
      <Text style={styles.sub}>Run several vehicles as one business: who is on the team, what is due, and what it costs. Early access.</Text>

      {state.status === 'loading' ? <Text style={styles.hint}>Loading…</Text> : null}
      {state.status === 'unavailable' ? <Text style={styles.hint}>Fleet Pro isn&apos;t available yet.</Text> : null}
      {state.status === 'error' ? (
        <TouchableOpacity onPress={load} accessibilityRole="button" style={styles.card}>
          <Text style={styles.error}>{state.error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {state.status === 'none' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create your fleet account</Text>
          <Text style={styles.muted}>Your personal vehicles stay as they are. You choose which ones join the fleet.</Text>
          <TextField label="Company or fleet name" value={company} onChangeText={setCompany} maxLength={255} style={{ marginTop: 14 }} />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button fullWidth onPress={handleCreate} loading={busy}>Create fleet</Button>
        </View>
      ) : null}

      {state.status === 'driver' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{account.company_name}</Text>
          <Text style={styles.muted}>You are a driver on this fleet. The fleet overview is for owners and managers.</Text>
        </View>
      ) : null}

      {state.status === 'loaded' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>{overview.your_role}</Text>
            <Text style={styles.cardTitle}>{account.company_name}</Text>
            <Text style={styles.bigNumber}>{formatINR(overview.total_spend_period)}</Text>
            <Text style={styles.muted}>logged across {overview.vehicles.length} vehicle{overview.vehicles.length === 1 ? '' : 's'} in the last {overview.period_months} months</Text>
          </View>

          <Text style={styles.sectionHeading}>Needs attention</Text>
          <View style={styles.card}>
            {overview.upcoming_reminders.length === 0 ? (
              <Text style={styles.muted}>Nothing due in the next 15 days across the fleet.</Text>
            ) : (
              overview.upcoming_reminders.map((r) => (
                <View key={`${r.vehicle_id}-${r.type}`}>
                  <ReminderRow reminder={r} />
                  <Text style={styles.plate}>{r.registration_number}</Text>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionHeading}>Vehicles</Text>
          {overview.vehicles.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.muted}>No vehicles in the fleet yet. Add one from your garage below.</Text>
            </View>
          ) : (
            overview.vehicles.map((row) => (
              <View key={row.vehicle.id} style={[styles.card, { marginBottom: 10 }]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.valueStrong}>{vehicleTitle(row.vehicle)}</Text>
                    <Text style={styles.muted}>
                      {[row.vehicle.registration_number, row.latest_odometer_km ? `${row.latest_odometer_km.toLocaleString('en-IN')} km` : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={styles.valueStrong}>{formatINR(row.spend_period)}</Text>
                </View>
                {row.reminders.filter((r) => r.urgency !== 'OK').map((r) => (
                  <ReminderRow key={`${r.vehicle_id}-${r.type}`} reminder={r} />
                ))}
                {isOwner ? (
                  <TouchableOpacity onPress={() => confirmDetach(row.vehicle)} accessibilityRole="button" style={{ marginTop: 8 }}>
                    <Text style={styles.remove}>Remove from fleet</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}

          {isOwner ? (
            <>
              <Text style={styles.sectionHeading}>Add from your garage</Text>
              <View style={styles.card}>
                {availableToAttach.length === 0 ? (
                  <Text style={styles.muted}>Every vehicle in your garage is already in the fleet.</Text>
                ) : (
                  availableToAttach.map((v) => (
                    <View key={v.id} style={styles.rowBetween}>
                      <Text style={styles.value}>{vehicleTitle(v)} · {v.registration_number}</Text>
                      <TouchableOpacity onPress={() => run(() => attachFleetVehicle(account.id, v.id))} accessibilityRole="button" disabled={busy}>
                        <Text style={styles.link}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionHeading}>Team</Text>
          <View style={styles.card}>
            {account.members.map((m) => (
              <View key={m.user_id} style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.value}>{m.full_name || `User ${m.user_id}`}</Text>
                  <Text style={styles.muted}>{m.role}</Text>
                </View>
                {isOwner && m.role !== 'OWNER' ? (
                  <TouchableOpacity onPress={() => confirmRemoveMember(m)} accessibilityRole="button">
                    <Text style={styles.remove}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {isOwner ? (
              <View style={{ marginTop: 14 }}>
                <TextField
                  label="Add a team member by email"
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="They need a GaadiGrid account first"
                />
                <ChipGroup options={ROLE_OPTIONS} value={memberRole} onChange={setMemberRole} />
                {formError ? <Text style={styles.error}>{formError}</Text> : null}
                <Button fullWidth onPress={handleAddMember} loading={busy} variant="secondary">Add member</Button>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 16 },
  back: { color: colors.green, fontSize: 14, fontWeight: '600', paddingHorizontal: 20, marginBottom: 14 },
  heading: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', paddingHorizontal: 20 },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 24 },
  card: { marginHorizontal: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
  eyebrow: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 2 },
  bigNumber: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 10 },
  sectionHeading: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  plate: { color: colors.textMuted, fontSize: 11, marginTop: -4, marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 6 },
  value: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  valueStrong: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  link: { color: colors.green, fontSize: 13, fontWeight: '700' },
  remove: { color: colors.orange, fontSize: 13, fontWeight: '700' },
  error: { color: colors.error, fontSize: 13, marginBottom: 10 },
});
