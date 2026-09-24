import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return { ...actual, api: { get: vi.fn(), post: vi.fn() } };
});

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 99, role: 'ADMIN' } }),
}));

import { api } from '../api/client';
import { DashboardPage } from './DashboardPage';

const CUSTOMER = {
  id: 1,
  full_name: 'Riya Sharma',
  role: 'CUSTOMER',
  phone: '+919000000001',
  email: null,
  created_at: '2026-01-01T00:00:00Z',
  is_active: true,
};

const SELF_ADMIN = {
  id: 99,
  full_name: 'Admin User',
  role: 'ADMIN',
  phone: null,
  email: 'admin@gaadigrid.dev',
  created_at: '2026-01-01T00:00:00Z',
  is_active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardPage', () => {
  it('lists users with a deactivate action for moderatable roles', async () => {
    api.get.mockResolvedValue({ items: [CUSTOMER], meta: { page: 1, page_size: 10, total: 1, total_pages: 1 } });
    render(<DashboardPage />);

    expect(await screen.findByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
  });

  it('calls the deactivate endpoint when clicked', async () => {
    api.get.mockResolvedValue({ items: [CUSTOMER], meta: { page: 1, page_size: 10, total: 1, total_pages: 1 } });
    api.post.mockResolvedValue({ ...CUSTOMER, is_active: false });
    render(<DashboardPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/users/1/deactivate'));
  });

  it('hides the moderation action for the signed-in admin themselves', async () => {
    api.get.mockResolvedValue({ items: [SELF_ADMIN], meta: { page: 1, page_size: 10, total: 1, total_pages: 1 } });
    render(<DashboardPage />);

    expect(await screen.findByText('Admin User')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /deactivate|reactivate/i })).not.toBeInTheDocument();
  });
});
