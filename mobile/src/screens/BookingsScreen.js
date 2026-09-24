import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { cancelBooking, listMyBookings } from '../api/bookingsApi';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { BOOKING_STATUS_LABELS } from '../constants/services';
import { colors } from '../theme/colors';

const STATUS_COLOR = {
  PENDING: colors.orange,
  CONFIRMED: colors.green,
  IN_PROGRESS: colors.green,
  COMPLETED: colors.textMuted,
  CANCELLED: colors.error,
  REJECTED: colors.error,
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
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.packageName}>{booking.package_name}</Text>
        <Text style={[styles.status, { color: STATUS_COLOR[booking.status] || colors.textMuted }]}>
          {BOOKING_STATUS_LABELS[booking.status] || booking.status}
        </Text>
      </View>
      <Text style={styles.providerName}>{booking.provider_name}</Text>
      <Text style={styles.meta}>
        {formatDateTime(booking.scheduled_at)} · ₹{booking.price_at_booking.toFixed(0)}
      </Text>
      {booking.cancellation_reason ? <Text style={styles.reason}>Reason: {booking.cancellation_reason}</Text> : null}
      {needsPayment ? (
        <>
          <Text style={styles.paymentHint}>
            {booking.payment_status === 'FAILED' ? 'Payment failed — try again to lock in your slot.' : 'Payment required before the service can start.'}
          </Text>
          <PrimaryButton title="Pay now" onPress={() => onPay(booking)} style={styles.payButton} />
        </>
      ) : null}
      {canReview ? (
        <PrimaryButton title="Rate this service" onPress={() => onReview(booking)} variant="secondary" style={styles.cancelButton} />
      ) : null}
      {canCancel ? (
        <PrimaryButton
          title="Cancel booking"
          onPress={() => onCancel(booking)}
          variant="secondary"
          loading={cancelling}
          style={styles.cancelButton}
        />
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

  const load = useCallback(() => {
    listMyBookings()
      .then((res) => setBookings(res.items))
      .catch(() => setBookings([]));
  }, []);

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
      <Text style={styles.title}>My bookings</Text>
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
            <Text style={styles.muted}>Loading...</Text>
          ) : (
            <EmptyState title="No bookings yet" subtitle="Book a car care service from the Services tab." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  packageName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  providerName: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
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
