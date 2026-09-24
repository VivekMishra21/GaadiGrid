import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { LogoWordmark } from '../components/LogoWordmark';

export function WrongPortalPage() {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'var(--bg)',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <LogoWordmark size={40} variant="dark" />
      <div>
        <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>
          This account doesn&apos;t have admin access
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 360 }}>
          {user?.email} is signed in as {user?.role}. The admin portal is only for Admin and Super Admin accounts.
        </p>
      </div>
      <button
        onClick={logout}
        style={{
          background: 'var(--green)',
          color: '#0b1b14',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  );
}
