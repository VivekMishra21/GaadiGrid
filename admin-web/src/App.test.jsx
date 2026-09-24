import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

vi.mock('./api/client', async () => {
  const actual = await vi.importActual('./api/client');
  return { ...actual, api: { post: vi.fn(), get: vi.fn() } };
});

import { api } from './api/client';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

async function loginAs(role) {
  api.post.mockResolvedValue({
    access_token: 'a',
    refresh_token: 'b',
    user: { id: 1, role, email: `${role.toLowerCase()}@gaadigrid.dev`, full_name: 'Test User' },
  });

  render(<App />);
  fireEvent.change(await screen.findByLabelText(/email/i), { target: { value: 'x@gaadigrid.dev' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('Admin portal role gating', () => {
  it('denies a CUSTOMER account with an honest wrong-portal message, not a broken screen', async () => {
    await loginAs('CUSTOMER');
    expect(await screen.findByText(/doesn.t have admin access/i)).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('denies a PROVIDER_OWNER account', async () => {
    await loginAs('PROVIDER_OWNER');
    expect(await screen.findByText(/doesn.t have admin access/i)).toBeInTheDocument();
  });

  it('grants access to an ADMIN account', async () => {
    api.get.mockResolvedValue({ items: [], meta: { page: 1, page_size: 10, total: 0, total_pages: 1 } });
    await loginAs('ADMIN');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument());
  });

  it('grants access to a SUPER_ADMIN account', async () => {
    api.get.mockResolvedValue({ items: [], meta: { page: 1, page_size: 10, total: 0, total_pages: 1 } });
    await loginAs('SUPER_ADMIN');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument());
  });
});
