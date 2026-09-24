import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import styles from './Topbar.module.css';

export function Topbar({ title }) {
  const { user } = useAuth();
  const initial = user?.full_name?.trim()?.charAt(0)?.toUpperCase() || 'A';

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.avatar} title={user?.email}>
        {initial}
      </div>
    </header>
  );
}
