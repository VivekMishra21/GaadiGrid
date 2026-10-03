import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { createAddress, listAddresses } from '../api/addressesApi';
import { createBooking } from '../api/bookingsApi';
import { getAvailableSlots, getWeatherWarning } from '../api/providersApi';
import { ChipGroup } from '../components/Chip';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { selectCurrentVehicle, useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { BackButton } from '../components/BackButton';
import { Icon } from '../components/Icon';
import { IconBadge } from '../components/IconBadge';
import { radius, shadow } from '../theme/tokens';

function nextDays(count) {
  const days = [];
  for (let i = 1; i <= count; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatSlotLabel(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const EMPTY_ADDRESS = { label: 'Home', line1: '', city: '', state: '', pincode: '' };

export function BookingScreen({ route, navigation }) {
  const { providerId, package: pkg } = route.params;
  const vehicles = useVehicleStore((s) => s.vehicles);
  const currentVehicle = useVehicleStore(selectCurrentVehicle);

  const days = nextDays(14);
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [slots, setSlots] = useState([]);
  const [slotsStatus, setSlotsStatus] = useState('loading');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState(currentVehicle?.id || null);

  const [addresses, setAddresses] = useState([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [addingAddress, setAddingAddress] = useState(false);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [weatherWarning, setWeatherWarning] = useState(null);

  useEffect(() => {
    setSlotsStatus('loading');
    setSelectedSlot(null);
    getAvailableSlots(providerId, pkg.id, isoDate(selectedDate))
      .then((res) => {
        setSlots(res);
        setSlotsStatus('loaded');
      })
      .catch(() => setSlotsStatus('error'));
  }, [providerId, pkg.id, selectedDate]);

  useEffect(() => {
    if (pkg.category !== 'CAR_WASH' || !selectedSlot) {
      setWeatherWarning(null);
      return;
    }
    getWeatherWarning(providerId, selectedSlot)
      .then((res) => setWeatherWarning(res.warning))
      .catch(() => setWeatherWarning(null));
  }, [providerId, pkg.category, selectedSlot]);

  useEffect(() => {
    if (!pkg.is_doorstep) return;
    listAddresses()
      .then((res) => {
        setAddresses(res);
        setAddressesLoaded(true);
        const def = res.find((a) => a.is_default) || res[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => setAddressesLoaded(true));
  }, [pkg.is_doorstep]);

  async function handleAddAddress() {
    setAddingAddress(true);
    try {
      const created = await createAddress(newAddress);
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowAddAddress(false);
      setNewAddress(EMPTY_ADDRESS);
    } catch (err) {
      setError(err.message || 'Could not save address.');
    } finally {
      setAddingAddress(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!selectedSlot) {
      setError('Pick a time slot.');
      return;
    }
    if (!selectedVehicleId) {
      setError('Add a vehicle from your Profile tab before booking.');
      return;
    }
    if (pkg.is_doorstep && !selectedAddressId) {
      setError('Add an address for the service to be done at.');
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        package_id: pkg.id,
        vehicle_id: selectedVehicleId,
        address_id: pkg.is_doorstep ? selectedAddressId : undefined,
        scheduled_at: selectedSlot,
        notes: notes || undefined,
      });
      navigation.navigate('BookingConfirmed');
    } catch (err) {
      setError(err.message || 'Could not create this booking. Please try another slot.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} style={{ marginBottom: 0 }} />
      </View>
      <View style={styles.header}>
        <View style={styles.summary}>
          <IconBadge name="sparkles" size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.packageName}>{pkg.name}</Text>
            <View style={styles.metaRow}>
              <Icon name="clock" size={13} color={colors.textMuted} />
              <Text style={styles.packageMeta}>{pkg.duration_minutes} min</Text>
            </View>
          </View>
          <Text style={styles.summaryPrice}>₹{pkg.price.toFixed(0)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pick a date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
            {days.map((d) => {
              const active = isoDate(d) === isoDate(selectedDate);
              return (
                <TouchableOpacity
                  key={isoDate(d)}
                  onPress={() => setSelectedDate(d)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  accessibilityRole="radio"
                  accessibilityLabel={formatDayLabel(d)}
                  accessibilityState={{ selected: active, checked: active }}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{formatDayLabel(d)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pick a time</Text>
        {slotsStatus === 'loading' ? (
          <Text style={styles.muted}>Loading times...</Text>
        ) : slotsStatus === 'error' ? (
          <Text style={styles.muted}>Couldn&apos;t load times. Try another date.</Text>
        ) : slots.length === 0 ? (
          <Text style={styles.muted}>No times available this day. Try another date.</Text>
        ) : (
          <View style={styles.slotRow}>
            {slots.map((slot) => {
              const active = slot === selectedSlot;
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedSlot(slot)}
                  style={[styles.slotChip, active && styles.slotChipActive]}
                  accessibilityRole="radio"
                  accessibilityLabel={formatSlotLabel(slot)}
                  accessibilityState={{ selected: active, checked: active }}
                >
                  <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>{formatSlotLabel(slot)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {weatherWarning ? (
        <View style={styles.weatherBanner}>
          <Text style={styles.weatherBannerText}>🌧️ {weatherWarning}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle</Text>
        {vehicles.length === 0 ? (
          <Text style={styles.muted}>Add a vehicle from the Profile tab first.</Text>
        ) : (
          <ChipGroup
            options={vehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model}` }))}
            value={selectedVehicleId}
            onChange={setSelectedVehicleId}
          />
        )}
      </View>

      {pkg.is_doorstep ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service address</Text>
          {!addressesLoaded ? (
            <Text style={styles.muted}>Loading addresses...</Text>
          ) : (
            <>
              {addresses.length > 0 ? (
                <ChipGroup
                  options={addresses.map((a) => ({ value: a.id, label: a.label || a.line1 }))}
                  value={selectedAddressId}
                  onChange={setSelectedAddressId}
                />
              ) : (
                <Text style={styles.muted}>No saved addresses yet.</Text>
              )}

              {showAddAddress ? (
                <View style={styles.addAddressCard}>
                  <TextField placeholder="Label (e.g. Home)" value={newAddress.label} onChangeText={(v) => setNewAddress((p) => ({ ...p, label: v }))} />
                  <TextField placeholder="Address line" value={newAddress.line1} onChangeText={(v) => setNewAddress((p) => ({ ...p, line1: v }))} />
                  <TextField placeholder="City" value={newAddress.city} onChangeText={(v) => setNewAddress((p) => ({ ...p, city: v }))} />
                  <TextField placeholder="State" value={newAddress.state} onChangeText={(v) => setNewAddress((p) => ({ ...p, state: v }))} />
                  <TextField
                    placeholder="Pincode"
                    value={newAddress.pincode}
                    onChangeText={(v) => setNewAddress((p) => ({ ...p, pincode: v }))}
                    keyboardType="number-pad"
                  />
                  <Button fullWidth onPress={handleAddAddress} loading={addingAddress} disabled={!newAddress.line1 || !newAddress.city || !newAddress.state || !newAddress.pincode} variant="secondary">Save address</Button>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowAddAddress(true)}>
                  <Text style={styles.addAddressLink}>+ Add a new address</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextField placeholder="Anything the provider should know?" value={notes} onChangeText={setNotes} multiline />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button fullWidth onPress={handleSubmit} loading={submitting} style={styles.submitButton}>Confirm booking</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: { paddingHorizontal: 20, paddingTop: 14 },
  header: { paddingHorizontal: 20, paddingTop: 16 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.card,
  },
  packageName: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  packageMeta: { color: colors.textSecondary, fontSize: 13 },
  summaryPrice: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  section: {
    marginHorizontal: 20,
    marginTop: 22,
  },
  weatherBanner: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: 10,
    padding: 12,
  },
  weatherBannerText: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 12 },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  dayChipText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  dayChipTextActive: { color: '#FFFFFF' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  slotChipText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  slotChipTextActive: { color: '#0B1B14' },
  addAddressCard: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    shadowColor: '#11181A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    padding: 14,
  },
  addAddressLink: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 16,
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
