import React from 'react';
import styles from './StatCard.module.css';

export function StatCard({ label, value, delta }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {delta ? <span className={styles.delta}>{delta}</span> : null}
    </div>
  );
}
