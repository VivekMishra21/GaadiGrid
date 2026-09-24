import React from 'react';
import { useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import { LogoWordmark } from '../components/LogoWordmark';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('owner@gaadigrid.dev');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Enter both email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <LogoWordmark size={40} variant="dark" showTagline />
        </div>
        <h2 className={styles.heading}>Provider sign in</h2>

        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label className={styles.label}>
          Password
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className={styles.hint}>Dev seed owner: owner@gaadigrid.dev / GaadiGrid@Dev123</p>
      </form>
    </div>
  );
}
