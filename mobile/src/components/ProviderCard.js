import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../theme/colors';

export function ProviderCard({ provider, onPress }) {
  const label = [
    provider.business_name,
    provider.verification_status === 'VERIFIED' ? 'Verified business' : null,
    provider.locality ? `${provider.locality}, ${provider.city}` : provider.city,
    provider.review_count > 0 ? `Rated ${provider.average_rating.toFixed(1)} out of 5, ${provider.review_count} reviews` : null,
    provider.description || null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.header} importantForAccessibility="no-hide-descendants">
        <Text style={styles.name} numberOfLines={1}>
          {provider.business_name}
        </Text>
        {provider.verification_status === 'VERIFIED' ? <Text style={styles.verifiedBadge}>Verified</Text> : null}
      </View>
      <View style={styles.metaRow} importantForAccessibility="no-hide-descendants">
        <Text style={styles.address} numberOfLines={1}>
          {provider.locality ? `${provider.locality}, ${provider.city}` : provider.city}
        </Text>
        {provider.review_count > 0 ? (
          <Text style={styles.rating}>★ {provider.average_rating.toFixed(1)} ({provider.review_count})</Text>
        ) : null}
      </View>
      {provider.description ? (
        <Text style={styles.description} numberOfLines={2} importantForAccessibility="no-hide-descendants">
          {provider.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedBadge: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  address: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
  },
  rating: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
});
