import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return { ...actual, api: { post: vi.fn() } };
});

import { api } from '../api/client';

function renderWithAuth() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}

describe('LoginPage', () => {
  it('shows a validation error when submitted empty', async () => {
    renderWithAuth();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/enter both email and password/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('calls staff-login with entered credentials', async () => {
    api.post.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'b',
      user: { id: 1, role: 'ADMIN', email: 'admin@gaadigrid.dev', full_name: 'Admin' },
    });
    renderWithAuth();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@gaadigrid.dev' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/v1/auth/staff-login', {
        email: 'admin@gaadigrid.dev',
        password: 'secret123',
      })
    );
  });

  it('surfaces a server error on failed login', async () => {
    const { ApiError } = await import('../api/client');
    api.post.mockRejectedValue(new ApiError(401, 'invalid_credentials', 'Incorrect email or password.'));
    renderWithAuth();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@gaadigrid.dev' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/incorrect email or password/i)).toBeInTheDocument();
  });
});
