import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from './AppText';
import { colors } from '../theme/colors';
import { radius, shadow } from '../theme/tokens';
import { Icon } from './Icon';
import { IconBadge } from './IconBadge';

export function ProviderCard({ provider, onPress }) {
  const verified = provider.verification_status === 'VERIFIED';
  const area = provider.locality ? `${provider.locality}, ${provider.city}` : provider.city;
  const label = [
    provider.is_sponsored ? 'Sponsored' : null,
    provider.business_name,
    verified ? 'Verified business' : null,
    area,
    provider.review_count > 0 ? `Rated ${provider.average_rating.toFixed(1)} out of 5, ${provider.review_count} reviews` : null,
    provider.description || null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <TouchableOpacity
      style={[styles.card, provider.is_sponsored && styles.cardSponsored]}
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {provider.is_sponsored ? (
        <View style={styles.sponsoredBadge} importantForAccessibility="no-hide-descendants">
          <Text style={styles.sponsoredText}>★ Sponsored</Text>
        </View>
      ) : null}

      <View style={styles.header} importantForAccessibility="no-hide-descendants">
        <IconBadge name="store" tone={provider.is_sponsored ? 'orange' : 'green'} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {provider.business_name}
          </Text>
          <View style={styles.metaRow}>
            <Icon name="mapPin" size={13} color={colors.textMuted} />
            <Text style={styles.address} numberOfLines={1}>
              {area}
            </Text>
          </View>
        </View>
        <Icon name="chevronRight" size={20} color={colors.textMuted} />
      </View>

      {provider.description ? (
        <Text style={styles.description} numberOfLines={2} importantForAccessibility="no-hide-descendants">
          {provider.description}
        </Text>
      ) : null}

      <View style={styles.footer} importantForAccessibility="no-hide-descendants">
        {verified ? (
          <View style={styles.verified}>
            <Icon name="badgeCheck" size={14} color={colors.greenDark} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        ) : null}
        {provider.review_count > 0 ? (
          <View style={styles.rating}>
            <Icon name="star" size={13} color={colors.orange} fill={colors.orange} />
            <Text style={styles.ratingText}>
              {provider.average_rating.toFixed(1)} ({provider.review_count})
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    ...shadow.card,
  },
  cardSponsored: { borderColor: 'rgba(255,138,52,0.55)', backgroundColor: '#FFFDFB' },
  sponsoredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 10,
  },
  sponsoredText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  address: { color: colors.textSecondary, fontSize: 12, flexShrink: 1 },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenSoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  verifiedText: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.orangeSoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  ratingText: { color: '#C95F12', fontSize: 11, fontWeight: '800' },
});
