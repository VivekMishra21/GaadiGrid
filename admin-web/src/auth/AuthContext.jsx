import React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { api, ApiError, setAuthToken, setOnAuthExpired } from '../api/client';

const AuthContext = createContext(null);
// Only the access token (short-lived, 15 min) and the user object are kept here — the
// refresh token lives solely in the httpOnly cookie the backend sets, never in
// JS-readable storage, so an XSS on this portal can't steal a 30-day-valid admin
// credential the way reading it out of localStorage would allow.
const STORAGE_KEY = 'gaadigrid_admin_session';
export const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setOnAuthExpired(() => {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    });

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { access, user: storedUser } = JSON.parse(stored);
        setAuthToken(access);
        setUser(storedUser);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    setError(null);
    try {
      const res = await api.post('/api/v1/auth/staff-login', { email, password });
      setAuthToken(res.access_token);
      setUser(res.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ access: res.access_token, user: res.user }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }

  function logout() {
    api.post('/api/v1/auth/logout', {}).catch(() => {
      // Best-effort server-side revoke; proceed with local sign-out regardless.
    });
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const hasPortalAccess = user ? ALLOWED_ROLES.includes(user.role) : false;

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, hasPortalAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
