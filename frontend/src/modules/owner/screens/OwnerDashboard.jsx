import React, { useEffect, useState } from 'react';
import { api } from '../../../shared/api/index.js';
import { Card, Button, StatusBadge, StatCard } from '../../../shared/ui/index.js';

export function OwnerDashboard() {
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Point Adjustment state
  const [adj, setAdj] = useState({ user_id: '', color: 'green', delta: 1, reason: '' });

  // System Configuration (Penalties & Arrival time windows)
  const [settings, setSettings] = useState({
    red_penalty_egp: 250,
    black_penalty_egp: 1000,
    early_window_start: '07:00',
    early_window_end: '08:00',
    normal_window_end: '10:00',
    late_window_end: '12:00',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // User Management state
  const [newUser, setNewUser] = useState({ name: '', username: '', role: 'employee' });
  const [addingUser, setAddingUser] = useState(false);

  const load = () => {
    setLoading(true);
    return Promise.all([
      api.ownerUsers(),
      api.getSettings ? api.getSettings().catch(() => null) : Promise.resolve(null),
    ])
      .then(([r, s]) => {
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
        if (s) {
          setSettings(s);
        } else if (r && r.settings) {
          setSettings(r.settings);
        }
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

  // 1. Submit Point Adjustment
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

  // 2. Submit Settings (Penalties & Arrival Windows)
  async function submitSettings(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setSavingSettings(true);
    try {
      if (api.updateSettings) {
        await api.updateSettings(settings);
      }
      setMsg('System rules updated: new arrival times & penalty values are now in effect.');
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSavingSettings(false);
    }
  }

  // 3. Add User
  async function submitAddUser(e) {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.username.trim()) {
      setErr('Photographer name and username are required');
      return;
    }
    setErr('');
    setMsg('');
    setAddingUser(true);
    try {
      if (api.addUser) {
        await api.addUser(newUser);
      }
      setMsg(`Photographer "${newUser.name}" added successfully.`);
      setNewUser({ name: '', username: '', role: 'employee' });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setAddingUser(false);
    }
  }

  // 4. Remove User
  async function removeUser(user) {
    setErr('');
    setMsg('');
    try {
      if (api.removeUser) {
        await api.removeUser(user.id);
      }
      setMsg(`User "${user.name || user.username}" removed from the system.`);
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

  const redVal = Number(settings.red_penalty_egp) || 250;
  const blackVal = Number(settings.black_penalty_egp) || 1000;

  return (
    <div>
      <div className="row-head">
        <div>
          <h2>Owner Administration Panel</h2>
          <p className="muted subtitle">
            Configure resort arrival times, adjust penalty values, manage photographer accounts, and process approvals.
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
          sub="Registered system accounts"
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

      {/* System Policy & Penalty Configuration */}
      <Card className="mb">
        <h3>System Attendance Policy & Penalty Configuration</h3>
        <p className="muted text-sm mb-sm">
          Adjust the financial penalty rates and daily shift arrival windows for Sharm photographers (Africa/Cairo time).
        </p>

        <form onSubmit={submitSettings} className="form" noValidate>
          <div className="two">
            <div>
              <label htmlFor="cfg-red-penalty" className="field-label">
                Red Penalty Value (EGP)
              </label>
              <input
                id="cfg-red-penalty"
                type="number"
                min="0"
                required
                value={settings.red_penalty_egp}
                onChange={(e) =>
                  setSettings({ ...settings, red_penalty_egp: e.target.value })
                }
                title="Deduction amount per late check-in"
              />
            </div>

            <div>
              <label htmlFor="cfg-black-penalty" className="field-label">
                Black Penalty Value (EGP)
              </label>
              <input
                id="cfg-black-penalty"
                type="number"
                min="0"
                required
                value={settings.black_penalty_egp}
                onChange={(e) =>
                  setSettings({ ...settings, black_penalty_egp: e.target.value })
                }
                title="Deduction amount per severe delay or full-day absence"
              />
            </div>
          </div>

          <div className="two">
            <div>
              <label htmlFor="cfg-early-start" className="field-label">
                Early Arrival Bonus Start (Africa/Cairo)
              </label>
              <input
                id="cfg-early-start"
                type="time"
                required
                value={settings.early_window_start}
                onChange={(e) =>
                  setSettings({ ...settings, early_window_start: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="cfg-early-end" className="field-label">
                Early Arrival Bonus End / On-Time Start
              </label>
              <input
                id="cfg-early-end"
                type="time"
                required
                value={settings.early_window_end}
                onChange={(e) =>
                  setSettings({ ...settings, early_window_end: e.target.value })
                }
              />
            </div>
          </div>

          <div className="two">
            <div>
              <label htmlFor="cfg-normal-end" className="field-label">
                On-Time Deadline / Late Red Penalty Start
              </label>
              <input
                id="cfg-normal-end"
                type="time"
                required
                value={settings.normal_window_end}
                onChange={(e) =>
                  setSettings({ ...settings, normal_window_end: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="cfg-late-end" className="field-label">
                Severe Absence Cutoff / Black Penalty Start
              </label>
              <input
                id="cfg-late-end"
                type="time"
                required
                value={settings.late_window_end}
                onChange={(e) =>
                  setSettings({ ...settings, late_window_end: e.target.value })
                }
              />
            </div>
          </div>

          <Button disabled={savingSettings}>
            {savingSettings ? 'Saving Policy…' : 'Save Attendance Rules & Penalties'}
          </Button>
        </form>
      </Card>

      {/* User Management Section */}
      <Card className="mb">
        <h3>User Management: Add Photographer / Admin</h3>
        <p className="muted text-sm mb-sm">
          Create new photographer or management accounts with portal access.
        </p>

        <form onSubmit={submitAddUser} className="form inline">
          <input
            required
            aria-label="New user full name"
            placeholder="Full Name (e.g. Kareem Tarek)"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          />

          <input
            required
            aria-label="New user username"
            placeholder="Username (e.g. kareem)"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />

          <select
            aria-label="New user role"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="employee">Photographer (Employee)</option>
            <option value="owner">System Owner (Admin)</option>
          </select>

          <Button disabled={addingUser}>
            {addingUser ? 'Adding…' : 'Add User Account'}
          </Button>
        </form>
      </Card>

      {/* Employee List Table with Remove Action */}
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
                <th>Role</th>
                <th>Green Points</th>
                <th>Red ({redVal} EGP)</th>
                <th>Black ({blackVal} EGP)</th>
                <th>Current Deductions</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const redDeduction = (u.red || 0) * redVal;
                const blackDeduction = (u.black || 0) * blackVal;
                const totalDeductions = redDeduction + blackDeduction;
                return (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><strong>{u.name || u.username}</strong></td>
                    <td className="capitalize">{u.role || 'employee'}</td>
                    <td className="green-text font-semibold">{u.green || 0}</td>
                    <td className="red-text font-semibold">{u.red || 0}</td>
                    <td className="black-text font-semibold">{u.black || 0}</td>
                    <td>
                      <span className={totalDeductions > 0 ? 'red-text font-semibold' : 'muted'}>
                        {totalDeductions} EGP
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Remove user ${u.name || u.username}`}
                        onClick={() => removeUser(u)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!users.length && (
                <tr>
                  <td colSpan="8" className="muted text-center">
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
            <option value="red">Red (Penalty - {redVal} EGP)</option>
            <option value="black">Black (Penalty - {blackVal} EGP)</option>
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
                          type="button"
                          onClick={runAction(
                            () => api.approveLeave(l.id),
                            'Leave request approved: absence penalty waived'
                          )}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
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
                        type="button"
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
