import React from 'react';
import { useEffect, useState } from 'react';

import { api, ApiError } from '../api/client';
import { ReasonModal } from '../components/admin/ReasonModal';
import tableStyles from '../components/admin/table.module.css';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ['ALL', 'UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'];

export function ProvidersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (q.trim()) params.set('q', q.trim());
    if (status !== 'ALL') params.set('verification_status', status);
    api
      .get(`/api/v1/admin/providers?${params.toString()}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load providers'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, q, status]);

  async function handleVerify(provider) {
    setActionError(null);
    try {
      await api.post(`/api/v1/admin/providers/${provider.id}/verify`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to verify provider');
    }
  }

  async function handleReject(reason) {
    await api.post(`/api/v1/admin/providers/${rejectingId}/reject`, { reason });
    setRejectingId(null);
    load();
  }

  async function handleToggleActive(provider) {
    setActionError(null);
    try {
      const action = provider.is_active ? 'deactivate' : 'reactivate';
      await api.post(`/api/v1/admin/providers/${provider.id}/${action}`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update provider');
    }
  }

  const providers = data?.items || [];
  const meta = data?.meta;

  return (
    <div>
      <div className={tableStyles.toolbar}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by business name or city"
            aria-label="Search providers by business name or city"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 12px',
              color: 'var(--text-primary)',
              fontSize: 13,
              minWidth: 260,
            }}
          />
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
      </div>

      {actionError ? (
        <p style={{ color: 'var(--orange)', fontSize: 13, marginBottom: 12 }}>{actionError}</p>
      ) : null}

      <div className={tableStyles.tableWrap}>
        {loading ? (
          <p className={tableStyles.empty}>Loading…</p>
        ) : error ? (
          <p className={tableStyles.empty} style={{ color: 'var(--orange)' }}>
            {error}
          </p>
        ) : providers.length === 0 ? (
          <p className={tableStyles.empty}>No providers yet.</p>
        ) : (
          <>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>City</th>
                  <th>Registration</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td>{p.business_name}</td>
                    <td className={tableStyles.muted}>{p.city}</td>
                    <td className={tableStyles.muted}>
                      {p.business_registration_number || '—'}
                      {p.gst_number ? ` · ${p.gst_number}` : ''}
                    </td>
                    <td>
                      <span className={tableStyles.badge}>{p.verification_status}</span>
                      {p.verification_status === 'REJECTED' && p.verification_notes ? (
                        <div className={tableStyles.muted} style={{ fontSize: 11, marginTop: 4, maxWidth: 220 }}>
                          {p.verification_notes}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span className={tableStyles.badge} style={{ color: p.is_active ? undefined : 'var(--orange)' }}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {p.verification_status === 'PENDING' ? (
                        <>
                          <button onClick={() => handleVerify(p)} style={actionBtnStyle('var(--green)')}>
                            Verify
                          </button>
                          <button onClick={() => setRejectingId(p.id)} style={actionBtnStyle('var(--orange)')}>
                            Reject
                          </button>
                        </>
                      ) : null}
                      <button onClick={() => handleToggleActive(p)} style={actionBtnStyle('var(--text-secondary)')}>
                        {p.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
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

      {rejectingId !== null ? (
        <ReasonModal
          title="Reject verification"
          confirmLabel="Reject"
          onClose={() => setRejectingId(null)}
          onConfirm={handleReject}
        />
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
