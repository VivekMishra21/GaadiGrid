import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '../components/AppText';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { calculateDetourWorth } from '../utils/detourCalculator';

function cheapestPrice(prices) {
  if (!prices || prices.length === 0) return null;
  return prices.reduce((min, p) => (p.price < min.price ? p : min), prices[0]);
}

export function DetourCalculatorScreen({ route }) {
  const vehicles = useVehicleStore((s) => s.vehicles);
  const defaultVehicle = vehicles.find((v) => v.is_default) || vehicles[0];
  const cheapest = cheapestPrice(route.params?.stationPrices);

  const [nearbyPrice, setNearbyPrice] = useState('');
  const [detourPrice, setDetourPrice] = useState(cheapest ? String(cheapest.price) : '');
  const [extraDistanceKm, setExtraDistanceKm] = useState('');
  const [mileageKmPerUnit, setMileageKmPerUnit] = useState(
    defaultVehicle?.average_mileage ? String(defaultVehicle.average_mileage) : ''
  );
  const [fillUnits, setFillUnits] = useState('');
  const [result, setResult] = useState(null);

  function handleCalculate() {
    const outcome = calculateDetourWorth({
      nearbyPrice: Number(nearbyPrice),
      detourPrice: Number(detourPrice),
      extraDistanceKm: Number(extraDistanceKm),
      mileageKmPerUnit: Number(mileageKmPerUnit),
      fillUnits: Number(fillUnits),
    });
    setResult(outcome);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Text style={styles.title}>Worth the detour?</Text>
      <Text style={styles.subtitle}>
        Compare a cheaper, farther station against the extra fuel you&apos;ll burn getting there.
      </Text>

      <TextField
        label="Price at your nearby station (₹/unit)"
        keyboardType="decimal-pad"
        value={nearbyPrice}
        onChangeText={setNearbyPrice}
        placeholder="e.g. 96.72"
        error={result && !result.valid ? result.errors.nearbyPrice : null}
      />
      <TextField
        label="Price at the farther station (₹/unit)"
        keyboardType="decimal-pad"
        value={detourPrice}
        onChangeText={setDetourPrice}
        placeholder="e.g. 89.30"
        error={result && !result.valid ? result.errors.detourPrice : null}
      />
      <TextField
        label="Extra one-way distance (km)"
        keyboardType="decimal-pad"
        value={extraDistanceKm}
        onChangeText={setExtraDistanceKm}
        placeholder="e.g. 3.5"
        error={result && !result.valid ? result.errors.extraDistanceKm : null}
      />
      <TextField
        label="Your vehicle's mileage (km per unit)"
        keyboardType="decimal-pad"
        value={mileageKmPerUnit}
        onChangeText={setMileageKmPerUnit}
        placeholder="e.g. 18.5"
        error={result && !result.valid ? result.errors.mileageKmPerUnit : null}
      />
      <TextField
        label="How much you plan to fill (units)"
        keyboardType="decimal-pad"
        value={fillUnits}
        onChangeText={setFillUnits}
        placeholder="e.g. 30"
        error={result && !result.valid ? result.errors.fillUnits : null}
      />

      <Button fullWidth onPress={handleCalculate} style={{ marginTop: 8 }}>Calculate</Button>

      {result?.valid && (
        <View style={[styles.resultCard, result.worthIt ? styles.resultGood : styles.resultBad]}>
          <Text style={styles.resultHeadline}>{result.worthIt ? 'Worth the detour' : 'Not worth the detour'}</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Extra fuel cost (round trip)</Text>
            <Text style={styles.resultValue}>₹{result.extraFuelCost.toFixed(2)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Savings on this fill-up</Text>
            <Text style={styles.resultValue}>₹{result.totalSavingsOnFill.toFixed(2)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Net savings</Text>
            <Text style={[styles.resultValue, styles.resultNet]}>₹{result.netSavings.toFixed(2)}</Text>
          </View>
          {result.breakEvenFillUnits != null && (
            <Text style={styles.breakEven}>
              You&apos;d need to fill at least {result.breakEvenFillUnits} units for the detour to break even.
            </Text>
          )}
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
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 19,
  },
  resultCard: {
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  resultGood: {
    backgroundColor: 'rgba(24, 168, 117, 0.12)',
    borderColor: colors.green,
  },
  resultBad: {
    backgroundColor: 'rgba(214, 69, 69, 0.12)',
    borderColor: colors.error,
  },
  resultHeadline: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resultLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  resultValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  resultNet: {
    fontSize: 15,
    fontWeight: '700',
  },
  breakEven: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
});
