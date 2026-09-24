import React from 'react';
export function NavIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
          <rect x="10" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
          <rect x="2" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
          <rect x="10" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
        </svg>
      );
    case 'stations':
      return (
        <svg {...common}>
          <path d="M4 15V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v10" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <path d="M12 8h1.5L15 10v4a1 1 0 0 1-1 1h-.5" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.6" />
          <rect x="3" y="15" width="10" height="1.5" fill="currentColor" />
          <circle cx="6.5" cy="8" r="1.2" fill="currentColor" opacity="0.6" />
        </svg>
      );
    case 'providers':
      return (
        <svg {...common}>
          <path d="M3 6.5 9 3l6 3.5v6L9 16l-6-3.5z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
          <path d="M9 9v7M3 6.5 9 9l6-2.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" opacity="0.6" />
        </svg>
      );
    case 'disputes':
      return (
        <svg {...common}>
          <path d="M9 2 3 5v4c0 4 2.5 6.5 6 7.5 3.5-1 6-3.5 6-7.5V5z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
          <path d="M9 6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="9" cy="12.5" r="0.9" fill="currentColor" />
        </svg>
      );
    case 'settlements':
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <path d="M9 5.5v7M7 7.2c0-.9.9-1.6 2-1.6s2 .5 2 1.4-.9 1.2-2 1.4-2 .6-2 1.5.9 1.3 2 1.3 2-.5 2-1.3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" opacity="0.4" fill="none" />
        </svg>
      );
    default:
      return null;
  }
}
