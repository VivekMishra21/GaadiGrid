import React from 'react';
import { Logo } from './Logo';
import styles from './LogoWordmark.module.css';

export function LogoWordmark({ size = 36, variant = 'dark', showTagline = false }) {
  const pinColor = variant === 'dark' ? '#EAF0F5' : '#102A43';

  return (
    <div className={styles.row}>
      <Logo size={size} pinColor={pinColor} />
      <div>
        <div className={variant === 'dark' ? styles.textDark : styles.textLight}>GaadiGrid</div>
        {showTagline ? <div className={styles.tagline}>Fuel. Clean. Care. Drive.</div> : null}
      </div>
    </div>
  );
}
