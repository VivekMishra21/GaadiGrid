import React from 'react';

import { LogoWordmark } from './LogoWordmark';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { key: 'business', label: 'My Business' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'settings', label: 'Settings' },
];

export function Sidebar({ active, onSelect }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <LogoWordmark size={30} variant="dark" />
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === active ? styles.navItemActive : styles.navItem}
            onClick={() => onSelect(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
