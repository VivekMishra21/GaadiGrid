import React from 'react';
import { useState } from 'react';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { Sidebar } from './components/admin/Sidebar';
import { Topbar } from './components/admin/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { DisputesPage } from './pages/DisputesPage';
import { LoginPage } from './pages/LoginPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { SettingsPage } from './pages/SettingsPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { StationsPage } from './pages/StationsPage';
import { WrongPortalPage } from './pages/WrongPortalPage';
import './App.css';

const TITLES = {
  dashboard: 'Dashboard',
  providers: 'Providers',
  disputes: 'Disputes',
  stations: 'Stations',
  settlements: 'Settlements',
  settings: 'Settings',
};

function AdminShell() {
  const [active, setActive] = useState('dashboard');

  return (
    <div className="shell">
      <Sidebar active={active} onSelect={setActive} />
      <div className="main">
        <Topbar title={TITLES[active]} />
        <div className="content">
          {active === 'dashboard' ? <DashboardPage /> : null}
          {active === 'providers' ? <ProvidersPage /> : null}
          {active === 'disputes' ? <DisputesPage /> : null}
          {active === 'stations' ? <StationsPage /> : null}
          {active === 'settlements' ? <SettlementsPage /> : null}
          {active === 'settings' ? <SettingsPage /> : null}
        </div>
      </div>
    </div>
  );
}

function Gate() {
  const { user, loading, hasPortalAccess } = useAuth();

  if (loading) return null;
  if (!user) return <LoginPage />;
  if (!hasPortalAccess) return <WrongPortalPage />;
  return <AdminShell />;
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;
