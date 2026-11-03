import React, { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { Card, Button } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await login(u, p); } catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <div className="login-wrap">
      <Card className="login">
        <h2>Sign in</h2>
        <form onSubmit={submit} className="form">
          <input placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} required autoFocus />
          <input type="password" placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} required />
          {err && <p className="error">{err}</p>}
          <Button disabled={busy}>{busy ? 'Signing in…' : 'Login'}</Button>
        </form>
      </Card>
    </div>
  );
}
