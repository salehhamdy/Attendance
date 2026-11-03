import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockLogout = vi.fn();
let mockUser = { name: 'rico', role: 'employee' };

vi.mock('../../modules/auth/index.js', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

import { Layout } from './index.js';

describe('Layout Component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUser = { name: 'rico', role: 'employee' };
  });

  it('renders employee navigation links and user badge', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Main Content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.getByText(/Sharm Attendance/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Leave Requests' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Owner Panel' })).not.toBeInTheDocument();
    expect(screen.getByText('rico')).toBeInTheDocument();
    expect(screen.getByText('Photographer')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('renders owner panel link for owner role', () => {
    mockUser = { name: 'Boss', role: 'owner' };
    render(
      <MemoryRouter>
        <Layout>
          <div>Owner Content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Owner Panel' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('calls logout when clicking the logout button', async () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </MemoryRouter>
    );

    const logoutBtn = screen.getByRole('button', { name: /Logout/i });
    await userEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
