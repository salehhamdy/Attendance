import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Button } from '../../../shared/ui/index.js';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await login(username, password);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <Card className="login">
        <h2>Sign In</h2>
        <p className="muted text-sm mb">
          Sharm Photographers Attendance & Points Portal
        </p>
        <form onSubmit={submit} className="form">
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
          <Button disabled={busy}>
            {busy ? 'Signing in…' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default LoginScreen;
