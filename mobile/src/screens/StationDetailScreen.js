import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { submitQueueReport } from '../api/stationsApi';
import { ChipGroup } from '../components/Chip';
import { PrimaryButton } from '../components/PrimaryButton';
import { CNG_REPORT_OPTIONS, QUEUE_REPORT_OPTIONS, queueSignalColor } from '../constants/queue';
import { useStationStore } from '../store/stationStore';
import { colors } from '../theme/colors';

function SignalRow({ label, signal }) {
  if (!signal?.value) {
    return (
      <View style={styles.signalRow}>
        <Text style={styles.signalLabel}>{label}</Text>
        <Text style={styles.signalMuted}>No recent reports</Text>
      </View>
    );
  }
  return (
    <View style={styles.signalRow}>
      <Text style={styles.signalLabel}>{label}</Text>
      <View style={styles.signalValue}>
        <View style={[styles.dot, { backgroundColor: queueSignalColor(signal.value) }]} />
        <Text style={styles.signalText}>
          {signal.label} · {signal.last_reported_minutes_ago}m ago ({signal.report_count} report
          {signal.report_count === 1 ? '' : 's'})
        </Text>
      </View>
    </View>
  );
}

export function StationDetailScreen({ route, navigation }) {
  const { stationId } = route.params;
  const { stationDetail, stationDetailStatus, fetchStationDetail, toggleFavorite } = useStationStore();

  const [reportType, setReportType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const load = useCallback(() => {
    fetchStationDetail(stationId).catch(() => {});
  }, [fetchStationDetail, stationId]);

  useEffect(load, [load]);

  if (stationDetailStatus === 'loading' && (!stationDetail || stationDetail.id !== stationId)) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Loading station...</Text>
      </View>
    );
  }

  if (stationDetailStatus === 'error' || !stationDetail || stationDetail.id !== stationId) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Couldn&apos;t load this station.</Text>
        <PrimaryButton title="Retry" onPress={load} variant="secondary" style={{ marginTop: 16, marginHorizontal: 20 }} />
      </View>
    );
  }

  const station = stationDetail;

  async function handleFavorite() {
    setFavoriteBusy(true);
    try {
      await toggleFavorite(station.id);
    } catch {
      // best-effort; state simply won't flip
    } finally {
      setFavoriteBusy(false);
    }
  }

  function handleNavigate() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    Linking.openURL(url).catch(() => {});
  }

  async function handleSubmitReport() {
    if (!reportType) return;
    setSubmitting(true);
    setReportError(null);
    setReportSuccess(false);
    try {
      let latitude;
      let longitude;
      try {
        const { status: permission } = await Location.getForegroundPermissionsAsync();
        if (permission === 'granted') {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }
      } catch {
        // location unavailable — the report still submits, just without distance verification
      }

      await submitQueueReport(station.id, { report_type: reportType, latitude, longitude });
      setReportSuccess(true);
      setReportType(null);
      fetchStationDetail(station.id).catch(() => {});
    } catch (err) {
      setReportError(err.message || 'Could not submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{station.name}</Text>
          <Text style={styles.address}>{station.address}</Text>
          <Text style={styles.hours}>{station.is_24_hours ? 'Open 24 hours' : `${station.opens_at || '?'} - ${station.closes_at || '?'}`}</Text>
        </View>
        <TouchableOpacity
          onPress={handleFavorite}
          disabled={favoriteBusy}
          accessibilityRole="button"
          accessibilityLabel={station.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          accessibilityState={{ selected: station.is_favorite, disabled: favoriteBusy }}
        >
          <Text
            style={[styles.favoriteStar, station.is_favorite && styles.favoriteStarActive]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            ★
          </Text>
        </TouchableOpacity>
      </View>

      <PrimaryButton title="Navigate here" onPress={handleNavigate} style={styles.navigateButton} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fuel prices</Text>
        {station.prices.length === 0 ? (
          <Text style={styles.muted}>No prices available yet.</Text>
        ) : (
          station.prices.map((p) => (
            <View key={p.fuel_type_code} style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {p.fuel_type_label} ({p.unit})
              </Text>
              <Text style={styles.priceValue}>₹{p.price.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live status</Text>
        <SignalRow label="Queue" signal={station.queue_status.queue} />
        <SignalRow label="CNG" signal={station.queue_status.cng} />
      </View>

      {station.facilities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facilities</Text>
          <View style={styles.facilityRow}>
            {station.facilities.map((code) => (
              <View key={code} style={styles.facilityPill}>
                <Text style={styles.facilityText}>{code.replaceAll('_', ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Report queue status</Text>
        <Text style={styles.sectionSubtitle}>Help other drivers by sharing what you see right now.</Text>
        <ChipGroup options={QUEUE_REPORT_OPTIONS} value={reportType} onChange={setReportType} />
        <ChipGroup label="CNG status" options={CNG_REPORT_OPTIONS} value={reportType} onChange={setReportType} />
        {reportError ? <Text style={styles.reportError}>{reportError}</Text> : null}
        {reportSuccess ? <Text style={styles.reportSuccess}>Thanks — your report has been submitted.</Text> : null}
        <PrimaryButton
          title="Submit report"
          onPress={handleSubmitReport}
          loading={submitting}
          disabled={!reportType}
          style={{ marginTop: 8 }}
        />
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('DetourCalculator', { stationPrices: station.prices })} style={styles.calculatorLink}>
        <Text style={styles.calculatorLinkText}>Is this detour worth it? Use the calculator →</Text>
      </TouchableOpacity>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  address: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  hours: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  favoriteStar: {
    fontSize: 26,
    color: colors.textMuted,
  },
  favoriteStarActive: {
    color: colors.orange,
  },
  navigateButton: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priceLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  priceValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  signalLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  signalValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalMuted: {
    color: colors.textMuted,
    fontSize: 12,
  },
  signalText: {
    color: colors.textPrimary,
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  facilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityPill: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  facilityText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  reportError: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  reportSuccess: {
    color: colors.green,
    fontSize: 12,
    marginTop: 4,
  },
  calculatorLink: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  calculatorLinkText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
