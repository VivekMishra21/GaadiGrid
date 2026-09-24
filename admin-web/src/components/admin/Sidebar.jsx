import React from 'react';
import { LogoWordmark } from '../LogoWordmark';
import { NavIcon } from './NavIcon';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'providers', label: 'Providers' },
  { key: 'disputes', label: 'Disputes' },
  { key: 'stations', label: 'Stations' },
  { key: 'settlements', label: 'Settlements' },
  { key: 'settings', label: 'Settings' },
];

export function Sidebar({ active, onSelect }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <LogoWordmark size={32} variant="dark" showTagline />
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === active ? styles.navItemActive : styles.navItem}
            onClick={() => onSelect(item.key)}
          >
            <NavIcon name={item.key} />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
