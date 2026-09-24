import * as Location from 'expo-location';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';

export function LocationPermissionScreen({ onDone }) {
  const [error, setError] = useState(null);
  const [requesting, setRequesting] = useState(false);

  async function handleAllow() {
    setRequesting(true);
    setError(null);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      setError('Could not request location permission. You can enable it later from Settings.');
    } finally {
      setRequesting(false);
      onDone();
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find stations near you</Text>
      <Text style={styles.body}>
        GaadiGrid uses your location to show nearby fuel stations, live queue reports, and doorstep service
        availability. You can change this anytime in your device settings.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton title="Allow location access" onPress={handleAllow} loading={requesting} style={styles.cta} />
      <PrimaryButton title="Not now" onPress={onDone} variant="secondary" style={styles.skip} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  skip: {
    alignSelf: 'stretch',
  },
});
