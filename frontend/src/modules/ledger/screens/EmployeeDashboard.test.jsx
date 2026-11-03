import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../shared/api/index.js', () => ({
  api: { summary: vi.fn(), cancelRed: vi.fn(), cancelBlack: vi.fn() },
  getToken: () => null,
  setToken: () => {},
}));

vi.mock('../../auth/index.js', () => ({
  useAuth: () => ({ user: { name: 'rico', role: 'employee' } }),
}));

vi.mock('../../attendance/index.js', () => ({
  CheckInModal: () => <div>checkin-modal</div>,
}));

vi.mock('../../rewards/index.js', () => ({
  RewardModal: () => <div>reward-modal</div>,
}));

import { api } from '../../../shared/api/index.js';
import { EmployeeDashboard } from '../index.js';

const summary = (o = {}) => ({ green: 5, red: 1, black: 1, deductions_egp: 1250, progress: 5, ...o });

describe('Ledger Module - EmployeeDashboard Screen', () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); });

  it('shows loading then the point cards and deductions', async () => {
    api.summary.mockResolvedValue(summary());
    render(<EmployeeDashboard />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(await screen.findByText('Red: 1 x 250 EGP = 250 EGP')).toBeInTheDocument();
    expect(screen.getByText('Black: 1 x 1000 EGP = 1000 EGP')).toBeInTheDocument();
    expect(screen.getByText('1250 EGP')).toBeInTheDocument();
    expect(screen.getByText(/5\/30/)).toBeInTheDocument();
    expect(screen.getByText('Welcome, rico')).toBeInTheDocument();
  });

  it('disables the reward button below 30 points and enables it at 30', async () => {
    api.summary.mockResolvedValue(summary());
    const { unmount } = render(<EmployeeDashboard />);
    expect(await screen.findByRole('button', { name: 'Send Reward Request' })).toBeDisabled();
    unmount();
    api.summary.mockResolvedValue(summary({ green: 30, progress: 30 }));
    render(<EmployeeDashboard />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send Reward Request' })).toBeEnabled());
  });

  it('opens the check-in modal', async () => {
    api.summary.mockResolvedValue(summary());
    render(<EmployeeDashboard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Check In' }));
    expect(screen.getByText('checkin-modal')).toBeInTheDocument();
  });

  it('shows the error when the summary fails', async () => {
    api.summary.mockRejectedValue(new Error('boom'));
    render(<EmployeeDashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });
});

