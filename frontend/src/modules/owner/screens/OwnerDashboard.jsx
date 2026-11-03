import React, { useEffect, useState } from 'react';
import { api } from '../../../shared/api/index.js';
import { Card, Button, StatusBadge, StatCard } from '../../../shared/ui/index.js';

export function OwnerDashboard() {
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [adj, setAdj] = useState({ user_id: '', color: 'green', delta: 1, reason: '' });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return api
      .ownerUsers()
      .then((r) => {
        const list = Array.isArray(r) ? r : r.users || [];
        setUsers(list);
        setLeaves(
          Array.isArray(r)
            ? list.flatMap((u) => u.leave_requests || [])
            : r.leave_requests || r.leaves || []
        );
        setRewards(
          Array.isArray(r)
            ? list.flatMap((u) => u.reward_requests || [])
            : r.reward_requests || r.rewards || []
        );
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = (fn, successMsg) => async () => {
    setErr('');
    setMsg('');
    try {
      await fn();
      await load();
      if (successMsg) setMsg(successMsg);
    } catch (e) {
      setErr(e.message);
    }
  };

  async function submitAdjust(e) {
    e.preventDefault();
    if (!adj.user_id) {
      setErr('Please select an employee to adjust');
      return;
    }
    setErr('');
    setMsg('');
    try {
      await api.ownerAdjust({
        ...adj,
        user_id: Number(adj.user_id) || adj.user_id,
        delta: Number(adj.delta),
      });
      setMsg(
        `Successfully updated ${adj.color} points by ${Number(adj.delta) > 0 ? '+' : ''}${adj.delta} for selected employee`
      );
      setAdj({ user_id: '', color: 'green', delta: 1, reason: '' });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  const pendingLeaves = leaves.filter(
    (l) => String(l.status || '').toLowerCase() === 'pending'
  );
  const pendingRewards = rewards.filter(
    (r) => String(r.status || '').toLowerCase() === 'pending'
  );

  return (
    <div>
      <div className="row-head">
        <div>
          <h2>Owner Administration Panel</h2>
          <p className="muted subtitle">
            Manage Sharm photographers attendance, approve rewards, process leaves and adjust points.
          </p>
        </div>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p className="ok" role="status">{msg}</p>}

      {/* Top Stat Overview */}
      <div className="grid3 mb">
        <StatCard
          variant="green"
          title="Total Photographers"
          value={users.length}
          sub="Registered system employees"
        />
        <StatCard
          variant="red"
          title="Pending Leaves"
          value={pendingLeaves.length}
          sub="Require approval to waive absence penalties"
        />
        <StatCard
          variant="black"
          title="Pending Rewards"
          value={pendingRewards.length}
          sub="30-point milestone claims (40 USD / 2200 EGP)"
        />
      </div>

      {/* Employee List Table */}
      <Card>
        <h3>Photographer Attendance & Point Balances</h3>
        {loading ? (
          <p className="muted">Loading photographers…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name / Username</th>
                <th>Green (Rewards)</th>
                <th>Red (250 EGP)</th>
                <th>Black (1000 EGP)</th>
                <th>Current Deductions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const redDeduction = (u.red || 0) * 250;
                const blackDeduction = (u.black || 0) * 1000;
                const totalDeductions = redDeduction + blackDeduction;
                return (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><strong>{u.name || u.username}</strong></td>
                    <td className="green-text font-semibold">{u.green || 0}</td>
                    <td className="red-text font-semibold">{u.red || 0}</td>
                    <td className="black-text font-semibold">{u.black || 0}</td>
                    <td>
                      <span className={totalDeductions > 0 ? 'red-text font-semibold' : 'muted'}>
                        {totalDeductions} EGP
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!users.length && (
                <tr>
                  <td colSpan="6" className="muted text-center">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Point Adjustment Form */}
      <Card className="mt">
        <h3>Administrative Point Adjustment</h3>
        <p className="muted text-sm mb-sm">
          Manually award green bonus points or add/remove penalty points with an audit reason.
        </p>
        <form onSubmit={submitAdjust} className="form inline">
          <select
            required
            aria-label="Select employee"
            value={adj.user_id}
            onChange={(e) => setAdj({ ...adj, user_id: e.target.value })}
          >
            <option value="">Select Employee…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                #{u.id} {u.name || u.username}
              </option>
            ))}
          </select>

          <select
            aria-label="Select point color"
            value={adj.color}
            onChange={(e) => setAdj({ ...adj, color: e.target.value })}
          >
            <option value="green">Green (Early/Reward)</option>
            <option value="red">Red (Penalty - 250 EGP)</option>
            <option value="black">Black (Penalty - 1,000 EGP)</option>
          </select>

          <input
            type="number"
            aria-label="Adjustment delta"
            value={adj.delta}
            onChange={(e) => setAdj({ ...adj, delta: e.target.value })}
            placeholder="Delta (+1, -1)"
            title="Positive adds points, negative removes points"
          />

          <input
            required
            aria-label="Reason for adjustment"
            placeholder="Audit reason (e.g. Overtime, Excused delay)"
            value={adj.reason}
            onChange={(e) => setAdj({ ...adj, reason: e.target.value })}
          />

          <Button>Apply Point Adjustment</Button>
        </form>
      </Card>

      {/* Leave Requests Table */}
      <Card className="mt">
        <h3>Leave Requests & Absence Waiver</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date Range</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => {
              const isPending = String(l.status || '').toLowerCase() === 'pending';
              return (
                <tr key={l.id}>
                  <td><strong>{l.user_name || `User #${l.user_id}`}</strong></td>
                  <td>{l.start_date} → {l.end_date}</td>
                  <td>{l.reason}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>
                    {isPending ? (
                      <div className="btn-row">
                        <Button
                          onClick={runAction(
                            () => api.approveLeave(l.id),
                            'Leave request approved: absence penalty waived'
                          )}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={runAction(
                            () => api.rejectLeave(l.id),
                            'Leave request rejected'
                          )}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="muted text-sm">Processed</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!leaves.length && (
              <tr>
                <td colSpan="5" className="muted text-center">
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Reward Requests Table */}
      <Card className="mt">
        <h3>30-Point Milestone Reward Claims (40 USD / 2,200 EGP)</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Payout Method</th>
              <th>Account / Phone Number</th>
              <th>Valuation</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => {
              const isPending = String(r.status || '').toLowerCase() === 'pending';
              return (
                <tr key={r.id}>
                  <td><strong>{r.user_name || `User #${r.user_id}`}</strong></td>
                  <td className="capitalize">{String(r.payout_method).replace('_', ' ')}</td>
                  <td><code>{r.number}</code></td>
                  <td>40 USD / 2,200 EGP</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {isPending ? (
                      <Button
                        onClick={runAction(
                          () => api.approveReward(r.id),
                          'Reward claim approved for payment disbursement'
                        )}
                      >
                        Approve Payout
                      </Button>
                    ) : (
                      <span className="muted text-sm">Processed</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rewards.length && (
              <tr>
                <td colSpan="6" className="muted text-center">
                  No reward requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default OwnerDashboard;
