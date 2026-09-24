import { fireEvent, render, screen } from '@testing-library/react';
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
  api.get.mockResolvedValue(null); // no business profile yet, by default
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

describe('Provider portal role gating', () => {
  it('denies a CUSTOMER account with an honest wrong-portal message', async () => {
    await loginAs('CUSTOMER');
    expect(await screen.findByText(/doesn.t have provider access/i)).toBeInTheDocument();
  });

  it('denies an ADMIN account (admins use the admin portal, not this one)', async () => {
    await loginAs('ADMIN');
    expect(await screen.findByText(/doesn.t have provider access/i)).toBeInTheDocument();
  });

  it('grants access to a PROVIDER_OWNER account and prompts to set up a business', async () => {
    await loginAs('PROVIDER_OWNER');
    expect(await screen.findByText(/Set up your business/i)).toBeInTheDocument();
  });

  it('grants access to a PROVIDER_STAFF account and prompts to set up a business', async () => {
    await loginAs('PROVIDER_STAFF');
    expect(await screen.findByText(/Set up your business/i)).toBeInTheDocument();
  });

  it('shows account info on the Settings tab', async () => {
    await loginAs('PROVIDER_OWNER');
    await screen.findByText(/Set up your business/i);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(await screen.findByText(/Manage your business/i)).toBeInTheDocument();
  });
});
