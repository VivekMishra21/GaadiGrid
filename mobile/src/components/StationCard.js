import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { queueSignalColor } from '../constants/queue';
import { colors } from '../theme/colors';

function cheapestPrice(prices) {
  if (!prices || prices.length === 0) return null;
  return prices.reduce((min, p) => (p.price < min.price ? p : min), prices[0]);
}

export function StationCard({ station, onPress }) {
  const cheapest = cheapestPrice(station.prices);
  const queue = station.queue_status?.queue;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {station.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {station.locality ? `${station.locality}, ${station.city}` : station.city}
          </Text>
        </View>
        {station.is_favorite ? <Text style={styles.favoriteStar}>★</Text> : null}
      </View>

      <View style={styles.metaRow}>
        {station.distance_km != null ? <Text style={styles.distance}>{station.distance_km} km away</Text> : null}
        {cheapest ? (
          <Text style={styles.price}>
            {cheapest.fuel_type_code} ₹{cheapest.price.toFixed(2)}
          </Text>
        ) : (
          <Text style={styles.priceMuted}>No prices yet</Text>
        )}
      </View>

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
  titleBlock: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  address: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  favoriteStar: {
    color: colors.orange,
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  distance: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '700',
  },
  priceMuted: {
    color: colors.textMuted,
    fontSize: 12,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  queueText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  queueMuted: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
