import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from './AppText';
import { queueSignalColor } from '../constants/queue';
import { colors } from '../theme/colors';
import { radius, shadow } from '../theme/tokens';
import { Icon } from './Icon';
import { IconBadge } from './IconBadge';

function cheapestPrice(prices) {
  if (!prices || prices.length === 0) return null;
  return prices.reduce((min, p) => (p.price < min.price ? p : min), prices[0]);
}

export function StationCard({ station, onPress }) {
  const cheapest = cheapestPrice(station.prices);
  const queue = station.queue_status?.queue;

  const priceLabel = cheapest ? `${cheapest.fuel_type_code} ₹${cheapest.price.toFixed(2)}` : 'No prices yet';
  const queueLabel = queue?.value ? `${queue.label}, reported ${queue.last_reported_minutes_ago} minutes ago` : 'No recent queue reports';
  const label = [
    station.name,
    station.locality ? `${station.locality}, ${station.city}` : station.city,
    station.is_favorite ? 'Favorited' : null,
    station.distance_km != null ? `${station.distance_km} km away` : null,
    priceLabel,
    queueLabel,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.header} importantForAccessibility="no-hide-descendants">
        <IconBadge name="fuel" size={46} />
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {station.name}
          </Text>
          <View style={styles.addressRow}>
            <Icon name="mapPin" size={13} color={colors.textMuted} />
            <Text style={styles.address} numberOfLines={1}>
              {station.locality ? `${station.locality}, ${station.city}` : station.city}
            </Text>
          </View>
        </View>
        {station.is_favorite ? <Icon name="star" size={18} color={colors.orange} fill={colors.orange} /> : null}
        {station.distance_km != null ? (
          <View style={styles.distancePill}>
            <Text style={styles.distance}>{station.distance_km} km</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer} importantForAccessibility="no-hide-descendants">
        {cheapest ? (
          <View style={styles.priceBlock}>
            <Text style={styles.fuelCode}>{cheapest.fuel_type_code}</Text>
            <Text style={styles.price}>₹{cheapest.price.toFixed(2)}</Text>
          </View>
        ) : (
          <Text style={styles.priceMuted}>No prices yet</Text>
        )}

        <View style={styles.queueRow}>
          {queue?.value ? (
            <>
              <View style={[styles.dot, { backgroundColor: queueSignalColor(queue.value) }]} />
              <Text style={styles.queueText}>
                {queue.label} · {queue.last_reported_minutes_ago}m ago
              </Text>
            </>
          ) : (
            <Text style={styles.queueMuted}>No recent queue reports</Text>
          )}
        </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBlock: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  address: { color: colors.textSecondary, fontSize: 12, flexShrink: 1 },
  distancePill: { backgroundColor: colors.greenSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  distance: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  priceBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  fuelCode: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  price: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  priceMuted: { color: colors.textMuted, fontSize: 12 },
  queueRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  queueText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  queueMuted: { color: colors.textMuted, fontSize: 12 },
});
