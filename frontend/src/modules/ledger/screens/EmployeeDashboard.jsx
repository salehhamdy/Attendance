import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../shared/api/index.js';
import { useAuth } from '../../auth/index.js';
import { Card, Button, ToggleSwitch, StatCard } from '../../../shared/ui/index.js';
import { CheckInModal } from '../../attendance/index.js';
import { RewardModal } from '../../rewards/index.js';

export function EmployeeDashboard() {
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

  if (!s)
    return (
      <p className={err ? 'error' : 'muted'} role={err ? 'alert' : undefined}>
        {err || 'Loading…'}
      </p>
    );

  const GOAL = Number(s.reward_threshold) || 30;
  const progress = Number.isFinite(s.progress) ? s.progress : s.green;
  const pct = Math.min(100, (progress / GOAL) * 100);

  const currency = s.currency || 'EGP';
  const redPenaltyVal = Number(s.red_penalty_egp) || 250;
  const blackPenaltyVal = Number(s.black_penalty_egp) || 1000;
  const d = s.deductions_egp ?? s.red * redPenaltyVal + s.black * blackPenaltyVal;

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const companyName = s.company_name || 'Universal Attendance System';

  return (
    <div>
      <div className="row-head">
        <div>
          <h2>Welcome, {user?.name || 'Staff Member'}</h2>
          <p className="muted subtitle">{companyName} · {todayFormatted}</p>
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
          sub={`Red: ${s.red} x ${redPenaltyVal} ${currency} = ${s.red * redPenaltyVal} ${currency}`}
        />
        <StatCard
          variant="black"
          title="Black Penalties"
          value={s.black}
          sub={`Black: ${s.black} x ${blackPenaltyVal} ${currency} = ${s.black * blackPenaltyVal} ${currency}`}
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
            <span className="muted">Threshold: {s.reward_amount || '40 USD / 2,200 EGP'}</span>
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
          <div className="big red-text">{d} {currency}</div>
          <p className="muted mb-sm">
            {d === 0
              ? 'Zero deductions! Attendance in good standing.'
              : `Active deductions: ${s.red} Red (${s.red * redPenaltyVal} ${currency}) + ${s.black} Black (${s.black * blackPenaltyVal} ${currency})`}
          </p>

          <div className="toggles">
            <label className="toggle-item">
              <span>
                Use 1 Green Point to remove 1 Red Penalty
                <small className="block muted">Saves {redPenaltyVal} ${currency} deduction</small>
              </span>
              <ToggleSwitch
                label="cancel red penalty"
                checked={false}
                disabled={s.green < 1 || s.red < 1}
                onChange={() => act(api.cancelRed, `1 Red Penalty cancelled (-${redPenaltyVal} ${currency} deduction)`)}
              />
            </label>

            <label className="toggle-item">
              <span>
                Use 5 Green Points to remove 1 Black Penalty
                <small className="block muted">Saves {blackPenaltyVal} ${currency} deduction</small>
              </span>
              <ToggleSwitch
                label="cancel black penalty"
                checked={false}
                disabled={s.green < 5 || s.black < 1}
                onChange={() => act(api.cancelBlack, `1 Black Penalty cancelled (-${blackPenaltyVal} ${currency} deduction)`)}
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
            setMsg(`Reward request submitted for owner approval (${s.reward_amount || 'Milestone Reward'})`);
            load();
          }}
        />
      )}
    </div>
  );
}

export default EmployeeDashboard;
