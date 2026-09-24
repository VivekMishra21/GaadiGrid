import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return { ...actual, api: { get: vi.fn(), post: vi.fn() } };
});

import { api } from '../api/client';
import { ProvidersPage } from './ProvidersPage';

const PENDING_PROVIDER = {
  id: 1,
  business_name: 'Sparkle Auto Care',
  city: 'Pune',
  verification_status: 'PENDING',
  is_active: true,
  business_registration_number: 'REG123',
  gst_number: null,
  verification_notes: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProvidersPage', () => {
  it('lists providers and shows verification status', async () => {
    api.get.mockResolvedValue({ items: [PENDING_PROVIDER], meta: { page: 1, page_size: 10, total: 1, total_pages: 1 } });
    render(<ProvidersPage />);

    expect(await screen.findByText('Sparkle Auto Care')).toBeInTheDocument();
    expect(screen.getByText('PENDING', { selector: 'span' })).toBeInTheDocument();
  });

  it('verifies a pending provider', async () => {
    api.get.mockResolvedValue({ items: [PENDING_PROVIDER], meta: { page: 1, page_size: 10, total: 1, total_pages: 1 } });
    api.post.mockResolvedValue({ ...PENDING_PROVIDER, verification_status: 'VERIFIED' });
    render(<ProvidersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/providers/1/verify'));
  });

  it('rejects a pending provider with a reason', async () => {
    api.get.mockResolvedValue({ items: [PENDING_PROVIDER], meta: { page: 1, page_size: 10, total: 1, total_pages: 1 } });
    api.post.mockResolvedValue({ ...PENDING_PROVIDER, verification_status: 'REJECTED' });
    render(<ProvidersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Missing GST number' } });
    const rejectButtons = screen.getAllByRole('button', { name: 'Reject' });
    fireEvent.click(rejectButtons[rejectButtons.length - 1]);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/v1/admin/providers/1/reject', { reason: 'Missing GST number' })
    );
  });

  it('deactivates an active provider', async () => {
    api.get.mockResolvedValue({ items: [PENDING_PROVIDER], meta: { page: 1, page_size: 10, total: 1, total_pages: 1 } });
    api.post.mockResolvedValue({ ...PENDING_PROVIDER, is_active: false });
    render(<ProvidersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/providers/1/deactivate'));
  });
});
