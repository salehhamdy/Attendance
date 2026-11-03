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

const mockHistory = [
  {
    id: 1,
    timestamp: '2026-11-01 07:35',
    action: 'Early Check-In',
    zone: 'Rixos Radamis',
    delta_green: 1,
    delta_red: 0,
    delta_black: 0,
    note: 'Early shift bonus (+1 Green Point awarded)',
  },
  {
    id: 2,
    timestamp: '2026-11-02 10:30',
    action: 'Late Check-In',
    zone: 'Rixos Radamis',
    delta_green: 0,
    delta_red: 1,
    delta_black: 0,
    note: 'Late arrival penalty (+1 Red Penalty assigned)',
  },
];

const mockCalendar = [
  { day: 1, date: '2026-11-01', status: 'early', label: 'Early (+1G)', time: '07:35' },
  { day: 2, date: '2026-11-02', status: 'late', label: 'Late (+1R)', time: '10:30' },
  { day: 3, date: '2026-11-03', status: 'leave', label: 'Approved Leave', time: '-' },
];

const summary = (o = {}) => ({
  green: 5,
  red: 1,
  black: 1,
  deductions_egp: 1250,
  progress: 5,
  currency: 'EGP',
  company_name: 'Universal Attendance System',
  history: mockHistory,
  calendar: mockCalendar,
  ...o,
});

describe('Ledger Module - EmployeeDashboard Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

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

  it('renders the Monthly Attendance Calendar with daily statuses and statistics', async () => {
    api.summary.mockResolvedValue(summary());
    render(<EmployeeDashboard />);

    expect(await screen.findByText(/Monthly Attendance Calendar/i)).toBeInTheDocument();
    expect(screen.getByText('Early (+1G)')).toBeInTheDocument();
    expect(screen.getByText('Late (+1R)')).toBeInTheDocument();
    expect(screen.getByText('Approved Leave')).toBeInTheDocument();

    expect(screen.getByText(/Early Bonus Days:/i).closest('div')).toHaveTextContent('1');
    expect(screen.getByText(/Late \/ Leave Days:/i).closest('div')).toHaveTextContent('1 Late / 1 Leaves');
  });

  it('renders the Points History Ledger audit trail table', async () => {
    api.summary.mockResolvedValue(summary());
    render(<EmployeeDashboard />);

    expect(await screen.findByText(/Points History Ledger/i)).toBeInTheDocument();
    expect(screen.getByText('Early Check-In')).toBeInTheDocument();
    expect(screen.getByText('Late Check-In')).toBeInTheDocument();
    expect(screen.getByText('+1 Green')).toBeInTheDocument();
    expect(screen.getByText('+1 Red')).toBeInTheDocument();
    expect(screen.getByText(/Early shift bonus/i)).toBeInTheDocument();
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
