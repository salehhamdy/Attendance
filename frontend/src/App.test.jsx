import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './modules/auth/index.js';

vi.mock('leaflet', () => ({
  default: {
    map: () => ({
      setView: vi.fn().mockReturnThis(),
      invalidateSize: vi.fn(),
      fitBounds: vi.fn(),
      remove: vi.fn(),
    }),
    tileLayer: () => ({ addTo: vi.fn() }),
    circle: () => ({ addTo: vi.fn() }),
    marker: () => ({ addTo: vi.fn(), setLatLng: vi.fn() }),
    divIcon: vi.fn(() => ({})),
    latLngBounds: () => ({ pad: vi.fn() }),
  },
}));

vi.mock('./shared/api/index.js', async () => {
  const actual = await vi.importActual('./shared/api/index.js');
  return {
    ...actual,
    isMock: true,
    api: actual.mockApi,
  };
});

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Universal Attendance App - Full Integration & RBAC', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user from protected routes to /login', async () => {
    renderApp('/superadmin');
    expect(await screen.findByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('executes employee journey: login, dashboard, leave management, and RBAC route protection', async () => {
    renderApp('/login');
    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: /Login/i });

    await userEvent.type(usernameInput, 'rico');
    await userEvent.type(passwordInput, 'secret123');
    await userEvent.click(submitBtn);

    // Lands on Employee Dashboard
    expect(await screen.findByText(/Welcome,\s*rico/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Green Points/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Monthly Attendance Calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/Points History Ledger/i)).toBeInTheDocument();

    // Verify employee navigation in sidebar
    expect(screen.getByRole('link', { name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Leave Requests/i })).toBeInTheDocument();

    // Navigate to Leave Management
    const leaveLink = screen.getByRole('link', { name: /Leave Requests/i });
    await userEvent.click(leaveLink);
    expect(await screen.findByRole('heading', { name: /^Leave Management$/i })).toBeInTheDocument();

    // Attempt unauthorized access to Owner Panel
    window.history.pushState({}, '', '/owner');
    expect(screen.queryByText(/Platform Superadmin Console/i)).not.toBeInTheDocument();
  });

  it('executes owner journey: login, management dashboard, resort geofences, and payroll', async () => {
    renderApp('/login');
    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: /Login/i });

    await userEvent.type(usernameInput, 'layla');
    await userEvent.type(passwordInput, 'pass123');
    await userEvent.click(submitBtn);

    // Lands on Owner Dashboard
    expect(await screen.findByRole('heading', { name: /Owner Administration Panel/i })).toBeInTheDocument();
    expect(screen.getByText(/Universal Business Profile & Attendance Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Multiple Resort Geofencing & Workplace Branches/i)).toBeInTheDocument();
    expect(screen.getByText(/Attendance Shift Windows & Financial Penalties/i)).toBeInTheDocument();
    expect(screen.getByText(/User Management: Add Employee \/ Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Payroll & Compensation Export/i)).toBeInTheDocument();

    // Verify owner sidebar navigation
    expect(screen.getByRole('link', { name: /Owner Panel/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Superadmin Panel/i })).not.toBeInTheDocument();
  });

  it('executes superadmin journey: email OTP login, immutability, workspace provisioning, and dark mode toggle', async () => {
    renderApp('/login');

    // Switch to Superadmin OTP portal tab
    const superTab = screen.getByRole('tab', { name: /Superadmin/i });
    await userEvent.click(superTab);

    // Verify authorized email is NOT visible in UI before user types it
    expect(screen.queryByText('salehhamdy599@gmail.com')).not.toBeInTheDocument();

    // User types authorized administrator email
    const emailInput = screen.getByPlaceholderText(/Enter administrator email/i);
    await userEvent.type(emailInput, 'salehhamdy599@gmail.com');

    // Request OTP dispatch
    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP to Email/i });
    await userEvent.click(sendOtpBtn);

    expect(await screen.findByRole('status')).toHaveTextContent(/OTP verification code sent/i);

    // Enter received OTP (849201 in mock)
    const otpInput = screen.getByPlaceholderText(/Enter 6-digit OTP code/i);
    await userEvent.type(otpInput, '849201');

    const verifyBtn = screen.getByRole('button', { name: /Verify OTP & Access Console/i });
    await userEvent.click(verifyBtn);

    // Lands on Platform Superadmin Console
    expect(await screen.findByRole('heading', { name: /Platform Superadmin Console/i })).toBeInTheDocument();
    expect(screen.getByText('Total Owners')).toBeInTheDocument();
    expect(screen.getByText('Active Owners')).toBeInTheDocument();

    // Immutable Superadmin row loads with Saleh Hamdy and salehhamdy599@gmail.com
    expect(await screen.findByText(/You \(Saleh Hamdy\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('salehhamdy599@gmail.com').length).toBeGreaterThan(0);
    expect(screen.getByText('🛡️ Superadmin')).toBeInTheDocument();
    expect(screen.getByText('🔒 Protected (Immutable)')).toBeInTheDocument();

    // Superadmin has access to both Superadmin and Owner panels
    expect(screen.getByRole('link', { name: /Superadmin Panel/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Owner Panel/i })).toBeInTheDocument();

    // Dark Mode Toggle works across the app
    const darkModeBtn = screen.getByRole('button', { name: /Switch to dark mode/i });
    await userEvent.click(darkModeBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Sign out cleans state
    const signOutBtn = screen.getByRole('button', { name: /Logout/i });
    await userEvent.click(signOutBtn);
    expect(await screen.findByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('blocks login when an account belongs to a suspended organization owner', async () => {
    renderApp('/login');
    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: /Login/i });

    // 'nour' is configured as suspended in initial mock owners
    await userEvent.type(usernameInput, 'nour');
    await userEvent.type(passwordInput, 'pass123');
    await userEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Account suspended: Your organization owner has been suspended by the platform superadmin/i
    );
  });
});
