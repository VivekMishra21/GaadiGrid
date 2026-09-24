import React from 'react';
import { useAuth } from '../auth/AuthContext';
import tableStyles from '../components/admin/table.module.css';

export function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className={tableStyles.tableWrap} style={{ padding: 20 }}>
      <p style={{ margin: '0 0 4px', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
        {user?.full_name}
      </p>
      <p style={{ margin: '0 0 4px', color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</p>
      <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: 13 }}>Role: {user?.role}</p>
      <button
        onClick={logout}
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 14px',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  );
}
