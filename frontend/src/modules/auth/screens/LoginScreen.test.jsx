import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username and password inputs, plus login button', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('submits valid credentials to auth context login()', async () => {
    login.mockResolvedValueOnce();
    render(<LoginScreen />);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'rico');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'pass');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(login).toHaveBeenCalledWith('rico', 'pass');
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

  it('switches to Superadmin tab, requires manual email entry, requests OTP, and logs in with code', async () => {
    api.requestSuperadminOtp.mockResolvedValueOnce({
      success: true,
      message: 'OTP verification code sent to your authorized email address.',
      otp: '849201',
      email_sent: true,
    });
    loginWithOtp.mockResolvedValueOnce();

    render(<LoginScreen />);
    const superTab = screen.getByRole('tab', { name: /Superadmin/i });
    await userEvent.click(superTab);

    expect(screen.getByText(/Protected Superadmin Console/i)).toBeInTheDocument();
    // Superadmin email should NOT be pre-filled or rendered as plain copy in the UI
    expect(screen.queryByText('salehhamdy599@gmail.com')).not.toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText(/Enter administrator email/i);
    expect(emailInput).toHaveValue('');

    // User types in their authorized email
    await userEvent.type(emailInput, 'salehhamdy599@gmail.com');
    expect(emailInput).toHaveValue('salehhamdy599@gmail.com');

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

  it('validates that email is entered before requesting OTP', async () => {
    render(<LoginScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /Superadmin/i }));

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP to Email/i });
    await userEvent.click(sendOtpBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Please enter your administrator email/i);
    expect(api.requestSuperadminOtp).not.toHaveBeenCalled();
  });

  it('handles error when OTP request fails', async () => {
    api.requestSuperadminOtp.mockRejectedValueOnce(
      new Error('Email delivery error. Please try again later.')
    );

    render(<LoginScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /Superadmin/i }));

    const emailInput = screen.getByPlaceholderText(/Enter administrator email/i);
    await userEvent.type(emailInput, 'salehhamdy599@gmail.com');

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP to Email/i });
    await userEvent.click(sendOtpBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Email delivery error/i
    );
  });
});
