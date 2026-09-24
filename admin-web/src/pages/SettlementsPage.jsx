import React from 'react';
import { useEffect, useState } from 'react';

import { api, ApiError } from '../api/client';
import tableStyles from '../components/admin/table.module.css';

const PAGE_SIZE = 20;

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function SettlementsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('PENDING');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (status) params.set('status', status);
    api
      .get(`/api/v1/admin/settlements?${params.toString()}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load settlements'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, status]);

  async function handlePayOut(settlement) {
    if (!window.confirm(`Mark ₹${settlement.net_payable_amount.toFixed(2)} as paid out to this provider?`)) return;
    setBusyId(settlement.id);
    try {
      await api.post(`/api/v1/admin/settlements/${settlement.id}/pay-out`);
      load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Failed to mark as paid out');
    } finally {
      setBusyId(null);
    }
  }

  const settlements = data?.items || [];
  const meta = data?.meta;

  return (
    <div>
      <div className={tableStyles.toolbar}>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: 13,
          }}
        >
          <option value="PENDING">Pending payout</option>
          <option value="PAID_OUT">Paid out</option>
          <option value="">All</option>
        </select>
        <span className={tableStyles.muted}>{meta ? `${meta.total} settlement${meta.total === 1 ? '' : 's'}` : ''}</span>
      </div>

      <div className={tableStyles.tableWrap}>
        {loading ? (
          <p className={tableStyles.empty}>Loading…</p>
        ) : error ? (
          <p className={tableStyles.empty} style={{ color: 'var(--orange)' }}>
            {error}
          </p>
        ) : settlements.length === 0 ? (
          <p className={tableStyles.empty}>No settlements in this view.</p>
        ) : (
          <>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Provider</th>
                  <th>Gross</th>
                  <th>Commission</th>
                  <th>Net payable</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td className={tableStyles.muted}>{formatDate(s.created_at)}</td>
                    <td className={tableStyles.muted}>#{s.provider_id}</td>
                    <td>₹{s.gross_amount.toFixed(2)}</td>
                    <td className={tableStyles.muted}>
                      ₹{s.commission_amount.toFixed(2)} ({(s.commission_rate * 100).toFixed(0)}%)
                    </td>
                    <td>₹{s.net_payable_amount.toFixed(2)}</td>
                    <td>
                      <span className={tableStyles.badge}>{s.status === 'PAID_OUT' ? 'Paid out' : 'Pending'}</span>
                    </td>
                    <td>
                      {s.status === 'PENDING' ? (
                        <button
                          onClick={() => handlePayOut(s)}
                          disabled={busyId === s.id}
                          style={{
                            background: 'var(--green)',
                            border: 'none',
                            color: '#0b1b14',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '6px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          Mark paid out
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && meta.total_pages > 1 ? (
              <div className={tableStyles.pager}>
                <button className={tableStyles.pagerBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </button>
                <span className={tableStyles.muted}>
                  Page {meta.page} of {meta.total_pages}
                </span>
                <button
                  className={tableStyles.pagerBtn}
                  onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                  disabled={page >= meta.total_pages}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
