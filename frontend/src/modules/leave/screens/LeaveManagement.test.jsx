import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../shared/api/index.js', () => ({
  api: {
    listLeave: vi.fn(),
    requestLeave: vi.fn(),
  },
}));

import { api } from '../../../shared/api/index.js';
import { LeaveManagement } from '../index.js';

describe('Leave Module - LeaveManagement Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders leave history list and status badges', async () => {
    api.listLeave.mockResolvedValueOnce([
      {
        id: 1,
        start_date: '2026-11-10',
        end_date: '2026-11-12',
        reason: 'Medical checkup',
        status: 'approved',
      },
    ]);
    render(<LeaveManagement />);

    expect(await screen.findByText('Medical checkup')).toBeInTheDocument();
    expect(screen.getByText('2026-11-10')).toBeInTheDocument();
    expect(screen.getByText('2026-11-12')).toBeInTheDocument();
    expect(screen.getByText('approved')).toHaveClass('badge-approved');
  });

  it('displays empty state when no leave requests exist', async () => {
    api.listLeave.mockResolvedValueOnce([]);
    render(<LeaveManagement />);
    expect(await screen.findByText(/No leave requests on record/i)).toBeInTheDocument();
  });

  it('validates date ranges where end date is before start date', async () => {
    api.listLeave.mockResolvedValueOnce([]);
    render(<LeaveManagement />);
    await waitFor(() => expect(screen.queryByText(/Loading leave requests/i)).not.toBeInTheDocument());

    const startInput = screen.getByLabelText(/Start Date/i);
    const endInput = screen.getByLabelText(/End Date/i);
    const reasonInput = screen.getByLabelText(/Reason/i);

    await userEvent.type(startInput, '2026-11-20');
    await userEvent.type(endInput, '2026-11-15');
    await userEvent.type(reasonInput, 'Testing dates');

    await userEvent.click(screen.getByRole('button', { name: /Submit Leave Request/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/End date cannot be earlier than start date/i);
    expect(api.requestLeave).not.toHaveBeenCalled();
  });

  it('submits valid leave request and reloads history', async () => {
    api.listLeave.mockResolvedValueOnce([]);
    api.requestLeave.mockResolvedValueOnce({ id: 2, status: 'pending' });
    api.listLeave.mockResolvedValueOnce([
      {
        id: 2,
        start_date: '2026-11-20',
        end_date: '2026-11-22',
        reason: 'Photography convention',
        status: 'pending',
      },
    ]);

    render(<LeaveManagement />);
    await waitFor(() => expect(screen.queryByText(/Loading leave requests/i)).not.toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/Start Date/i), '2026-11-20');
    await userEvent.type(screen.getByLabelText(/End Date/i), '2026-11-22');
    await userEvent.type(screen.getByLabelText(/Reason/i), 'Photography convention');

    await userEvent.click(screen.getByRole('button', { name: /Submit Leave Request/i }));

    expect(api.requestLeave).toHaveBeenCalledWith({
      start_date: '2026-11-20',
      end_date: '2026-11-22',
      reason: 'Photography convention',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/Leave request submitted/i);
    expect(await screen.findByText('Photography convention')).toBeInTheDocument();
  });
});
