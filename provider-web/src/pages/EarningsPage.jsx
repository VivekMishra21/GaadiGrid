import React from 'react';
import { useEffect, useState } from 'react';

import { getBookingReport, getMyProvider, listMySettlements } from '../api/providerApi';
import styles from './EarningsPage.module.css';

const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function EarningsPage() {
  const [settlements, setSettlements] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    getMyProvider().then((provider) => {
      if (!provider) {
        setSettlements([]);
        return;
      }
      listMySettlements(provider.id).then((res) => setSettlements(res.items));
    });
    getBookingReport().then(setReport);
  }, []);

  const totalNet = (settlements || []).reduce((sum, s) => sum + s.net_payable_amount, 0);
  const pendingNet = (settlements || []).filter((s) => s.status === 'PENDING').reduce((sum, s) => sum + s.net_payable_amount, 0);
  const paidOutNet = (settlements || []).filter((s) => s.status === 'PAID_OUT').reduce((sum, s) => sum + s.net_payable_amount, 0);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Earnings</h1>
      <p className={styles.subtitle}>
        One settlement is created automatically for each completed, paid booking. Payouts are issued manually by
        GaadiGrid admin — there is no real bank transfer integration yet.
      </p>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total earned</div>
          <div className={styles.summaryValue}>₹{totalNet.toFixed(2)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Awaiting payout</div>
          <div className={styles.summaryValue}>₹{pendingNet.toFixed(2)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Paid out</div>
          <div className={styles.summaryValue}>₹{paidOutNet.toFixed(2)}</div>
        </div>
      </div>

      {report ? (
        <>
          <h2 className={styles.title} style={{ fontSize: 15, marginTop: 8 }}>
            Bookings
          </h2>
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Total bookings</div>
              <div className={styles.summaryValue}>{report.total_bookings}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Completed</div>
              <div className={styles.summaryValue}>{report.completed_count}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Cancellation rate</div>
              <div className={styles.summaryValue}>{(report.cancellation_rate * 100).toFixed(1)}%</div>
            </div>
          </div>
          {Object.keys(report.by_status).length > 0 ? (
            <div className={styles.tableWrap} style={{ marginBottom: 24 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.by_status).map(([status, count]) => (
                    <tr key={status}>
                      <td>{STATUS_LABELS[status] || status}</td>
                      <td className={styles.muted}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {settlements === null ? <p className={styles.empty}>Loading…</p> : null}
      {settlements && settlements.length === 0 ? (
        <p className={styles.empty}>No settlements yet — these appear once a booking is completed and paid.</p>
      ) : null}

      {settlements && settlements.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Gross</th>
                <th>Commission</th>
                <th>Net payable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id}>
                  <td className={styles.muted}>{formatDate(s.created_at)}</td>
                  <td>₹{s.gross_amount.toFixed(2)}</td>
                  <td className={styles.muted}>
                    ₹{s.commission_amount.toFixed(2)} ({(s.commission_rate * 100).toFixed(0)}%)
                  </td>
                  <td>₹{s.net_payable_amount.toFixed(2)}</td>
                  <td>
                    <span className={s.status === 'PAID_OUT' ? styles.badgePaid : styles.badge}>
                      {s.status === 'PAID_OUT' ? 'Paid out' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
