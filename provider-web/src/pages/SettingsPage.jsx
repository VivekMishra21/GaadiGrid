import React from 'react';
import { useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <div className={styles.content}>
      <div className={styles.card}>
        <p className={styles.name}>{user?.full_name}</p>
        <p className={styles.meta}>{user?.email}</p>
        <span className={styles.roleBadge}>{user?.role}</span>
      </div>

      <div className={styles.card}>
        <p className={styles.sectionTitle}>Manage your business</p>
        <p className={styles.meta}>
          Verification status and staff management now live under My Business. Your business profile, service
          packages and bookings are also there — see My Business and Bookings in the sidebar.
        </p>
      </div>

      <button className={styles.logoutBtn} style={{ alignSelf: 'flex-start' }} onClick={() => setConfirmingLogout(true)}>
        Sign out
      </button>

      {confirmingLogout ? (
        <div className={styles.overlay}>
          <div className={styles.confirmCard}>
            <p className={styles.confirmText}>Sign out of the provider portal?</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmingLogout(false)}>
                Cancel
              </button>
              <button className={styles.confirmBtn} onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
