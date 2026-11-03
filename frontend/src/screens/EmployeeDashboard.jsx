import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, Button, ToggleSwitch, StatCard } from '../components/ui.jsx';
import CheckInModal from '../components/CheckInModal.jsx';
import RewardModal from '../components/RewardModal.jsx';

const GOAL = 30;

export default function EmployeeDashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(() => api.summary().then(setS).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function act(fn) {
    setErr(''); setMsg('');
    try { await fn(); await load(); } catch (e) { setErr(e.message); }
  }

  if (!s) return <p className="muted">{err || 'Loading…'}</p>;
  const progress = Number.isFinite(s.progress) ? s.progress : s.green;
  const pct = Math.min(100, (progress / GOAL) * 100);
  const d = s.deductions_egp ?? 0;

  return (
    <div>
      <div className="row-head">
        <h2>Dashboard</h2>
        <Button onClick={() => setModal('checkin')}>Check In</Button>
      </div>
      {err && <p className="error">{err}</p>}
      {msg && <p className="ok">{msg}</p>}
      <div className="grid3">
        <StatCard variant="green" title="Green Points" value={s.green} />
        <StatCard variant="red" title="Red Penalties" value={s.red} sub={`Red: ${s.red} x 250 EGP = ${s.red * 250} EGP`} />
        <StatCard variant="black" title="Black Penalties" value={s.black} sub={`Black: ${s.black} x 1000 EGP = ${s.black * 1000} EGP`} />
      </div>
      <div className="grid2">
        <Card>
          <h3>Green Reward Progress</h3>
          <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
          <p className="muted">{progress}/{GOAL}</p>
          <Button disabled={progress < GOAL} onClick={() => setModal('reward')}>Send Reward Request</Button>
        </Card>
        <Card>
          <h3>Monthly Attendance Deductions</h3>
          <div className="big red-text">{d} EGP</div>
          <div className="toggles">
            <label>Use 1 green to remove 1 red
              <ToggleSwitch label="cancel red" checked={false} disabled={s.green < 1 || s.red < 1} onChange={() => act(api.cancelRed)} />
            </label>
            <label>Use 5 green to remove 1 black
              <ToggleSwitch label="cancel black" checked={false} disabled={s.green < 5 || s.black < 1} onChange={() => act(api.cancelBlack)} />
            </label>
          </div>
        </Card>
      </div>
      {modal === 'checkin' && (
        <CheckInModal onClose={() => setModal(null)} onDone={() => { setModal(null); setMsg('Checked in successfully'); load(); }} />
      )}
      {modal === 'reward' && (
        <RewardModal onClose={() => setModal(null)} onDone={() => { setModal(null); setMsg('Reward request sent for approval'); load(); }} />
      )}
    </div>
  );
}
