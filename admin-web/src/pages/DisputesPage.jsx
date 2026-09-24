import React from 'react';
import { useEffect, useState } from 'react';

import { api, ApiError } from '../api/client';
import { ReasonModal } from '../components/admin/ReasonModal';
import tableStyles from '../components/admin/table.module.css';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ['ALL', 'OPEN', 'RESOLVED', 'DISMISSED'];

export function DisputesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('OPEN');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (status !== 'ALL') params.set('status', status);
    api
      .get(`/api/v1/admin/disputes?${params.toString()}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load disputes'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, status]);

  async function handleResolve(note) {
    await api.post(`/api/v1/admin/disputes/${resolvingId}/resolve`, { status: 'RESOLVED', resolution_note: note });
    setResolvingId(null);
    load();
  }

  async function handleDismiss(note) {
    await api.post(`/api/v1/admin/disputes/${dismissingId}/resolve`, { status: 'DISMISSED', resolution_note: note });
    setDismissingId(null);
    load();
  }

  const disputes = data?.items || [];
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
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s}
            </option>
          ))}
        </select>
      </div>

      <div className={tableStyles.tableWrap}>
        {loading ? (
          <p className={tableStyles.empty}>Loading…</p>
        ) : error ? (
          <p className={tableStyles.empty} style={{ color: 'var(--orange)' }}>
            {error}
          </p>
        ) : disputes.length === 0 ? (
          <p className={tableStyles.empty}>No disputes.</p>
        ) : (
          <>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Raised</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr key={d.id}>
                    <td>#{d.booking_id}</td>
                    <td className={tableStyles.muted} style={{ maxWidth: 320 }}>
                      {d.reason}
                      {d.resolution_note ? (
                        <div style={{ fontSize: 11, marginTop: 4 }}>Resolution: {d.resolution_note}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className={tableStyles.badge} style={{ color: d.status === 'OPEN' ? 'var(--orange)' : undefined }}>
                        {d.status}
                      </span>
                    </td>
                    <td className={tableStyles.muted}>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {d.status === 'OPEN' ? (
                        <>
                          <button onClick={() => setResolvingId(d.id)} style={actionBtnStyle('var(--green)')}>
                            Resolve
                          </button>
                          <button onClick={() => setDismissingId(d.id)} style={actionBtnStyle('var(--text-secondary)')}>
                            Dismiss
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && meta.total_pages > 1 ? (
              <div className={tableStyles.pager}>
                <button
                  className={tableStyles.pagerBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
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

      {resolvingId !== null ? (
        <ReasonModal title="Resolve dispute" confirmLabel="Resolve" onClose={() => setResolvingId(null)} onConfirm={handleResolve} />
      ) : null}
      {dismissingId !== null ? (
        <ReasonModal title="Dismiss dispute" confirmLabel="Dismiss" onClose={() => setDismissingId(null)} onConfirm={handleDismiss} />
      ) : null}
    </div>
  );
}

function actionBtnStyle(color) {
  return {
    background: 'none',
    border: 'none',
    color,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 12,
  };
}
