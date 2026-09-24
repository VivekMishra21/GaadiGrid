import React from 'react';
import { useEffect, useState } from 'react';

import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import tableStyles from '../components/admin/table.module.css';

const PAGE_SIZE = 10;
const ROLE_OPTIONS = ['ALL', 'CUSTOMER', 'PROVIDER_OWNER', 'PROVIDER_STAFF', 'ADMIN', 'SUPER_ADMIN'];
const MODERATABLE_ROLES = ['CUSTOMER', 'PROVIDER_OWNER', 'PROVIDER_STAFF'];

export function DashboardPage() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (q.trim()) params.set('q', q.trim());
    if (role !== 'ALL') params.set('role', role);
    api
      .get(`/api/v1/admin/users?${params.toString()}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, q, role]);

  async function handleToggleActive(u) {
    setActionError(null);
    try {
      const action = u.is_active ? 'deactivate' : 'reactivate';
      await api.post(`/api/v1/admin/users/${u.id}/${action}`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update user');
    }
  }

  const users = data?.items || [];
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
            placeholder="Search by name, email or phone"
            aria-label="Search users by name, email or phone"
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
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
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
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r === 'ALL' ? 'All roles' : r}
              </option>
            ))}
          </select>
        </div>
        <span className={tableStyles.muted}>{meta ? `${meta.total} user${meta.total === 1 ? '' : 's'}` : ''}</span>
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
        ) : users.length === 0 ? (
          <p className={tableStyles.empty}>No users yet.</p>
        ) : (
          <>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>
                      <span className={tableStyles.badge}>{u.role}</span>
                    </td>
                    <td className={tableStyles.muted}>{u.phone || '—'}</td>
                    <td className={tableStyles.muted}>{u.email || '—'}</td>
                    <td className={tableStyles.muted}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={tableStyles.badge} style={{ color: u.is_active ? undefined : 'var(--orange)' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {MODERATABLE_ROLES.includes(u.role) && u.id !== currentUser?.id ? (
                        <button
                          onClick={() => handleToggleActive(u)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: u.is_active ? 'var(--orange)' : 'var(--green)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
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
    </div>
  );
}
