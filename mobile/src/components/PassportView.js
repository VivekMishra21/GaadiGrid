import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from './AppText';
import { getVehiclePassport } from '../api/vehiclesApi';
import { categoryLabel } from '../constants/services';
import { colors } from '../theme/colors';
import { formatINR, formatShortDate, fuelLabel, vehicleTitle } from '../utils/format';
import { ReminderRow } from './VehicleActivity';

function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// The vehicle's long-term record as GaadiGrid knows it. Everything shown is read from
// stored data; the disclaimer comes from the backend so the wording stays in one place.
export function PassportView({ vehicle, reloadKey = 0, onAddRecord, onOpenRecord }) {
  const [state, setState] = useState({ status: 'loading', passport: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    getVehiclePassport(vehicle.id)
      .then((passport) => setState({ status: 'loaded', passport }))
      .catch(() => setState({ status: 'error', passport: null }));
  }, [vehicle.id]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (state.status === 'error') {
    return (
      <TouchableOpacity onPress={load} accessibilityRole="button" style={styles.card}>
        <Text style={styles.error}>Couldn&apos;t load the passport. Tap to retry.</Text>
      </TouchableOpacity>
    );
  }
  if (!state.passport) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const { identity, latest_odometer: odometer, totals, service_history: history, reminders, disclaimer } = state.passport;

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>VEHICLE PASSPORT</Text>
        <Text style={styles.title}>{vehicleTitle(identity)}</Text>
        {identity.variant ? <Text style={styles.muted}>{identity.variant}</Text> : null}
        <View style={{ marginTop: 12 }}>
          <Row label="Registration" value={identity.registration_number} />
          <Row label="Fuel" value={fuelLabel(identity.fuel_type)} />
          <Row label="On GaadiGrid since" value={formatShortDate(identity.on_gaadigrid_since)} />
          <Row label="Last odometer" value={odometer ? `${odometer.km.toLocaleString('en-IN')} km (${formatShortDate(odometer.as_of)})` : 'Not recorded yet'} />
        </View>
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Row label="Service records" value={String(totals.service_records)} />
        <Row label="Completed bookings" value={String(totals.completed_bookings)} />
        <Row label="Expenses logged" value={String(totals.expenses_logged)} />
        <Row label="Total logged spend" value={formatINR(totals.total_logged_spend)} />
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Service history</Text>
        <TouchableOpacity onPress={onAddRecord} accessibilityRole="button">
          <Text style={styles.link}>+ Add record</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {history.length === 0 ? (
          <Text style={styles.muted}>
            No service records yet. Completed GaadiGrid bookings appear here automatically; you can also add work done elsewhere.
          </Text>
        ) : (
          history.map((record, i) => (
            <TouchableOpacity
              key={record.id}
              onPress={() => onOpenRecord(record)}
              accessibilityRole="button"
              style={[styles.recordRow, i > 0 && styles.recordDivider]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.value}>{record.title}</Text>
                <Text style={styles.muted} numberOfLines={2}>
                  {[
                    categoryLabel(record.service_type),
                    record.provider_name,
                    formatShortDate(record.service_date),
                    record.odometer_km ? `${record.odometer_km.toLocaleString('en-IN')} km` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {record.work_done ? <Text style={styles.workDone} numberOfLines={2}>{record.work_done}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {record.amount ? <Text style={styles.value}>{formatINR(record.amount)}</Text> : null}
                <Text style={styles.source}>{record.source === 'BOOKING' ? 'Booked on GaadiGrid' : 'Added by you'}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {reminders.length > 0 ? (
        <>
          <Text style={styles.sectionHeading}>Important dates</Text>
          <View style={styles.card}>
            {reminders.map((r) => (
              <ReminderRow key={`${r.vehicle_id}-${r.type}`} reminder={r} />
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
  eyebrow: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  label: { color: colors.textSecondary, fontSize: 13 },
  value: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  error: { color: colors.orange, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  sectionHeading: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  link: { color: colors.green, fontSize: 13, fontWeight: '700' },
  recordRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  recordDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  workDone: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  source: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  disclaimer: { color: colors.textMuted, fontSize: 12, lineHeight: 18, paddingHorizontal: 20, marginTop: 18 },
});
