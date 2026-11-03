import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const login = vi.fn();
vi.mock('../auth.jsx', () => ({ useAuth: () => ({ login }) }));

import Login from './Login.jsx';

describe('Login', () => {
  beforeEach(() => { cleanup(); login.mockReset(); });

  it('submits the entered credentials', async () => {
    login.mockResolvedValue();
    render(<Login />);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'rico');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(login).toHaveBeenCalledWith('rico', 'secret');
  });

  it('shows the error on failure and re-enables the button', async () => {
    login.mockRejectedValue(new Error('Invalid credentials'));
    render(<Login />);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'x');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'y');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
  });
});

