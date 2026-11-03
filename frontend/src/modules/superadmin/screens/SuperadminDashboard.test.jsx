import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../shared/api/index.js', () => ({
  api: {
    superadminOwners: vi.fn(),
    createOwner: vi.fn(),
    suspendOwner: vi.fn(),
    reinstateOwner: vi.fn(),
    removeOwner: vi.fn(),
    getAuditLogs: vi.fn().mockResolvedValue([
      {
        id: 1,
        timestamp: '2026-11-03 14:15',
        actor: 'salehhamdy599@gmail.com',
        action: 'SUPERADMIN_OTP_VERIFIED',
        ip: 'Cairo, EG',
        detail: 'Root superadmin session authenticated',
      },
    ]),
    exportAuditLogsCsv: vi.fn().mockResolvedValue('ID,Timestamp,Actor\n1,2026-11-03,salehhamdy599@gmail.com'),
  },
}));

import { api } from '../../../shared/api/index.js';
import { SuperadminDashboard } from '../index.js';

const mockSuperadminData = {
  superadmin: {
    id: 0,
    name: 'Saleh Hamdy',
    username: 'salehhamdy599@gmail.com',
    email: 'salehhamdy599@gmail.com',
    workspace: 'Global Platform',
    role: 'superadmin',
    status: 'active',
    is_immutable: true,
  },
  owners: [
    {
      id: 10,
      name: 'Layla Mansour',
      username: 'layla',
      email: 'layla@acme.com',
      workspace: 'Acme Resorts Sharm',
      role: 'owner',
      status: 'active',
      team_size: 12,
    },
    {
      id: 12,
      name: 'Nour Bakr',
      username: 'nour',
      email: 'nour@nile.co',
      workspace: 'Nile Media Group',
      role: 'owner',
      status: 'suspended',
      team_size: 7,
    },
  ],
  stats: {
    total_owners: 2,
    active_owners: 1,
    suspended_owners: 1,
    total_team_members: 19,
  },
};

describe('Superadmin Module - SuperadminDashboard Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders stats and immutable superadmin row with protected badge', async () => {
    api.superadminOwners.mockResolvedValueOnce(mockSuperadminData);
    render(<SuperadminDashboard />);

    expect(await screen.findByText('Platform Superadmin Console')).toBeInTheDocument();
    expect(screen.getByText('Total Owners')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();

    // Immutable Superadmin row
    expect(screen.getByText(/You \(Saleh Hamdy\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('salehhamdy599@gmail.com').length).toBeGreaterThan(0);
    expect(screen.getByText('🛡️ Superadmin')).toBeInTheDocument();
    expect(screen.getByText('🔒 Protected (Immutable)')).toBeInTheDocument();

    // Owner rows
    expect(screen.getByText('Layla Mansour')).toBeInTheDocument();
    expect(screen.getByText('12 members')).toBeInTheDocument();
    expect(screen.getByText('Nour Bakr')).toBeInTheDocument();
    expect(screen.getByText('7 members')).toBeInTheDocument();
  });

  it('filters owners by search term and shows empty state when no match', async () => {
    api.superadminOwners.mockResolvedValueOnce(mockSuperadminData);
    render(<SuperadminDashboard />);

    await screen.findByText('Layla Mansour');
    const searchInput = screen.getByLabelText(/Search owners/i);
    await userEvent.type(searchInput, 'Nile Media');

    expect(screen.getByText('Nour Bakr')).toBeInTheDocument();
    expect(screen.queryByText('Layla Mansour')).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'NonExistentWorkspace');
    expect(screen.getByText('No matching owners found.')).toBeInTheDocument();
  });

  it('allows superadmin to create and assign a new owner to a workspace', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    api.createOwner.mockResolvedValueOnce({
      id: 15,
      name: 'Karim Jaber',
      username: 'kjaber',
      email: 'kjaber@beta.io',
      workspace: 'Beta Studios Sharm',
      role: 'owner',
      status: 'active',
      team_size: 0,
    });

    render(<SuperadminDashboard />);
    await screen.findByText('Layla Mansour');

    const openModalBtn = screen.getByRole('button', { name: /\+ Assign New Owner/i });
    await userEvent.click(openModalBtn);

    expect(screen.getByText(/Assign New Business Owner/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Owner Full Name/i), 'Karim Jaber');
    await userEvent.type(screen.getByLabelText(/^Username$/i), 'kjaber');
    await userEvent.type(screen.getByLabelText(/Email Address/i), 'kjaber@beta.io');
    await userEvent.type(screen.getByLabelText(/Assigned Workspace \/ Business/i), 'Beta Studios Sharm');

    const submitBtn = screen.getByRole('button', { name: /Create & Assign Owner/i });
    await userEvent.click(submitBtn);

    expect(api.createOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Karim Jaber',
        username: 'kjaber',
        email: 'kjaber@beta.io',
        workspace: 'Beta Studios Sharm',
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/Owner "Karim Jaber" created and assigned/i);
  });

  it('allows superadmin to suspend an owner and shows cascading suspension feedback', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    api.suspendOwner.mockResolvedValueOnce({
      success: true,
      message: 'Owner "Layla Mansour" and team (12 members) suspended simultaneously.',
    });

    render(<SuperadminDashboard />);
    await screen.findByText('Layla Mansour');

    const suspendBtn = screen.getByRole('button', { name: /Suspend owner Layla Mansour/i });
    await userEvent.click(suspendBtn);

    expect(api.suspendOwner).toHaveBeenCalledWith(10);
    expect(await screen.findByRole('status')).toHaveTextContent(/suspended simultaneously/i);
  });

  it('allows superadmin to reinstate a suspended owner', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    api.reinstateOwner.mockResolvedValueOnce({
      success: true,
      message: 'Owner "Nour Bakr" reinstated. Entire team access restored.',
    });

    render(<SuperadminDashboard />);
    await screen.findByText('Nour Bakr');

    const reinstateBtn = screen.getByRole('button', { name: /Reinstate owner Nour Bakr/i });
    await userEvent.click(reinstateBtn);

    expect(api.reinstateOwner).toHaveBeenCalledWith(12);
    expect(await screen.findByRole('status')).toHaveTextContent(/access restored/i);
  });

  it('allows superadmin to remove an owner and shows cascading removal feedback', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    api.removeOwner.mockResolvedValueOnce({
      success: true,
      message: 'Owner "Layla Mansour" and all 12 team members permanently removed.',
    });

    render(<SuperadminDashboard />);
    await screen.findByText('Layla Mansour');

    const removeBtn = screen.getByRole('button', { name: /Remove owner Layla Mansour/i });
    await userEvent.click(removeBtn);

    expect(api.removeOwner).toHaveBeenCalledWith(10);
    expect(await screen.findByRole('status')).toHaveTextContent(/permanently removed/i);
  });

  it('renders an error alert when dashboard load fails', async () => {
    api.superadminOwners.mockRejectedValueOnce(new Error('Superadmin network timeout'));
    render(<SuperadminDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Superadmin network timeout');
  });

  it('validates required fields when assigning a new owner', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    render(<SuperadminDashboard />);
    await screen.findByText('Layla Mansour');

    const openModalBtn = screen.getByRole('button', { name: /\+ Assign New Owner/i });
    await userEvent.click(openModalBtn);

    const submitBtn = screen.getByRole('button', { name: /Create & Assign Owner/i });
    await userEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Owner name, username, and assigned workspace are required/i
    );
  });

  it('handles API errors when creating an owner', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    api.createOwner.mockRejectedValueOnce(new Error('Username already taken in platform'));

    render(<SuperadminDashboard />);
    await screen.findByText('Layla Mansour');

    const openModalBtn = screen.getByRole('button', { name: /\+ Assign New Owner/i });
    await userEvent.click(openModalBtn);

    await userEvent.type(screen.getByLabelText(/Owner Full Name/i), 'New Owner');
    await userEvent.type(screen.getByLabelText(/^Username$/i), 'duplicate_user');
    await userEvent.type(screen.getByLabelText(/Assigned Workspace \/ Business/i), 'Workspace');

    const submitBtn = screen.getByRole('button', { name: /Create & Assign Owner/i });
    await userEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Username already taken in platform');
  });

  it('handles API errors when suspending, reinstating, or removing an owner', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    api.suspendOwner.mockRejectedValueOnce(new Error('Cannot suspend owner: database lock'));
    api.reinstateOwner.mockRejectedValueOnce(new Error('Cannot reinstate: network failure'));
    api.removeOwner.mockRejectedValueOnce(new Error('Cannot remove: foreign key violation'));

    render(<SuperadminDashboard />);
    await screen.findByText('Layla Mansour');

    // Suspend error
    const suspendBtn = screen.getByRole('button', { name: /Suspend owner Layla Mansour/i });
    await userEvent.click(suspendBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot suspend owner: database lock');

    // Reinstate error
    const reinstateBtn = screen.getByRole('button', { name: /Reinstate owner Nour Bakr/i });
    await userEvent.click(reinstateBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reinstate: network failure');

    // Remove error
    const removeBtn = screen.getByRole('button', { name: /Remove owner Layla Mansour/i });
    await userEvent.click(removeBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot remove: foreign key violation');
  });

  it('renders Cross-Workspace Operational Analytics and Security Audit Trail', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    render(<SuperadminDashboard />);

    expect(await screen.findByText('Cross-Workspace Operational Analytics')).toBeInTheDocument();
    expect(screen.getByText('98.2% Platform Reliability')).toBeInTheDocument();
    expect(screen.getByText(/Platform Security & Governance Audit Trail/i)).toBeInTheDocument();
    expect(screen.getByText('SUPERADMIN_OTP_VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('Root superadmin session authenticated')).toBeInTheDocument();
  });

  it('allows exporting audit trail to CSV', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    render(<SuperadminDashboard />);

    const exportBtn = await screen.findByRole('button', { name: /Export Audit Trail \(CSV\)/i });
    await userEvent.click(exportBtn);

    expect(api.exportAuditLogsCsv).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(/Audit trail exported to CSV/i);
  });

  it('opens and closes Superadmin Workspace Support Mode inspection modal', async () => {
    api.superadminOwners.mockResolvedValue(mockSuperadminData);
    render(<SuperadminDashboard />);

    await screen.findByText('Layla Mansour');
    const viewBtn = screen.getByRole('button', { name: /View workspace Acme Resorts Sharm/i });
    await userEvent.click(viewBtn);

    expect(screen.getByText(/SUPERADMIN WORKSPACE SUPPORT MODE/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspecting organization for owner/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close Support Inspection/i });
    await userEvent.click(closeBtn);

    expect(screen.queryByText(/SUPERADMIN WORKSPACE SUPPORT MODE/i)).not.toBeInTheDocument();
  });
});
