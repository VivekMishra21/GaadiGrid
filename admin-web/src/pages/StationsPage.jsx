import React from 'react';
import { useEffect, useState } from 'react';

import { api, ApiError } from '../api/client';
import { StationFormModal } from '../components/admin/StationFormModal';
import tableStyles from '../components/admin/table.module.css';

const PAGE_SIZE = 10;

export function StationsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalStationId, setModalStationId] = useState(undefined); // undefined = closed, null = create, number = edit

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (q.trim()) params.set('q', q.trim());
    api
      .get(`/api/v1/stations?${params.toString()}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load stations'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, q]);

  async function handleDelete(station) {
    if (!window.confirm(`Delete ${station.name}? This cannot be undone from the admin panel.`)) return;
    try {
      await api.delete(`/api/v1/stations/${station.id}`);
      load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Failed to delete station');
    }
  }

  const stations = data?.items || [];
  const meta = data?.meta;

  return (
    <div>
      <div className={tableStyles.toolbar}>
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search by name, locality or city"
          aria-label="Search stations by name, locality or city"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: 13,
            minWidth: 280,
          }}
        />
        <button
          onClick={() => setModalStationId(null)}
          style={{
            background: 'var(--green)',
            border: 'none',
            color: '#0b1b14',
            fontSize: 13,
            fontWeight: 700,
            padding: '9px 16px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          + Add station
        </button>
      </div>

      <div className={tableStyles.tableWrap}>
        {loading ? (
          <p className={tableStyles.empty}>Loading…</p>
        ) : error ? (
          <p className={tableStyles.empty} style={{ color: 'var(--orange)' }}>
            {error}
          </p>
        ) : stations.length === 0 ? (
          <p className={tableStyles.empty}>No stations yet.</p>
        ) : (
          <>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Brand</th>
                  <th>City</th>
                  <th>Prices</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td className={tableStyles.muted}>{s.brand}</td>
                    <td className={tableStyles.muted}>
                      {s.locality ? `${s.locality}, ${s.city}` : s.city}
                    </td>
                    <td className={tableStyles.muted}>
                      {s.prices.length === 0 ? '—' : s.prices.map((p) => `${p.fuel_type_code} ₹${p.price}`).join(', ')}
                    </td>
                    <td>
                      <span className={tableStyles.badge}>Active</span>
                    </td>
                    <td>
                      <button
                        onClick={() => setModalStationId(s.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--green)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginRight: 12,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--orange)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
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

      {modalStationId !== undefined ? (
        <StationFormModal
          stationId={modalStationId}
          onClose={() => setModalStationId(undefined)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
