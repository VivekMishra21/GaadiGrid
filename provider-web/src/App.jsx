import React from 'react';
import { useState } from 'react';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { Sidebar } from './components/Sidebar';
import { BookingsPage } from './pages/BookingsPage';
import { BusinessPage } from './pages/BusinessPage';
import { EarningsPage } from './pages/EarningsPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { WrongPortalPage } from './pages/WrongPortalPage';

function ProviderShell() {
  const [active, setActive] = useState('business');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar active={active} onSelect={setActive} />
      <div style={{ flex: 1 }}>
        {active === 'business' ? <BusinessPage /> : null}
        {active === 'bookings' ? <BookingsPage /> : null}
        {active === 'earnings' ? <EarningsPage /> : null}
        {active === 'settings' ? <SettingsPage /> : null}
      </div>
    </div>
  );
}

function Gate() {
  const { user, loading, hasPortalAccess } = useAuth();

  if (loading) return null;
  if (!user) return <LoginPage />;
  if (!hasPortalAccess) return <WrongPortalPage />;
  return <ProviderShell />;
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;
