import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { categoryLabel } from '../constants/services';
import { getProvider } from '../api/providersApi';
import { colors } from '../theme/colors';

export function ProviderDetailScreen({ route, navigation }) {
  const { providerId } = route.params;
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = useCallback(() => {
    setStatus('loading');
    getProvider(providerId)
      .then((p) => {
        setProvider(p);
        setStatus('loaded');
      })
      .catch(() => setStatus('error'));
  }, [providerId]);

  useEffect(load, [load]);

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  if (status === 'error' || !provider) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Couldn&apos;t load this business.</Text>
        <PrimaryButton title="Retry" onPress={load} variant="secondary" style={{ marginTop: 16, marginHorizontal: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.name}>{provider.business_name}</Text>
        {provider.verification_status === 'VERIFIED' ? <Text style={styles.verified}>Verified business</Text> : null}
        {provider.review_count > 0 ? (
          <Text style={styles.rating}>
            ★ {provider.average_rating.toFixed(1)} · {provider.review_count} review{provider.review_count === 1 ? '' : 's'}
          </Text>
        ) : null}
        <Text style={styles.address}>{provider.address}</Text>
        {provider.description ? <Text style={styles.description}>{provider.description}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        {provider.packages.length === 0 ? (
          <Text style={styles.muted}>No services listed yet.</Text>
        ) : (
          provider.packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={styles.packageCard}
              onPress={() => navigation.navigate('Booking', { providerId: provider.id, package: pkg })}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packageMeta}>
                  {categoryLabel(pkg.category)} · {pkg.duration_minutes} min · {pkg.is_doorstep ? 'At your location' : 'Visit provider'}
                </Text>
                {pkg.description ? <Text style={styles.packageDescription}>{pkg.description}</Text> : null}
              </View>
              <Text style={styles.packagePrice}>₹{pkg.price.toFixed(0)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  verified: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  rating: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  address: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 19,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  packageName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  packageMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  packageDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  packagePrice: {
    color: colors.green,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
