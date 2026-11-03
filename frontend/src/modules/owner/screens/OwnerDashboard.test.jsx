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
    getCompanySettings: vi.fn(),
    updateCompanySettings: vi.fn(),
    addBranch: vi.fn(),
    removeBranch: vi.fn(),
    resetUserPassword: vi.fn(),
    exportPayrollCsv: vi.fn(),
  },
}));

import { api } from '../../../shared/api/index.js';
import { OwnerDashboard } from '../index.js';

const mockCompanyData = {
  company_name: 'Universal Attendance System',
  currency: 'EGP',
  reward_threshold: 30,
  reward_amount: '40 USD / 2,200 EGP',
  allow_remote: false,
  branches: [
    { id: 1, name: 'Rixos Radamis (Sharm El-Sheikh)', lat: 27.9158, lng: 34.33, radius: 300 },
    { id: 2, name: 'Cairo Headquarters', lat: 30.0444, lng: 31.2357, radius: 300 },
  ],
};

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
  company: mockCompanyData,
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
    api.getCompanySettings.mockResolvedValueOnce(mockCompanyData);
    render(<OwnerDashboard />);

    const ricoElements = await screen.findAllByText('rico');
    expect(ricoElements.length).toBeGreaterThan(0);
    expect(screen.getAllByText('sara').length).toBeGreaterThan(0);
    // sara has 1 black point => 1000 EGP deduction
    expect(screen.getAllByText('1000 EGP').length).toBeGreaterThan(0);
    // rico has 1 red point => 250 EGP deduction
    expect(screen.getAllByText('250 EGP').length).toBeGreaterThan(0);
  });

  it('allows owner to configure universal company profile, currency, and remote check-in policy', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
    api.updateCompanySettings.mockResolvedValueOnce({
      ...mockCompanyData,
      company_name: 'Global Tech Corp',
      currency: 'USD',
      allow_remote: true,
    });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const nameInput = screen.getByLabelText(/Company \/ Organization Name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Global Tech Corp');

    const currencyInput = screen.getByLabelText(/Operating Currency Code/i);
    await userEvent.clear(currencyInput);
    await userEvent.type(currencyInput, 'USD');

    const remoteCheckbox = screen.getByLabelText(/Allow Remote \/ Anywhere Check-in/i);
    await userEvent.click(remoteCheckbox);

    const saveBtn = screen.getByRole('button', { name: /Save Business Profile & Policy/i });
    await userEvent.click(saveBtn);

    expect(api.updateCompanySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: 'Global Tech Corp',
        currency: 'USD',
        allow_remote: true,
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/updated successfully/i);
  });

  it('allows owner to apply a resort geofence preset and add branch', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
    api.addBranch.mockResolvedValueOnce({
      id: 5,
      name: 'Rixos Premium Seagate (Nabq Sharm)',
      lat: 28.0267,
      lng: 34.4326,
      radius: 350,
    });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const presetBtn = screen.getByRole('button', { name: /\+ Rixos Premium Seagate/i });
    await userEvent.click(presetBtn);

    expect(screen.getByLabelText(/^Branch Name$/i)).toHaveValue('Rixos Premium Seagate (Nabq Sharm)');
    expect(screen.getByLabelText(/Allowed Geofence Radius/i)).toHaveValue(350);

    const addBranchBtn = screen.getByRole('button', { name: /Add Branch Location/i });
    await userEvent.click(addBranchBtn);

    expect(api.addBranch).toHaveBeenCalledWith({
      name: 'Rixos Premium Seagate (Nabq Sharm)',
      lat: 28.0267,
      lng: 34.4326,
      radius: 350,
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/added successfully/i);
  });

  it('allows owner to add a new physical branch location with GPS geofence', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
    api.addBranch.mockResolvedValueOnce({
      id: 3,
      name: 'Dubai Hub',
      lat: 25.2048,
      lng: 55.2708,
      radius: 400,
    });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    await userEvent.type(screen.getByLabelText(/^Branch Name$/i), 'Dubai Hub');
    await userEvent.clear(screen.getByLabelText(/Allowed Geofence Radius/i));
    await userEvent.type(screen.getByLabelText(/Allowed Geofence Radius/i), '400');
    await userEvent.type(screen.getByLabelText(/GPS Latitude/i), '25.2048');
    await userEvent.type(screen.getByLabelText(/GPS Longitude/i), '55.2708');

    const addBranchBtn = screen.getByRole('button', { name: /Add Branch Location/i });
    await userEvent.click(addBranchBtn);

    expect(api.addBranch).toHaveBeenCalledWith({
      name: 'Dubai Hub',
      lat: 25.2048,
      lng: 55.2708,
      radius: 400,
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/New branch "Dubai Hub" added successfully/i);
  });

  it('allows owner to remove a branch location', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
    api.removeBranch.mockResolvedValueOnce({ success: true });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const removeBtn = screen.getByRole('button', { name: /Remove branch Cairo Headquarters/i });
    await userEvent.click(removeBtn);

    expect(api.removeBranch).toHaveBeenCalledWith(2);
    expect(await screen.findByRole('status')).toHaveTextContent(/removed from company locations/i);
  });

  it('allows owner to directly reset an employee password', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
    api.resetUserPassword.mockResolvedValueOnce({ success: true });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const resetBtn = screen.getByRole('button', { name: /Reset password for rico/i });
    await userEvent.click(resetBtn);

    expect(screen.getByText(/Reset Password for rico/i)).toBeInTheDocument();
    const newPassInput = screen.getByLabelText(/New Password/i);
    await userEvent.clear(newPassInput);
    await userEvent.type(newPassInput, 'SharmPhoto2026!');

    const confirmBtn = screen.getByRole('button', { name: /Confirm Password Reset/i });
    await userEvent.click(confirmBtn);

    expect(api.resetUserPassword).toHaveBeenCalledWith(1, 'SharmPhoto2026!');
    expect(await screen.findByRole('status')).toHaveTextContent(/Password for "rico" reset successfully/i);
  });

  it('allows owner to export payroll data to CSV/Excel', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
    api.exportPayrollCsv.mockResolvedValueOnce({
      filename: 'payroll-report.csv',
      csv: 'Employee ID,Name,Net Adjustment\n#1,rico,0',
    });

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const exportBtn = screen.getByRole('button', { name: /Export Payroll to CSV/i });
    await userEvent.click(exportBtn);

    expect(api.exportPayrollCsv).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(/Payroll CSV export complete/i);
  });

  it('allows owner to configure penalty values and arrival time windows', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
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
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
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
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
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
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
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
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
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
    api.getCompanySettings.mockResolvedValue(mockCompanyData);
    api.approveReward.mockResolvedValueOnce({ success: true });

    render(<OwnerDashboard />);
    await screen.findByText('01012345678');

    const payoutBtn = screen.getByRole('button', { name: /Approve Payout/i });
    await userEvent.click(payoutBtn);
    expect(api.approveReward).toHaveBeenCalledWith(20);
    expect(await screen.findByRole('status')).toHaveTextContent(/approved for payment/i);
  });

  it('validates required fields when adding a branch', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const addBranchBtn = screen.getByRole('button', { name: /Add Branch Location/i });
    await userEvent.click(addBranchBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Branch name and valid latitude\/longitude coordinates are required/i
    );
  });

  it('validates required fields when adding a user', async () => {
    api.ownerUsers.mockResolvedValue(mockOwnerData);
    api.getSettings.mockResolvedValue(mockOwnerData.settings);
    api.getCompanySettings.mockResolvedValue(mockCompanyData);

    render(<OwnerDashboard />);
    await screen.findAllByText('rico');

    const addBtn = screen.getByRole('button', { name: /Add User Account/i });
    await userEvent.click(addBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Photographer name and username are required/i
    );
  });

  it('renders an error alert when dashboard load fails', async () => {
    api.ownerUsers.mockRejectedValueOnce(new Error('Owner API failure'));
    render(<OwnerDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Owner API failure');
  });
});
