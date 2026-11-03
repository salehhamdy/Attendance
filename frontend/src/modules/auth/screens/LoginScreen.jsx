import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, SUPERADMIN_EMAIL } from '../../../shared/api/index.js';
import { Card, Button } from '../../../shared/ui/index.js';

export function LoginScreen() {
  const { login, loginWithOtp } = useAuth();
  const [tab, setTab] = useState('staff'); // 'staff' | 'superadmin'

  // Standard Staff / Owner form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Superadmin OTP form state
  const [superEmail, setSuperEmail] = useState(SUPERADMIN_EMAIL || 'salehhamdy599@gmail.com');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [info, setInfo] = useState('');

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitStaff(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setInfo('');
    try {
      await login(username, password);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  }

  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setBusy(true);
    setErr('');
    setInfo('');
    try {
      const res = await api.requestSuperadminOtp(superEmail);
      setOtpSent(true);
      const codeNotice = res?.otp ? ` (Access code: ${res.otp})` : '';
      setInfo(
        res?.message
          ? `${res.message}${codeNotice}`
          : `OTP verification code sent to ${superEmail}.${codeNotice}`
      );
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitSuperadminOtp(e) {
    e.preventDefault();
    if (!otp.trim()) {
      setErr('Please enter the 6-digit OTP verification code');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await loginWithOtp(superEmail, otp);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <Card className="login">
        <h2>Sign In</h2>
        <p className="muted text-sm mb-sm">
          Sharm Photographers Attendance & Points Portal
        </p>

        {/* Mode Switch Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'staff'}
            className={`auth-tab ${tab === 'staff' ? 'active' : ''}`}
            onClick={() => {
              setTab('staff');
              setErr('');
              setInfo('');
            }}
          >
            Staff & Owner
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'superadmin'}
            className={`auth-tab ${tab === 'superadmin' ? 'active' : ''}`}
            onClick={() => {
              setTab('superadmin');
              setErr('');
              setInfo('');
            }}
          >
            🛡️ Superadmin (OTP)
          </button>
        </div>

        {tab === 'staff' ? (
          <form onSubmit={submitStaff} className="form">
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {err && <p className="error" role="alert">{err}</p>}
            {info && <p className="ok" role="status">{info}</p>}
            <Button disabled={busy}>
              {busy ? 'Signing in…' : 'Login'}
            </Button>
          </form>
        ) : (
          <form onSubmit={otpSent ? submitSuperadminOtp : handleSendOtp} className="form">
            <div className="otp-box">
              <strong className="block text-sm" style={{ color: 'var(--primary)' }}>
                Protected Superadmin Access
              </strong>
              <small className="muted block">
                Exclusively restricted to <b>salehhamdy599@gmail.com</b> with one-time verification password.
              </small>
            </div>

            <div>
              <label htmlFor="super-email" className="field-label text-sm">
                Authorized Superadmin Email
              </label>
              <input
                id="super-email"
                type="email"
                placeholder="salehhamdy599@gmail.com"
                value={superEmail}
                onChange={(e) => setSuperEmail(e.target.value)}
                required
                disabled={otpSent}
              />
            </div>

            {otpSent && (
              <div>
                <label htmlFor="super-otp" className="field-label text-sm">
                  6-Digit Email OTP Code
                </label>
                <input
                  id="super-otp"
                  type="text"
                  placeholder="Enter 6-digit OTP code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={10}
                  required
                  autoFocus
                />
              </div>
            )}

            {err && <p className="error" role="alert">{err}</p>}
            {info && <p className="ok" role="status">{info}</p>}

            {!otpSent ? (
              <Button disabled={busy}>
                {busy ? 'Sending OTP…' : 'Send OTP to Email'}
              </Button>
            ) : (
              <div className="btn-group">
                <Button disabled={busy}>
                  {busy ? 'Verifying OTP…' : 'Verify OTP & Access Console'}
                </Button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleSendOtp}
                  disabled={busy}
                >
                  Resend OTP Code
                </button>
              </div>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}

export default LoginScreen;
