import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../shared/api/index.js', () => ({
  api: {
    ownerUsers: vi.fn(),
    ownerAdjust: vi.fn(),
    approveLeave: vi.fn(),
    rejectLeave: vi.fn(),
    approveReward: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    addUser: vi.fn(),
    removeUser: vi.fn(),
  },
}));

import { api } from '../../../shared/api/index.js';
import { OwnerDashboard } from '../index.js';

const mockOwnerData = {
  users: [
    { id: 1, name: 'rico', username: 'rico', role: 'employee', green: 27, red: 1, black: 0 },
    { id: 2, name: 'sara', username: 'sara', role: 'employee', green: 10, red: 0, black: 1 },
  ],
  settings: {
    red_penalty_egp: 250,
    black_penalty_egp: 1000,
    early_window_start: '07:00',
    early_window_end: '08:00',
    normal_window_end: '10:00',
    late_window_end: '12:00',
  },
  leave_requests: [
    {
      id: 10,
      user_id: 1,
      user_name: 'rico',
      start_date: '2026-11-10',
      end_date: '2026-11-12',
      reason: 'Urgent family matter',
      status: 'pending',
    },
  ],
  reward_requests: [
    {
      id: 20,
      user_id: 1,
      user_name: 'rico',
      payout_method: 'vodafone_cash',
      number: '01012345678',
      status: 'pending',
    },
  ],
};

describe('Owner Module - OwnerDashboard Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders photographer stats, points and deduction calculations', async () => {
    api.ownerUsers.mockResolvedValueOnce(mockOwnerData);
    api.getSettings.mockResolvedValueOnce(mockOwnerData.settings);
    render(<OwnerDashboard />);

    const ricoElements = await screen.findAllByText('rico');
    expect(ricoElements.length).toBeGreaterThan(0);
    expect(screen.getByText('sara')).toBeInTheDocument();
    // sara has 1 black point => 1000 EGP deduction
    expect(screen.getByText('1000 EGP')).toBeInTheDocument();
    // rico has 1 red point => 250 EGP deduction
    expect(screen.getByText('250 EGP')).toBeInTheDocument();
  });

  it('allows owner to configure penalty values and arrival time windows', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.updateSettings.mockResolvedValueOnce({
      ...mockOwnerData.settings,
      red_penalty_egp: 350,
      early_window_start: '06:45',
    });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const redPenaltyInput = screen.getByLabelText(/Red Penalty Value/i);
    await userEvent.clear(redPenaltyInput);
    await userEvent.type(redPenaltyInput, '350');

    const earlyStartInput = screen.getByLabelText(/Early Arrival Bonus Start/i);
    await userEvent.clear(earlyStartInput);
    await userEvent.type(earlyStartInput, '06:45');

    const saveBtn = screen.getByRole('button', { name: /Save Attendance Rules & Penalties/i });
    await userEvent.click(saveBtn);

    expect(api.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        red_penalty_egp: '350',
        early_window_start: '06:45',
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/new arrival times & penalty values are now in effect/i);
  });

  it('allows owner to add a new photographer account', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.addUser.mockResolvedValueOnce({
      id: 3,
      name: 'Tarek Hamdy',
      username: 'tarek',
      role: 'employee',
    });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    await userEvent.type(screen.getByPlaceholderText(/Full Name/i), 'Tarek Hamdy');
    await userEvent.type(screen.getByPlaceholderText(/Username/i), 'tarek');

    const addBtn = screen.getByRole('button', { name: /Add User Account/i });
    await userEvent.click(addBtn);

    expect(api.addUser).toHaveBeenCalledWith({
      name: 'Tarek Hamdy',
      username: 'tarek',
      role: 'employee',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/Photographer "Tarek Hamdy" added successfully/i);
  });

  it('allows owner to remove a user account', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.removeUser.mockResolvedValueOnce({ success: true });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const removeBtn = screen.getByRole('button', { name: /Remove user sara/i });
    await userEvent.click(removeBtn);

    expect(api.removeUser).toHaveBeenCalledWith(2);
    expect(await screen.findByRole('status')).toHaveTextContent(/removed from the system/i);
  });

  it('allows owner to adjust points with an audit reason', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.ownerAdjust.mockResolvedValueOnce({ success: true });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    await userEvent.selectOptions(screen.getByLabelText(/Select employee/i), '1');
    await userEvent.selectOptions(screen.getByLabelText(/Select point color/i), 'green');
    await userEvent.clear(screen.getByLabelText(/Adjustment delta/i));
    await userEvent.type(screen.getByLabelText(/Adjustment delta/i), '3');
    await userEvent.type(screen.getByLabelText(/Reason for adjustment/i), 'Early resort arrival');

    await userEvent.click(screen.getByRole('button', { name: /Apply Point Adjustment/i }));

    expect(api.ownerAdjust).toHaveBeenCalledWith({
      user_id: 1,
      color: 'green',
      delta: 3,
      reason: 'Early resort arrival',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/Successfully updated/i);
  });

  it('processes leave approval and rejection', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.approveLeave.mockResolvedValueOnce({ success: true });
    api.rejectLeave.mockResolvedValueOnce({ success: true });

    render(<OwnerDashboard />);
    await screen.findByText('Urgent family matter');

    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    await userEvent.click(approveBtn);
    expect(api.approveLeave).toHaveBeenCalledWith(10);
    expect(await screen.findByRole('status')).toHaveTextContent(/absence penalty waived/i);

    const rejectBtn = screen.getByRole('button', { name: 'Reject' });
    await userEvent.click(rejectBtn);
    expect(api.rejectLeave).toHaveBeenCalledWith(10);
  });

  it('processes reward payout approval', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.approveReward.mockResolvedValueOnce({ success: true });

    render(<OwnerDashboard />);
    await screen.findByText('01012345678');

    const payoutBtn = screen.getByRole('button', { name: /Approve Payout/i });
    await userEvent.click(payoutBtn);
    expect(api.approveReward).toHaveBeenCalledWith(20);
    expect(await screen.findByRole('status')).toHaveTextContent(/approved for payment/i);
  });
});
