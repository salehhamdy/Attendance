import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const login = vi.fn();
const loginWithOtp = vi.fn();

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ login, loginWithOtp }),
}));

vi.mock('../../../shared/api/index.js', () => ({
  SUPERADMIN_EMAIL: 'salehhamdy599@gmail.com',
  api: {
    requestSuperadminOtp: vi.fn(),
    verifySuperadminOtp: vi.fn(),
  },
}));

import { api } from '../../../shared/api/index.js';
import { LoginScreen } from './LoginScreen.jsx';

describe('Auth Module - LoginScreen', () => {
  beforeEach(() => {
    cleanup();
    login.mockReset();
    loginWithOtp.mockReset();
    vi.clearAllMocks();
  });

  it('submits the entered credentials for staff and owners', async () => {
    login.mockResolvedValue();
    render(<LoginScreen />);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'rico');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(login).toHaveBeenCalledWith('rico', 'secret');
  });

  it('shows the error on failure and re-enables the button', async () => {
    login.mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginScreen />);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'x');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'y');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
  });

  it('switches to Superadmin tab, requests OTP for salehhamdy599@gmail.com, and logs in with code', async () => {
    api.requestSuperadminOtp.mockResolvedValueOnce({
      success: true,
      message: 'OTP verification code sent to salehhamdy599@gmail.com.',
      otp: '849201',
      email_sent: true,
    });
    loginWithOtp.mockResolvedValueOnce();

    render(<LoginScreen />);
    const superTab = screen.getByRole('tab', { name: /Superadmin/i });
    await userEvent.click(superTab);

    expect(screen.getByText(/Protected Superadmin Console/i)).toBeInTheDocument();
    expect(screen.getByText(/salehhamdy599@gmail.com/i)).toBeInTheDocument();

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP to Email/i });
    await userEvent.click(sendOtpBtn);

    expect(api.requestSuperadminOtp).toHaveBeenCalledWith('salehhamdy599@gmail.com');
    expect(await screen.findByRole('status')).toHaveTextContent(/OTP verification code sent/i);

    const otpInput = screen.getByPlaceholderText(/Enter 6-digit OTP code/i);
    await userEvent.type(otpInput, '849201');

    const verifyBtn = screen.getByRole('button', { name: /Verify OTP & Access Console/i });
    await userEvent.click(verifyBtn);

    expect(loginWithOtp).toHaveBeenCalledWith('salehhamdy599@gmail.com', '849201');
  });

  it('handles error when OTP request fails', async () => {
    api.requestSuperadminOtp.mockRejectedValueOnce(
      new Error('Email delivery error. Please try again later.')
    );

    render(<LoginScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /Superadmin/i }));

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP to Email/i });
    await userEvent.click(sendOtpBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Email delivery error/i
    );
  });
});
