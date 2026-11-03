import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, Button, ToggleSwitch, StatCard } from '../components/ui.jsx';
import CheckInModal from '../components/CheckInModal.jsx';
import RewardModal from '../components/RewardModal.jsx';

const GOAL = 30;

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(() => {
    return api
      .summary()
      .then(setS)
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn, successNotice) {
    setErr('');
    setMsg('');
    try {
      await fn();
      await load();
      if (successNotice) setMsg(successNotice);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (!s) return <p className="muted">{err || 'Loading…'}</p>;

  const progress = Number.isFinite(s.progress) ? s.progress : s.green;
  const pct = Math.min(100, (progress / GOAL) * 100);
  const d = s.deductions_egp ?? s.red * 250 + s.black * 1000;

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div>
      <div className="row-head">
        <div>
          <h2>Welcome, {user?.name || 'Photographer'}</h2>
          <p className="muted subtitle">{todayFormatted}</p>
        </div>
        <Button onClick={() => setModal('checkin')}>Check In</Button>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p className="ok" role="status">{msg}</p>}

      <div className="grid3">
        <StatCard
          variant="green"
          title="Green Points"
          value={s.green}
          sub="Early check-in rewards (07:00 - 08:00 AM)"
        />
        <StatCard
          variant="red"
          title="Red Penalties"
          value={s.red}
          sub={`Red: ${s.red} x 250 EGP = ${s.red * 250} EGP`}
        />
        <StatCard
          variant="black"
          title="Black Penalties"
          value={s.black}
          sub={`Black: ${s.black} x 1000 EGP = ${s.black * 1000} EGP`}
        />
      </div>

      <div className="grid2">
        <Card className="progress-card">
          <h3>Green Reward Progress</h3>
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax={GOAL}
            />
          </div>
          <div className="row-head mt-sm">
            <span className="muted font-semibold">{progress}/{GOAL} Points</span>
            <span className="muted">Threshold: 40 USD / 2200 EGP</span>
          </div>
          <Button
            className="mt"
            disabled={progress < GOAL}
            onClick={() => setModal('reward')}
          >
            Send Reward Request
          </Button>
        </Card>

        <Card className="deductions-card">
          <h3>Monthly Attendance Deductions</h3>
          <div className="big red-text">{d} EGP</div>
          <p className="muted mb-sm">
            {d === 0
              ? 'Zero deductions! Attendance in good standing.'
              : `Active deductions: ${s.red} Red (${s.red * 250} EGP) + ${s.black} Black (${s.black * 1000} EGP)`}
          </p>

          <div className="toggles">
            <label className="toggle-item">
              <span>
                Use 1 Green Point to remove 1 Red Penalty
                <small className="block muted">Saves 250 EGP deduction</small>
              </span>
              <ToggleSwitch
                label="cancel red penalty"
                checked={false}
                disabled={s.green < 1 || s.red < 1}
                onChange={() => act(api.cancelRed, '1 Red Penalty cancelled (-250 EGP deduction)')}
              />
            </label>

            <label className="toggle-item">
              <span>
                Use 5 Green Points to remove 1 Black Penalty
                <small className="block muted">Saves 1000 EGP deduction</small>
              </span>
              <ToggleSwitch
                label="cancel black penalty"
                checked={false}
                disabled={s.green < 5 || s.black < 1}
                onChange={() => act(api.cancelBlack, '1 Black Penalty cancelled (-1000 EGP deduction)')}
              />
            </label>
          </div>
        </Card>
      </div>

      {modal === 'checkin' && (
        <CheckInModal
          onClose={() => setModal(null)}
          onDone={(res) => {
            setModal(null);
            setMsg(res?.message || 'Check-in recorded successfully');
            load();
          }}
        />
      )}

      {modal === 'reward' && (
        <RewardModal
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            setMsg('Reward request submitted for owner approval (40 USD / 2200 EGP)');
            load();
          }}
        />
      )}
    </div>
  );
}
