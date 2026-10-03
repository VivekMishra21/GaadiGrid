import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { LoadingMark } from '../components/LoadingMark';
import { cancelBooking, listMyBookings } from '../api/bookingsApi';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { IconBadge } from '../components/IconBadge';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button } from '../components/Button';
import { BOOKING_STATUS_LABELS } from '../constants/services';
import { selectCurrentVehicle, useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { radius, shadow } from '../theme/tokens';
import { vehicleTitle } from '../utils/format';

const STATUS_STYLE = {
  PENDING: { bg: colors.orangeSoft, fg: '#C95F12' },
  CONFIRMED: { bg: colors.greenSoft, fg: colors.greenDark },
  IN_PROGRESS: { bg: colors.greenSoft, fg: colors.greenDark },
  COMPLETED: { bg: colors.surfaceRaised, fg: colors.textSecondary },
  CANCELLED: { bg: colors.errorSoft, fg: colors.error },
  REJECTED: { bg: colors.errorSoft, fg: colors.error },
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const DISPUTABLE_STATUSES = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

function BookingCard({ booking, onCancel, onPay, onReview, onDispute, cancelling }) {
  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const needsPayment = booking.status === 'CONFIRMED' && booking.payment_status !== 'PAID';
  const canReview = booking.status === 'COMPLETED';
  const canDispute = DISPUTABLE_STATUSES.includes(booking.status);
  const tone = STATUS_STYLE[booking.status] || STATUS_STYLE.COMPLETED;
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <IconBadge name="sparkles" size={44} tone={booking.status === 'COMPLETED' ? 'neutral' : 'green'} />
        <View style={{ flex: 1 }}>
          <Text style={styles.packageName}>{booking.package_name}</Text>
          <Text style={styles.providerName}>{booking.provider_name}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.status, { color: tone.fg }]}>{BOOKING_STATUS_LABELS[booking.status] || booking.status}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="calendar" size={14} color={colors.textMuted} />
          <Text style={styles.meta}>{formatDateTime(booking.scheduled_at)}</Text>
        </View>
        <Text style={styles.price}>₹{booking.price_at_booking.toFixed(0)}</Text>
      </View>
      {booking.cancellation_reason ? <Text style={styles.reason}>Reason: {booking.cancellation_reason}</Text> : null}
      {needsPayment ? (
        <>
          <Text style={styles.paymentHint}>
            {booking.payment_status === 'FAILED' ? 'Payment failed — try again to lock in your slot.' : 'Payment required before the service can start.'}
          </Text>
          <Button fullWidth onPress={() => onPay(booking)} style={styles.payButton}>Pay now</Button>
        </>
      ) : null}
      {canReview ? (
        <Button fullWidth onPress={() => onReview(booking)} variant="secondary" style={styles.cancelButton}>Rate this service</Button>
      ) : null}
      {canCancel ? (
        <Button fullWidth onPress={() => onCancel(booking)} variant="secondary" loading={cancelling} style={styles.cancelButton}>Cancel booking</Button>
      ) : null}
      {canDispute ? (
        <TouchableOpacity onPress={() => onDispute(booking)} style={styles.disputeLink}>
          <Text style={styles.disputeLinkText}>Report a problem</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function BookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const vehicle = useVehicleStore(selectCurrentVehicle);
  const vehicleCount = useVehicleStore((s) => s.vehicles.length);
  // With several vehicles, default to the selected one's bookings; "All" is one tap away.
  const [scope, setScope] = useState('vehicle');
  const scopedVehicleId = vehicleCount > 1 && scope === 'vehicle' ? vehicle?.id : null;

  const load = useCallback(() => {
    listMyBookings(1, scopedVehicleId)
      .then((res) => setBookings(res.items))
      .catch(() => setBookings([]));
  }, [scopedVehicleId]);

  useFocusEffect(load);

  async function handleRefresh() {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }

  async function handleCancel(booking) {
    setCancellingId(booking.id);
    try {
      await cancelBooking(booking.id);
      load();
    } catch {
      // best-effort; the card just won't update
    } finally {
      setCancellingId(null);
    }
  }

  function handlePay(booking) {
    navigation.navigate('Payment', {
      bookingId: booking.id,
      packageName: booking.package_name,
      amount: booking.price_at_booking,
    });
  }

  function handleReview(booking) {
    navigation.navigate('Review', { bookingId: booking.id, packageName: booking.package_name });
  }

  function handleDispute(booking) {
    navigation.navigate('Dispute', { bookingId: booking.id, packageName: booking.package_name });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="My bookings" subtitle="Track every service from request to completion" />
      {vehicleCount > 1 ? (
        <View style={styles.scopeRow}>
          {[
            { key: 'vehicle', label: vehicleTitle(vehicle) || 'This vehicle' },
            { key: 'all', label: 'All vehicles' },
          ].map((o) => (
            <TouchableOpacity
              key={o.key}
              onPress={() => {
                setBookings(null);
                setScope(o.key);
              }}
              style={[styles.scopeChip, scope === o.key && styles.scopeChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: scope === o.key }}
            >
              <Text style={[styles.scopeText, scope === o.key && styles.scopeTextActive]} numberOfLines={1}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <FlatList
        data={bookings || []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onCancel={handleCancel}
            onPay={handlePay}
            onReview={handleReview}
            onDispute={handleDispute}
            cancelling={cancellingId === item.id}
          />
        )}
        ListEmptyComponent={
          bookings === null ? (
            <LoadingMark />
          ) : (
            <EmptyState icon="calendarCheck" title="No bookings yet" subtitle="Book a car care service from the Services tab." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scopeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  scopeChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 200,
  },
  scopeChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  scopeText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  scopeTextActive: { color: '#FFFFFF' },
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    ...shadow.card,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packageName: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  statusPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  status: { fontSize: 11, fontWeight: '800' },
  providerName: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  meta: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  price: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  reason: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  cancelButton: {
    marginTop: 12,
  },
  disputeLink: {
    marginTop: 12,
    alignSelf: 'center',
  },
  disputeLinkText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  paymentHint: {
    color: colors.orange,
    fontSize: 12,
    marginTop: 10,
  },
  payButton: {
    marginTop: 10,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
