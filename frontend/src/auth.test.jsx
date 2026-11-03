import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./api.js', () => ({
  api: {
    login: vi.fn(),
  },
  getToken: () => localStorage.getItem('token'),
  setToken: (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token')),
}));

import { api } from './api.js';
import { AuthProvider, useAuth } from './auth.jsx';

function TestConsumer() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user-info">{user ? `${user.name}:${user.role}` : 'anonymous'}</div>
      <button onClick={() => login('rico', 'pass123')}>Do Login</button>
      <button onClick={logout}>Do Logout</button>
    </div>
  );
}

describe('AuthProvider & useAuth', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('provides null user initially when no token is in storage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('user-info')).toHaveTextContent('anonymous');
  });

  it('updates state and localStorage upon successful login', async () => {
    api.login.mockResolvedValueOnce({
      access_token: 'fake.jwt.token',
      role: 'employee',
      name: 'rico',
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Do Login' }));
    expect(screen.getByTestId('user-info')).toHaveTextContent('rico:employee');
    expect(localStorage.getItem('token')).toBe('fake.jwt.token');
    expect(localStorage.getItem('role')).toBe('employee');
  });

  it('clears state and storage upon logout', async () => {
    localStorage.setItem('token', 'fake.jwt.token');
    localStorage.setItem('name', 'rico');
    localStorage.setItem('role', 'employee');

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-info')).toHaveTextContent('rico:employee');
    await userEvent.click(screen.getByRole('button', { name: 'Do Logout' }));
    expect(screen.getByTestId('user-info')).toHaveTextContent('anonymous');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
