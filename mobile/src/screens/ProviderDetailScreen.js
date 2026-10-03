import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { LoadingMark } from '../components/LoadingMark';
import { BackButton } from '../components/BackButton';
import { Icon } from '../components/Icon';
import { IconBadge } from '../components/IconBadge';
import { Button } from '../components/Button';
import { categoryLabel } from '../constants/services';
import { getProvider } from '../api/providersApi';
import { colors } from '../theme/colors';
import { radius, shadow } from '../theme/tokens';

const CATEGORY_ICON = {
  CAR_WASH: 'sparkles',
  DETAILING: 'sparkles',
  AC_SERVICE: 'snowflake',
  DENTING_PAINTING: 'paint',
  GENERAL_SERVICE: 'wrench',
  TYRE_SERVICE: 'tyre',
  BATTERY_SERVICE: 'battery',
  OTHER: 'wrench',
};

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
        <LoadingMark />
      </View>
    );
  }

  if (status === 'error' || !provider) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Couldn&apos;t load this business.</Text>
        <Button fullWidth onPress={load} variant="secondary" style={{ marginTop: 16, marginHorizontal: 20 }}>Retry</Button>
      </View>
    );
  }

  const verified = provider.verification_status === 'VERIFIED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} style={{ marginBottom: 0 }} />
      </View>

      <View style={styles.header}>
        <IconBadge name="store" size={64} tone={provider.is_sponsored ? 'orange' : 'green'} />
        <Text style={styles.name}>{provider.business_name}</Text>
        <View style={styles.pills}>
          {verified ? (
            <View style={styles.verifiedPill}>
              <Icon name="badgeCheck" size={14} color={colors.greenDark} />
              <Text style={styles.verified}>Verified business</Text>
            </View>
          ) : null}
          {provider.review_count > 0 ? (
            <View style={styles.ratingPill}>
              <Icon name="star" size={13} color={colors.orange} fill={colors.orange} />
              <Text style={styles.rating}>
                {provider.average_rating.toFixed(1)} · {provider.review_count} review{provider.review_count === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.addressRow}>
          <Icon name="mapPin" size={15} color={colors.textMuted} />
          <Text style={styles.address}>{provider.address}</Text>
        </View>
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
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Booking', { providerId: provider.id, package: pkg })}
              accessibilityRole="button"
            >
              <IconBadge name={CATEGORY_ICON[pkg.category] || 'wrench'} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <View style={styles.metaRow}>
                  <Icon name="clock" size={12} color={colors.textMuted} />
                  <Text style={styles.packageMeta}>
                    {categoryLabel(pkg.category)} · {pkg.duration_minutes} min · {pkg.is_doorstep ? 'At your location' : 'Visit provider'}
                  </Text>
                </View>
                {pkg.description ? <Text style={styles.packageDescription}>{pkg.description}</Text> : null}
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.packagePrice}>₹{pkg.price.toFixed(0)}</Text>
                <Icon name="chevronRight" size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { paddingHorizontal: 20, paddingTop: 14 },
  header: { paddingHorizontal: 20, paddingTop: 18 },
  name: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.greenSoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  verified: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.orangeSoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  rating: { color: '#C95F12', fontSize: 12, fontWeight: '800' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  address: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  description: { color: colors.textSecondary, fontSize: 14, marginTop: 10, lineHeight: 21 },
  section: { marginHorizontal: 20, marginTop: 28 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 12 },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    ...shadow.card,
  },
  packageName: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  packageMeta: { color: colors.textSecondary, fontSize: 12, flexShrink: 1 },
  packageDescription: { color: colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  priceBlock: { alignItems: 'flex-end', gap: 2 },
  packagePrice: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  muted: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
});
