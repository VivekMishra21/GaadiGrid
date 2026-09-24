import React from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../api/client';
import { cancelBooking, completeBooking, confirmBooking, listMyBookings, rejectBooking, startBooking } from '../api/providerApi';
import styles from './BookingsPage.module.css';

const BADGE_CLASS = {
  PENDING: styles.badgePending,
  CONFIRMED: styles.badgeConfirmed,
  IN_PROGRESS: styles.badgeInProgress,
  COMPLETED: styles.badgeCompleted,
  CANCELLED: styles.badgeCancelled,
  REJECTED: styles.badgeRejected,
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function BookingsPage() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    listMyBookings()
      .then((res) => setBookings(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load bookings'));
  }

  useEffect(load, []);

  async function handleAction(action, booking, needsReason) {
    let reason;
    if (needsReason) {
      reason = window.prompt('Reason (optional):') || undefined;
    }
    setBusyId(booking.id);
    try {
      if (action === 'confirm') await confirmBooking(booking.id);
      else if (action === 'reject') await rejectBooking(booking.id, reason);
      else if (action === 'start') await startBooking(booking.id);
      else if (action === 'complete') await completeBooking(booking.id);
      else if (action === 'cancel') await cancelBooking(booking.id, reason);
      load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Bookings</h1>

      {error ? <p className={styles.empty}>{error}</p> : null}
      {bookings === null && !error ? <p className={styles.empty}>Loading…</p> : null}
      {bookings && bookings.length === 0 ? <p className={styles.empty}>No bookings yet.</p> : null}

      {bookings?.map((booking) => (
        <div className={styles.card} key={booking.id}>
          <div className={styles.row}>
            <div>
              <div className={styles.packageName}>{booking.package_name}</div>
              <div className={styles.meta}>{formatDateTime(booking.scheduled_at)} · ₹{booking.price_at_booking}</div>
              {booking.notes ? <div className={styles.muted}>Note: {booking.notes}</div> : null}
              {booking.cancellation_reason ? <div className={styles.muted}>Reason: {booking.cancellation_reason}</div> : null}
              {booking.status === 'CONFIRMED' && (
                <div className={styles.muted}>
                  Payment: {booking.payment_status === 'PAID' ? 'Paid' : 'Awaiting customer payment'}
                </div>
              )}
            </div>
            <span className={BADGE_CLASS[booking.status] || styles.badge}>{booking.status.replace('_', ' ')}</span>
          </div>

          <div className={styles.actions}>
            {booking.status === 'PENDING' && (
              <>
                <button className={styles.btnPrimary} disabled={busyId === booking.id} onClick={() => handleAction('confirm', booking, false)}>
                  Confirm
                </button>
                <button className={styles.btnDanger} disabled={busyId === booking.id} onClick={() => handleAction('reject', booking, true)}>
                  Reject
                </button>
              </>
            )}
            {booking.status === 'CONFIRMED' && (
              <>
                <button
                  className={styles.btnPrimary}
                  disabled={busyId === booking.id || booking.payment_status !== 'PAID'}
                  title={booking.payment_status !== 'PAID' ? 'Waiting for the customer to pay' : undefined}
                  onClick={() => handleAction('start', booking, false)}
                >
                  Start service
                </button>
                <button className={styles.btnSecondary} disabled={busyId === booking.id} onClick={() => handleAction('cancel', booking, true)}>
                  Cancel
                </button>
              </>
            )}
            {booking.status === 'IN_PROGRESS' && (
              <button className={styles.btnPrimary} disabled={busyId === booking.id} onClick={() => handleAction('complete', booking, false)}>
                Mark completed
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
