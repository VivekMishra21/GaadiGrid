import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { findProvidersForNeed } from '../api/pitStopApi';
import { ChipGroup } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { useVehicleInsights } from '../hooks/useVehicleInsights';
import { selectCurrentVehicle, useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { formatINR, vehicleTitle } from '../utils/format';
import { BackButton } from '../components/BackButton';

export const PIT_STOP_NEEDS = [
  { value: 'CAR_WASH', label: 'Car wash' },
  { value: 'GENERAL_SERVICE', label: 'General service' },
  { value: 'TYRE_SERVICE', label: 'Tyres' },
  { value: 'BATTERY_SERVICE', label: 'Battery' },
  { value: 'AC_SERVICE', label: 'AC service' },
  { value: 'DENTING_PAINTING', label: 'Denting & painting' },
];

const RADIUS_KM = 10;

// What does the vehicle need right now, and who nearby sells it? Suggestions come only
// from partners' real, active service packages and the user's own location — there is no
// diagnosis of the vehicle here.
export function PitStopScreen({ navigation }) {
  const vehicle = useVehicleStore(selectCurrentVehicle);
  const insights = useVehicleInsights(vehicle?.id, { timelineLimit: 1 });
  const serviceReminder = insights.reminders.find((r) => r.type === 'service' && r.urgency !== 'OK');

  const [need, setNeed] = useState(null);
  const [location, setLocation] = useState({ status: 'idle', coords: null }); // idle | asking | granted | denied
  const [result, setResult] = useState({ status: 'idle', providers: [] }); // idle | loading | loaded | error

  const locate = useCallback(async (ask) => {
    setLocation((l) => ({ ...l, status: 'asking' }));
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' && ask) permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocation({ status: 'denied', coords: null });
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ status: 'granted', coords: { lat: position.coords.latitude, lng: position.coords.longitude } });
    } catch {
      setLocation({ status: 'denied', coords: null });
    }
  }, []);

  useEffect(() => {
    locate(false);
  }, [locate]);

  const search = useCallback(() => {
    if (!need || !location.coords) return;
    setResult({ status: 'loading', providers: [] });
    findProvidersForNeed({ need, lat: location.coords.lat, lng: location.coords.lng, radiusKm: RADIUS_KM })
      .then((res) => setResult({ status: 'loaded', providers: res.providers }))
      .catch(() => setResult({ status: 'error', providers: [] }));
  }, [need, location.coords]);

  useEffect(() => {
    search();
  }, [search]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <BackButton onPress={() => navigation.goBack()} style={{ marginLeft: 20 }} />
      <Text style={styles.heading}>Smart Pit Stop</Text>
      <Text style={styles.sub}>
        {vehicle ? `What does your ${vehicleTitle(vehicle)} need right now?` : 'What does your vehicle need right now?'}
      </Text>

      {serviceReminder ? (
        <TouchableOpacity style={styles.suggestion} onPress={() => setNeed('GENERAL_SERVICE')} accessibilityRole="button">
          <Text style={styles.suggestionText}>
            {serviceReminder.days_remaining < 0
              ? 'Your service is overdue.'
              : `Your service is due in ${serviceReminder.days_remaining} day${serviceReminder.days_remaining === 1 ? '' : 's'}.`}{' '}
            Find general service nearby ›
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.chips}>
        <ChipGroup options={PIT_STOP_NEEDS} value={need} onChange={setNeed} />
      </View>

      {location.status === 'denied' ? (
        <View style={styles.card}>
          <Text style={styles.muted}>Allow location so we can find partners near you. Your location is only used for this search.</Text>
          <Button fullWidth onPress={() => locate(true)} style={{ marginTop: 12 }}>Allow location</Button>
        </View>
      ) : null}

      {!need ? (
        <Text style={styles.hint}>Pick what you need to see partners nearby.</Text>
      ) : location.status === 'asking' || result.status === 'loading' ? (
        <Text style={styles.hint}>Searching nearby…</Text>
      ) : result.status === 'error' ? (
        <EmptyState title="Couldn't search right now" subtitle="Check your connection and try again." actionLabel="Retry" onAction={search} />
      ) : result.status === 'loaded' && result.providers.length === 0 ? (
        <EmptyState title="No partners within 10 km" subtitle="No partner currently lists this service near you. Try another need, or check back as we add partners." />
      ) : (
        result.providers.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.provider, p.is_sponsored && styles.providerSponsored]}
            onPress={() => navigation.navigate('Services', { screen: 'ProviderDetail', params: { providerId: p.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${p.business_name}, ${p.distance_km} kilometres away`}
          >
            {p.is_sponsored ? (
              <View style={styles.sponsored}>
                <Text style={styles.sponsoredText}>★ Sponsored</Text>
              </View>
            ) : null}
            <View style={styles.providerHeader}>
              <Text style={styles.providerName} numberOfLines={1}>{p.business_name}</Text>
              <Text style={styles.distance}>{p.distance_km.toFixed(1)} km</Text>
            </View>
            <Text style={styles.muted}>
              {[p.locality ? `${p.locality}, ${p.city}` : p.city, p.verification_status === 'VERIFIED' ? 'Verified' : null, p.review_count > 0 ? `★ ${p.average_rating.toFixed(1)} (${p.review_count})` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {p.packages.slice(0, 2).map((pkg) => (
              <View key={pkg.id} style={styles.packageRow}>
                <Text style={styles.packageName} numberOfLines={1}>{pkg.name}</Text>
                <Text style={styles.packagePrice}>{formatINR(pkg.price)}</Text>
              </View>
            ))}
            {p.packages.length > 2 ? <Text style={styles.more}>+{p.packages.length - 2} more</Text> : null}
          </TouchableOpacity>
        ))
      )}

      {result.status === 'loaded' && result.providers.length > 0 ? (
        <Text style={styles.note}>Straight-line distance from your location, for services partners currently list on GaadiGrid. Not a diagnosis of your vehicle.</Text>
      ) : null}

      <TouchableOpacity onPress={() => navigation.navigate('DetourCalculator')} accessibilityRole="button" style={styles.detourLink}>
        <Text style={styles.link}>Planning a fuel detour instead? ›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 16 },
  back: { color: colors.green, fontSize: 14, fontWeight: '600', paddingHorizontal: 20, marginBottom: 14 },
  heading: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', paddingHorizontal: 20 },
  sub: { color: colors.textSecondary, fontSize: 14, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  suggestion: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,138,52,0.12)' },
  suggestionText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  chips: { paddingHorizontal: 16 },
  card: { marginHorizontal: 20, marginBottom: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16 },
  muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 28, paddingHorizontal: 20 },
  provider: { marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14 },
  providerSponsored: { borderColor: 'rgba(255,138,52,0.5)' },
  sponsored: { alignSelf: 'flex-start', backgroundColor: colors.orange, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  sponsoredText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  providerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  providerName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  distance: { color: colors.green, fontSize: 13, fontWeight: '800' },
  packageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 10 },
  packageName: { color: colors.textPrimary, fontSize: 13, flex: 1 },
  packagePrice: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  more: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18, paddingHorizontal: 20, marginTop: 6 },
  detourLink: { paddingHorizontal: 20, marginTop: 22 },
  link: { color: colors.green, fontSize: 13, fontWeight: '700' },
});
